import type { PlainCredentials, StoredConfig } from '@/types/protocol';
import { decryptString, encryptString } from './crypto';

const CONFIG_KEY = 'swaram.config.v1';
const STATE_KEY = 'swaram.state.v1';

const DEFAULTS: Omit<StoredConfig, 'password' | 'iv' | 'salt'> = {
  dashboardUrl: '',
  email: '',
  wsUrl: '',
  backendToken: '',
  tenantId: '',
  autoReconnect: true,
  keepAlive: true,
};

/** Save credentials, encrypting the password at rest. */
export async function saveCredentials(creds: PlainCredentials): Promise<StoredConfig> {
  const { cipher, iv } = await encryptString(creds.password);
  const config: StoredConfig = {
    ...DEFAULTS,
    dashboardUrl: creds.dashboardUrl,
    email: creds.email,
    password: cipher,
    iv,
    salt: '', // populated when a passphrase key is used; empty otherwise
    wsUrl: creds.wsUrl,
    backendToken: creds.backendToken,
    tenantId: creds.tenantId,
  };
  await chrome.storage.local.set({ [CONFIG_KEY]: config });
  return config;
}

/** Load and decrypt credentials. Returns null if not configured. */
export async function loadCredentials(): Promise<PlainCredentials | null> {
  const rec = await chrome.storage.local.get(CONFIG_KEY);
  const config = rec[CONFIG_KEY] as StoredConfig | undefined;
  if (!config || !config.email) return null;
  let password = '';
  try {
    password = await decryptString(config.password, config.iv);
  } catch {
    password = '';
  }
  return {
    dashboardUrl: config.dashboardUrl,
    email: config.email,
    password,
    wsUrl: config.wsUrl,
    backendToken: config.backendToken,
    tenantId: config.tenantId ?? '',
  };
}

/** Return the stored config WITHOUT decrypting the password (for the debug UI). */
export async function loadConfigMeta(): Promise<Partial<StoredConfig>> {
  const rec = await chrome.storage.local.get(CONFIG_KEY);
  const config = rec[CONFIG_KEY] as StoredConfig | undefined;
  if (!config) return {};
  const { password: _p, iv: _i, salt: _s, ...meta } = config;
  void _p;
  void _i;
  void _s;
  return meta;
}

export async function clearCredentials(): Promise<void> {
  await chrome.storage.local.remove(CONFIG_KEY);
}

export async function isConfigured(): Promise<boolean> {
  const c = await loadConfigMeta();
  return Boolean(c.email && c.dashboardUrl);
}

/** Persist a small piece of runtime state (last error, etc.) across SW restarts. */
export async function saveRuntimeState(state: Record<string, unknown>): Promise<void> {
  await chrome.storage.local.set({ [STATE_KEY]: { ...state, ts: Date.now() } });
}

export async function loadRuntimeState<T = Record<string, unknown>>(): Promise<T | null> {
  const rec = await chrome.storage.local.get(STATE_KEY);
  return (rec[STATE_KEY] as T) ?? null;
}
