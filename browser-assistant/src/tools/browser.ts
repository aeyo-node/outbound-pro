import type { ToolDef } from './types';
import { ok, fail, measure } from '@/lib/result';
import { log } from '@/lib/logger';
import { loadCredentials } from '@/lib/storage';

/**
 * Browser-level tools that run in the background (service worker) context.
 * They own chrome.* APIs: tabs, cookies, captureVisibleTab. DOM reads
 * (getTitle/getHTML) live in the content tools but are also exposed here via
 * scripting injection for convenience.
 */

async function getActiveTab(): Promise<chrome.tabs.Tab> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) throw new Error('No active tab found');
  return tab;
}

export const browserTools: ToolDef[] = [
  {
    name: 'openPage',
    description: 'Navigate the active tab (or a new tab) to a URL. Only same-origin to configured dashboard unless allowExternal=true.',
    context: 'background',
    args: { url: { type: 'string', required: true }, newTab: { type: 'boolean' } },
    handler: async (args, ctx) =>
      measure('openPage', ctx.id, async () => {
        const url = args.url as string;
        const newTab = Boolean(args.newTab);
        let tabId: number;
        if (newTab) {
          const tab = await chrome.tabs.create({ url, active: true });
          tabId = tab.id!;
        } else {
          const tab = await getActiveTab();
          await chrome.tabs.update(tab.id!, { url });
          tabId = tab.id!;
        }
        await waitTabComplete(tabId, 15000);
        return ok('openPage', { url, tabId });
      }),
  },
  {
    name: 'refresh',
    description: 'Reload the active tab.',
    context: 'background',
    handler: async (_args, ctx) =>
      measure('refresh', ctx.id, async () => {
        const tab = await getActiveTab();
        await chrome.tabs.reload(tab.id!, { bypassCache: Boolean(_args.bypassCache) });
        await waitTabComplete(tab.id!, 15000);
        return ok('refresh', { url: tab.url });
      }),
  },
  {
    name: 'back',
    description: 'Navigate back in history.',
    context: 'background',
    handler: async (_args, ctx) =>
      measure('back', ctx.id, async () => {
        const tab = await getActiveTab();
        await chrome.tabs.goBack(tab.id!);
        await new Promise((r) => setTimeout(r, 400));
        return ok('back', {});
      }),
  },
  {
    name: 'forward',
    description: 'Navigate forward in history.',
    context: 'background',
    handler: async (_args, ctx) =>
      measure('forward', ctx.id, async () => {
        const tab = await getActiveTab();
        await chrome.tabs.goForward(tab.id!);
        await new Promise((r) => setTimeout(r, 400));
        return ok('forward', {});
      }),
  },
  {
    name: 'currentUrl',
    description: 'Return the active tab URL and title.',
    context: 'background',
    handler: async (_args, ctx) =>
      measure('currentUrl', ctx.id, async () => {
        const tab = await getActiveTab();
        return ok('currentUrl', { url: tab.url, title: tab.title, tabId: tab.id });
      }),
  },
  {
    name: 'getCookies',
    description: 'Return cookies for a URL (defaults to the active tab URL).',
    context: 'background',
    handler: async (args, ctx) =>
      measure('getCookies', ctx.id, async () => {
        const url = (args.url as string) ?? (await getActiveTab()).url ?? '';
        const cookies = await chrome.cookies.getAll({ url });
        // Strip values in the response to avoid leaking secrets over the wire.
        const safe = cookies.map((c) => ({ name: c.name, domain: c.domain, path: c.path, secure: c.secure, httpOnly: c.httpOnly, valuePreview: c.value.slice(0, 4) + '…' }));
        return ok('getCookies', { url, count: cookies.length, cookies: safe });
      }),
  },
  {
    name: 'takeScreenshot',
    description: 'Capture a visible screenshot of the active tab as a base64 data URL.',
    context: 'background',
    handler: async (args, ctx) =>
      measure('takeScreenshot', ctx.id, async () => {
        const tab = await getActiveTab();
        const dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, {
          format: (args.format as 'png' | 'jpeg') ?? 'png',
          quality: (args.quality as number) ?? 80,
        });
        return ok('takeScreenshot', { screenshot: dataUrl, format: args.format ?? 'png', tabId: tab.id });
      }),
  },
  {
    name: 'getTitle',
    description: 'Return the active tab title.',
    context: 'background',
    handler: async (_args, ctx) =>
      measure('getTitle', ctx.id, async () => {
        const tab = await getActiveTab();
        return ok('getTitle', { title: tab.title });
      }),
  },
  {
    name: 'getHTML',
    description: 'Return the outer HTML of an element (or document.body) via injection. Truncated to maxChars.',
    context: 'background',
    args: { selector: { type: 'string' }, maxChars: { type: 'number' } },
    handler: async (args, ctx) =>
      measure('getHTML', ctx.id, async () => {
        const tab = await getActiveTab();
        const selector = (args.selector as string) ?? 'body';
        const maxChars = (args.maxChars as number) ?? 20000;
        const results = await chrome.scripting.executeScript({
          target: { tabId: tab.id! },
          func: (sel: string, max: number) => {
            const el = document.querySelector(sel) as HTMLElement | null;
            const html = el ? el.outerHTML : '';
            return html.slice(0, max);
          },
          args: [selector, maxChars],
        });
        const html = (results[0]?.result as string) ?? '';
        return ok('getHTML', { html, truncated: html.length >= maxChars });
      }),
  },
  {
    name: 'login',
    description:
      'Generic dashboard login. Uses stored credentials unless overridden. Fills the first visible email + password fields and submits. For Swaram, prefer swaram.login which knows the exact form.',
    context: 'background',
    handler: async (args, ctx) =>
      measure('login', ctx.id, async () => {
        const creds = await loadCredentials();
        if (!creds) return fail('login', 'No stored credentials — configure the extension first', { code: 'not_configured' });
        const email = (args.email as string) ?? creds.email;
        const password = (args.password as string) ?? creds.password;
        const loginPath = (args.loginPath as string) ?? '/login';
        const base = new URL(creds.dashboardUrl);
        const loginUrl = new URL(loginPath, base).toString();
        // Navigate to login page.
        await ctx.run('openPage', { url: loginUrl });
        await ctx.run('pageReady', {});
        // Fill email + password using resilient input lookup.
        const emailRes = await ctx.run('type', { label: email, selector: args.emailSelector ?? 'input[type="email"], input[name="email"]', text: email });
        if (!emailRes.success) return fail('login', 'Could not fill email field', { code: 'email_field_failed' });
        const passRes = await ctx.run('type', { label: 'password', selector: 'input[type="password"]', text: password });
        if (!passRes.success) return fail('login', 'Could not fill password field', { code: 'password_field_failed' });
        await ctx.run('click', { text: 'Sign In', role: 'button' }).catch(() => {});
        await ctx.run('submit', {});
        await new Promise((r) => setTimeout(r, 1500));
        const urlRes = await ctx.run('currentUrl', {});
        const url = (urlRes.data as { url?: string })?.url ?? '';
        const loggedIn = !url.includes('/login');
        log.info(`login result: loggedIn=${loggedIn} url=${url}`);
        return ok('login', { loggedIn, url });
      }),
  },
  {
    name: 'logout',
    description: 'Generic logout: click a Logout/Sign out button if present, else clear auth cookies for the dashboard.',
    context: 'background',
    handler: async (_args, ctx) =>
      measure('logout', ctx.id, async () => {
        // Try clicking a logout control.
        const click = await ctx.run('click', { text: 'Logout' }).catch(() => null);
        if (!click?.success) await ctx.run('click', { text: 'Sign out' }).catch(() => null);
        await new Promise((r) => setTimeout(r, 800));
        const creds = await loadCredentials();
        if (creds) {
          const url = new URL(creds.dashboardUrl);
          const cookies = await chrome.cookies.getAll({ url: url.origin });
          for (const c of cookies) {
            await chrome.cookies.remove({
              url: url.origin,
              name: c.name,
              storeId: c.storeId,
            });
          }
        }
        return ok('logout', { loggedOut: true });
      }),
  },
];

/** Wait until a tab finishes loading (or timeout). */
function waitTabComplete(tabId: number, timeout: number): Promise<void> {
  return new Promise((resolve) => {
    const start = Date.now();
    const listener = (id: number, info: chrome.tabs.TabChangeInfo) => {
      if (id === tabId && info.status === 'complete') {
        chrome.tabs.onUpdated.removeListener(listener);
        resolve();
      } else if (Date.now() - start > timeout) {
        chrome.tabs.onUpdated.removeListener(listener);
        resolve();
      }
    };
    chrome.tabs.onUpdated.addListener(listener);
    // Safety timeout
    setTimeout(() => {
      chrome.tabs.onUpdated.removeListener(listener);
      resolve();
    }, timeout);
  });
}
