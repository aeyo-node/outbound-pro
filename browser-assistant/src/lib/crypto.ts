/**
 * At-rest encryption for stored credentials using the Web Crypto API (AES-GCM).
 *
 * Threat model & honest limitation:
 * A Chrome extension cannot hold a secret that the operator themselves cannot
 * also reach — the wrapping key lives in chrome.storage.local alongside the
 * ciphertext. This protects against casual inspection of the storage area and
 * synced-store leakage, NOT against a malicious local user with extension
 * debug access. For higher assurance, set a master passphrase (see
 * `setMasterPassphrase`) which derives the key via PBKDF2 from a value that is
 * never persisted.
 */

const KEY_STORAGE = 'swaram.crypto.key.v1';
const PASSPHRASE_SALT = 'swaram.crypto.passphrase.salt.v1';
const PBKDF2_ITERATIONS = 250_000;

let cachedKey: CryptoKey | null = null;
let cachedPassphrase: string | null = null;

/** Cast a Uint8Array to BufferSource for Web Crypto (TS lib strictness). */
function bs(u: Uint8Array): BufferSource {
  return u as unknown as BufferSource;
}

function b64encode(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let s = '';
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]!);
  return btoa(s);
}
function b64decode(str: string): Uint8Array {
  const s = atob(str);
  const bytes = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) bytes[i] = s.charCodeAt(i);
  return bytes;
}

async function generateAndStoreKey(): Promise<CryptoKey> {
  const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, [
    'encrypt',
    'decrypt',
  ]);
  const raw = await crypto.subtle.exportKey('raw', key);
  await chrome.storage.local.set({ [KEY_STORAGE]: b64encode(raw) });
  return key;
}

async function loadStoredKey(): Promise<CryptoKey | null> {
  const rec = await chrome.storage.local.get(KEY_STORAGE);
  const raw = rec[KEY_STORAGE];
  if (!raw) return null;
  return crypto.subtle.importKey('raw', bs(b64decode(raw)), { name: 'AES-GCM' }, true, [
    'encrypt',
    'decrypt',
  ]);
}

async function derivePassphraseKey(passphrase: string, saltB64?: string): Promise<{ key: CryptoKey; salt: string }> {
  const salt = saltB64 ? b64decode(saltB64) : crypto.getRandomValues(new Uint8Array(16));
  const baseKey = await crypto.subtle.importKey(
    'raw',
    bs(new TextEncoder().encode(passphrase)),
    'PBKDF2',
    false,
    ['deriveKey'],
  );
  const key = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: bs(salt), iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
  return { key, salt: b64encode(salt.buffer as ArrayBuffer) };
}

/** Get the active encryption key (passphrase-derived if set, else stored). */
async function getKey(): Promise<CryptoKey> {
  if (cachedKey) return cachedKey;
  if (cachedPassphrase) {
    const rec = await chrome.storage.local.get(PASSPHRASE_SALT);
    const { key } = await derivePassphraseKey(cachedPassphrase, rec[PASSPHRASE_SALT]);
    cachedKey = key;
    return key;
  }
  let key = await loadStoredKey();
  if (!key) key = await generateAndStoreKey();
  cachedKey = key;
  return key;
}

/** Encrypt a UTF-8 string. Returns { cipher, iv }. */
export async function encryptString(plaintext: string): Promise<{ cipher: string; iv: string }> {
  const key = await getKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: bs(iv) },
    key,
    bs(new TextEncoder().encode(plaintext)),
  );
  return { cipher: b64encode(ct), iv: b64encode(iv.buffer as ArrayBuffer) };
}

/** Decrypt a { cipher, iv } pair back to a UTF-8 string. */
export async function decryptString(cipher: string, iv: string): Promise<string> {
  const key = await getKey();
  const pt = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: bs(b64decode(iv)) },
    key,
    bs(b64decode(cipher)),
  );
  return new TextDecoder().decode(pt);
}

/** Activate passphrase-derived keys. Persists the (random) salt only. */
export async function setMasterPassphrase(passphrase: string): Promise<void> {
  cachedPassphrase = passphrase;
  cachedKey = null;
  const { salt } = await derivePassphraseKey(passphrase);
  await chrome.storage.local.set({ [PASSPHRASE_SALT]: salt });
}

export function clearMasterPassphrase(): void {
  cachedPassphrase = null;
  cachedKey = null;
}

/** Generate a short random id (correlation / token use). */
export function randomId(len = 12): string {
  const bytes = crypto.getRandomValues(new Uint8Array(len));
  let s = '';
  for (let i = 0; i < bytes.length; i++) s += bytes[i]!.toString(16).padStart(2, '0');
  return s;
}
