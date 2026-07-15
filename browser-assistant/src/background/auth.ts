import type { Dispatcher } from './dispatcher';
import { log } from '@/lib/logger';
import { patchState } from './state';
import { isConfigured, loadCredentials } from '@/lib/storage';

const KEEPALIVE_ALARM = 'swaram-session-keepalive';
const CHECK_INTERVAL_MIN = 1; // every 1 minute

/**
 * Session / auth manager.
 *
 * - performLogin: drive the dashboard login flow via tools
 * - performLogout
 * - keepAlive: periodic check that the dashboard session is still valid; if the
 *   page redirected back to /login, re-login automatically.
 */
export class AuthManager {
  private dispatcher: Dispatcher;
  private loggingIn = false;

  constructor(dispatcher: Dispatcher) {
    this.dispatcher = dispatcher;
  }

  async performLogin(): Promise<{ loggedIn: boolean; reason?: string }> {
    if (this.loggingIn) return { loggedIn: false, reason: 'login already in progress' };
    this.loggingIn = true;
    try {
      const ready = await isConfigured();
      if (!ready) {
        await patchState({ loggedIn: false, lastError: 'Not configured' });
        return { loggedIn: false, reason: 'Not configured' };
      }
      log.info('auth: starting login flow');
      // Prefer the Swaram-aware login helper if registered, else generic login.
      const tool = 'swaram.login';
      const res = await this.dispatcher.executeLocal(tool, {});
      const loggedIn = res.success && (res.data as { loggedIn?: boolean })?.loggedIn !== false;
      await patchState({ loggedIn, lastError: loggedIn ? null : res.reason ?? 'login failed' });
      log.info(`auth: login result loggedIn=${loggedIn}`);
      return { loggedIn, reason: loggedIn ? undefined : res.reason };
    } catch (e) {
      const reason = (e as Error).message;
      log.error(`auth: login threw: ${reason}`);
      await patchState({ loggedIn: false, lastError: reason });
      return { loggedIn: false, reason };
    } finally {
      this.loggingIn = false;
    }
  }

  async performLogout(): Promise<{ loggedOut: boolean }> {
    log.info('auth: logout');
    const res = await this.dispatcher.executeLocal('logout', {});
    await patchState({ loggedIn: false, lastError: null });
    return { loggedOut: res.success };
  }

  /** Verify the current session by inspecting the active tab URL. */
  async verifySession(): Promise<boolean> {
    const urlRes = await this.dispatcher.executeLocal('currentUrl', {});
    const url = (urlRes.data as { url?: string } | undefined)?.url ?? '';
    const creds = await loadCredentials();
    const onDashboard = creds?.dashboardUrl ? url.startsWith(creds.dashboardUrl) : Boolean(url);
    const onLogin = /\/login/i.test(url);
    return onDashboard && !onLogin;
  }

  installKeepAlive(): void {
    chrome.alarms.create(KEEPALIVE_ALARM, { periodInMinutes: CHECK_INTERVAL_MIN });
    chrome.alarms.onAlarm.addListener(async (a) => {
      if (a.name !== KEEPALIVE_ALARM) return;
      try {
        const ok = await this.verifySession();
        await patchState({ loggedIn: ok });
        if (!ok) {
          log.warn('auth: session expired — re-logging in');
          await this.performLogin();
        }
      } catch (e) {
        log.debug(`keepalive error: ${(e as Error).message}`);
      }
    });
    log.info('auth: keep-alive installed');
  }
}
