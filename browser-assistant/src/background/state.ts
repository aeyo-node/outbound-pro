import type { ExtensionState } from '@/types/protocol';
import { recordAction, getHistory } from './action-history';
import { log } from '@/lib/logger';
import { loadConfigMeta } from '@/lib/storage';

/**
 * Central runtime state for the extension, kept in the service worker memory
 * and mirrored to chrome.storage.local so the popup and future SW incarnations
 * can read it. Updated via `setState`.
 */

const state: ExtensionState = {
  loggedIn: false,
  connected: false,
  currentUrl: '',
  currentPage: '',
  lastAction: null,
  lastError: null,
  dashboardUrl: '',
  wsState: 'closed',
  history: [],
  ts: 0,
};

type Listener = (s: ExtensionState) => void;
const listeners = new Set<Listener>();

export function getState(): ExtensionState {
  return { ...state, history: getHistory().slice(-15) };
}

export async function patchState(patch: Partial<ExtensionState>): Promise<void> {
  Object.assign(state, patch, { ts: Date.now() });
  // Persist a small slice (omit history/screenshot bulk).
  const persist: Partial<ExtensionState> = {
    loggedIn: state.loggedIn,
    connected: state.connected,
    currentUrl: state.currentUrl,
    currentPage: state.currentPage,
    lastAction: state.lastAction,
    lastError: state.lastError,
    dashboardUrl: state.dashboardUrl,
    wsState: state.wsState,
    ts: state.ts,
  };
  chrome.storage.local.set({ 'swaram.state': persist }).catch(() => {});
  // Notify popup listeners live.
  for (const l of listeners) {
    try {
      l(getState());
    } catch (e) {
      log.debug(`state listener error: ${(e as Error).message}`);
    }
  }
}

export function subscribe(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export async function refreshDashboardUrl(): Promise<void> {
  const meta = await loadConfigMeta();
  if (meta.dashboardUrl) state.dashboardUrl = meta.dashboardUrl;
}

export { recordAction };
