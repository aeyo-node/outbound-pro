/// <reference types="vite/client" />
import { registerAllTools } from '@/tools';
import { registerSwaramTools, captureMonitor } from '@/swaram';
import { WsClient } from './ws-client';
import { Dispatcher } from './dispatcher';
import { AuthManager } from './auth';
import { getState, patchState, refreshDashboardUrl } from './state';
import { log, setLoggerSink } from '@/lib/logger';
import { isRuntimeMessage, sendRuntimeMessage } from '@/lib/messaging';
import type { ClientMessage, ResponseMessage, RuntimeMessage } from '@/types/protocol';
import { loadConfigMeta } from '@/lib/storage';

/**
 * Background service worker entry (Manifest V3).
 *
 * Wires together: tool registry, WebSocket client, command dispatcher, session
 * manager, and the popup/content runtime-message bridge.
 */

const downloads = new Map<string, { state: string; filename?: string; url: string }>();
registerAllTools(downloads);
registerSwaramTools();

const dispatcher = new Dispatcher({
  wsSend: (msg: ResponseMessage) => wsClient.send(msg),
  downloads,
});

const wsClient = new WsClient(async (cmd) => {
  await dispatcher.handle(cmd);
});

const auth = new AuthManager(dispatcher);

// Relay log lines to the backend (best-effort) once the WS is open.
setLoggerSink((entry) => {
  const msg: ClientMessage = entry;
  wsClient.send(msg);
});

// ----- runtime message bridge (popup <-> background) -----
chrome.runtime.onMessage.addListener((message: unknown, _sender, sendResponse) => {
  if (!message || typeof message !== 'object') return false;
  const msg = message as RuntimeMessage;
  handlePopupMessage(msg)
    .then((resp) => sendResponse(resp))
    .catch((e) => sendResponse({ error: (e as Error).message }));
  return true;
});

async function handlePopupMessage(msg: RuntimeMessage): Promise<unknown> {
  switch (msg.type) {
    case 'getState':
      return getState();
    case 'login': {
      const r = await auth.performLogin();
      return r;
    }
    case 'logout':
      return auth.performLogout();
    case 'reconnect':
      await wsClient.reconnect();
      return { reconnecting: true };
    case 'screenshot':
      return dispatcher.executeLocal('takeScreenshot', {});
    case 'notify': {
      const payload = (msg.payload ?? {}) as { event?: string; url?: string };
      if (payload.event === 'content_ready') {
        await patchState({ currentUrl: payload.url ?? '' });
      }
      return { ok: true };
    }
    default:
      return { error: `unknown message type ${(msg as { type: string }).type}` };
  }
}

// ----- track active tab URL / page for the debug panel -----
chrome.tabs.onUpdated.addListener(async (_tabId, change, tab) => {
  if (change.url || change.status === 'complete') {
    if (tab.active && tab.windowId === (await getActiveWindowId())) {
      await patchState({
        currentUrl: tab.url ?? '',
        currentPage: derivePageName(tab.url ?? ''),
      });
    }
  }
});
chrome.tabs.onActivated.addListener(async (info) => {
  const tab = await chrome.tabs.get(info.tabId);
  await patchState({
    currentUrl: tab.url ?? '',
    currentPage: derivePageName(tab.url ?? ''),
  });
});

async function getActiveWindowId(): Promise<number> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab?.windowId ?? chrome.windows.WINDOW_ID_CURRENT;
}

function derivePageName(url: string): string {
  try {
    const u = new URL(url);
    const tab = u.searchParams.get('tab');
    const seg = u.pathname.split('/').filter(Boolean).pop() ?? '/';
    return tab ? `${seg}?tab=${tab}` : seg;
  } catch {
    return url;
  }
}

// ----- monitor: periodic dashboard status snapshot pushed to backend -----
const MONITOR_ALARM = 'swaram-monitor';
chrome.alarms.create(MONITOR_ALARM, { periodInMinutes: 0.5 });
chrome.alarms.onAlarm.addListener(async (a) => {
  if (a.name !== MONITOR_ALARM) return;
  try {
    const snapshot = await captureMonitor(dispatcher);
    wsClient.send({
      type: 'monitor',
      campaigns: snapshot.campaigns,
      calls: snapshot.calls,
      errors: snapshot.errors,
      ts: Date.now(),
    });
  } catch (e) {
    log.debug(`monitor error: ${(e as Error).message}`);
  }
});

// ----- boot -----
async function boot(): Promise<void> {
  await refreshDashboardUrl();
  const meta = await loadConfigMeta();
  await patchState({
    dashboardUrl: meta.dashboardUrl ?? '',
    currentUrl: '',
  });
  log.info(`Swaram Browser Assistant v${chrome.runtime.getManifest().version} booting`);
  await wsClient.start();
  auth.installKeepAlive();
  // If credentials exist, attempt an initial login in the background.
  if (meta.dashboardUrl) {
    auth.performLogin().catch((e) => log.warn(`initial login failed: ${(e as Error).message}`));
  }
}

// Export for type-checking of message helpers used elsewhere.
export { sendRuntimeMessage, isRuntimeMessage };

void boot();
