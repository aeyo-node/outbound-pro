import type { ActionHistoryEntry } from '@/types/protocol';

const MAX = 100;

/**
 * In-memory action history ring buffer. Persisted lightly to chrome.storage so
 * the debug panel survives service-worker restarts.
 */
const history: ActionHistoryEntry[] = [];

export function recordAction(entry: ActionHistoryEntry): void {
  history.push(entry);
  if (history.length > MAX) history.splice(0, history.length - MAX);
  // Persist asynchronously (best-effort).
  chrome.storage.local.set({ 'swaram.history': history.slice(-20) }).catch(() => {});
}

export function getHistory(): ActionHistoryEntry[] {
  return [...history];
}

export function clearHistory(): void {
  history.length = 0;
  chrome.storage.local.remove('swaram.history').catch(() => {});
}

export function lastAction(): string | null {
  const last = history[history.length - 1];
  return last ? `${last.tool} (${last.success ? 'ok' : 'fail'})` : null;
}
