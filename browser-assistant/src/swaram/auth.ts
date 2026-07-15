import type { ToolDef } from '@/tools/types';
import { ok, fail } from '@/lib/result';
import { loadCredentials } from '@/lib/storage';
import { log } from '@/lib/logger';
import { baseUrl } from './nav';

/**
 * Swaram-aware login.
 *
 * The Swaram dashboard login form uses:
 *   - input[name="swaram-email"]   (type=email)
 *   - input[name="swaram-pass"]    (type=password)
 *   - <button type="submit">
 *
 * On success the app stores `swaram_token` in localStorage and redirects to
 * /app (or /app?tab=superadmin for superadmins).
 */
export const swaramAuthTools: ToolDef[] = [
  {
    name: 'swaram.login',
    description: 'Log into the Swaram dashboard using stored credentials and verify the session.',
    context: 'background',
    handler: async (_args, ctx) => {
      const creds = await loadCredentials();
      if (!creds) return fail('swaram.login', 'No stored credentials', { code: 'not_configured' });
      const base = await baseUrl();
      const loginUrl = `${base}/login`;
      log.info(`swaram.login: opening ${loginUrl}`);

      const open = await ctx.run('openPage', { url: loginUrl });
      if (!open.success) return fail('swaram.login', open.reason ?? 'openPage failed');
      await ctx.run('pageReady', {});

      // If already logged in, the login page redirects to /app.
      const urlNow = await ctx.run('currentUrl', {});
      const cur = (urlNow.data as { url?: string })?.url ?? '';
      if (!cur.includes('/login')) {
        log.info('swaram.login: already logged in');
        return ok('swaram.login', { loggedIn: true, url: cur, reused: true });
      }

      const emailRes = await ctx.run('type', {
        selector: 'input[name="swaram-email"]',
        text: creds.email,
      });
      if (!emailRes.success) return fail('swaram.login', 'Could not fill email', { code: 'email_failed' });

      const passRes = await ctx.run('type', {
        selector: 'input[name="swaram-pass"]',
        text: creds.password,
      });
      if (!passRes.success) return fail('swaram.login', 'Could not fill password', { code: 'password_failed' });

      // Submit the form.
      await ctx.run('click', { selector: 'button[type="submit"]' }).catch(() => {});
      await ctx.run('submit', {}).catch(() => {});

      // Wait for navigation away from /login.
      const settled = await waitFor(() => ctx.run('currentUrl', {}).then((r) => {
        const u = (r.data as { url?: string })?.url ?? '';
        return !u.includes('/login') ? u : null;
      }), 10000);
      if (!settled) {
        // Check for an error message on the page.
        const errs = await ctx.run('extractErrors', {});
        const msg = (errs.data as { errors?: string[] })?.errors?.[0];
        return fail('swaram.login', msg ?? 'Login did not redirect; check credentials', {
          code: 'login_failed',
        });
      }
      log.info(`swaram.login: success, now at ${settled}`);
      return ok('swaram.login', { loggedIn: true, url: settled });
    },
  },
];

/** Poll a promise-returning predicate until it returns truthy or timeout. */
async function waitFor<T>(
  pred: () => Promise<T | null>,
  timeoutMs: number,
  interval = 500,
): Promise<T | null> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const v = await pred();
      if (v) return v;
    } catch {
      /* keep polling */
    }
    await new Promise((r) => setTimeout(r, interval));
  }
  return null;
}
