import type { RuntimeMessage } from '@/types/protocol';

/**
 * Typed wrappers around chrome.runtime / chrome.tabs messaging.
 *
 * Two patterns:
 *  - request/response: sendRuntimeMessage returns a promise of the reply
 *  - fire-and-forget: sendTabMessage broadcasts to a content script
 */

export function sendRuntimeMessage<T = unknown, R = unknown>(
  message: RuntimeMessage<T>,
): Promise<R> {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, (response) => {
      const err = chrome.runtime.lastError;
      if (err) reject(new Error(err.message));
      else resolve(response as R);
    });
  });
}

/** The built content-script file name (hashed) from the manifest, for on-demand injection. */
function getContentScriptFile(): string | null {
  const cs = chrome.runtime.getManifest().content_scripts?.[0];
  return cs?.js?.[0] ?? null;
}

export function sendTabMessage<T = unknown, R = unknown>(
  tabId: number,
  message: RuntimeMessage<T>,
): Promise<R> {
  return new Promise((resolve, reject) => {
    chrome.tabs.sendMessage(tabId, message, (response) => {
      const err = chrome.runtime.lastError;
      if (err) {
        // Content script may not be injected yet (e.g. tab loaded before
        // install). Inject on demand from the manifest's file and retry once.
        const file = getContentScriptFile();
        if (!file) {
          reject(new Error('No content script registered in manifest'));
          return;
        }
        chrome.scripting
          .executeScript({ target: { tabId }, files: [file] })
          .then(() => {
            chrome.tabs.sendMessage(tabId, message, (r2) => {
              const e2 = chrome.runtime.lastError;
              if (e2) reject(new Error(e2.message));
              else resolve(r2 as R);
            });
          })
          .catch(reject);
        return;
      }
      resolve(response as R);
    });
  });
}

/** Type guard helper for runtime message discrimination. */
export function isRuntimeMessage<T extends RuntimeMessage['type']>(
  msg: unknown,
  type: T,
): msg is RuntimeMessage & { type: T } {
  return typeof msg === 'object' && msg !== null && (msg as RuntimeMessage).type === type;
}
