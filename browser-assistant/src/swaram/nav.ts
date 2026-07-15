import type { ToolDef } from '@/tools/types';
import { ok, fail } from '@/lib/result';
import { loadCredentials } from '@/lib/storage';
import { log } from '@/lib/logger';

/**
 * Swaram dashboard navigation helpers.
 *
 * The dashboard is a Next.js SPA at <dashboardUrl>/app with a `?tab=` query
 * param driving the active view. These helpers compose the generic openPage
 * tool, so they stay resilient if routes change.
 */

const TAB_PATH = '/app';

async function baseUrl(): Promise<string> {
  const creds = await loadCredentials();
  if (!creds?.dashboardUrl) throw new Error('Dashboard URL not configured');
  return creds.dashboardUrl.replace(/\/$/, '');
}

async function openTab(tab: string): Promise<string> {
  const base = await baseUrl();
  const url = `${base}${TAB_PATH}?tab=${tab}`;
  return url;
}

/** Shared: navigate to a tab and wait for it to settle. */
async function gotoTab(ctx: import('@/tools/types').ToolHandlerCtx, tab: string): Promise<void> {
  const url = await openTab(tab);
  const r = await ctx.run('openPage', { url });
  if (!r.success) throw new Error(`openPage failed: ${r.reason}`);
  await ctx.run('pageReady', {});
}

export const swaramNavTools: ToolDef[] = [
  openDashboardTool(),
  {
    name: 'swaram.openCampaigns',
    description: 'Navigate to the Campaigns tab.',
    context: 'background',
    handler: async (_a, ctx) => nav(ctx, 'campaigns', 'Campaigns'),
  },
  {
    name: 'swaram.openCalls',
    description: 'Navigate to the Outbound Calls tab.',
    context: 'background',
    handler: async (_a, ctx) => nav(ctx, 'outbound', 'Outbound Calls'),
  },
  {
    name: 'swaram.openSingleCall',
    description: 'Navigate to the Single Call tab.',
    context: 'background',
    handler: async (_a, ctx) => nav(ctx, 'single_call', 'Single Call'),
  },
  {
    name: 'swaram.openContacts',
    description: 'Navigate to the CRM / Leads tab.',
    context: 'background',
    handler: async (_a, ctx) => nav(ctx, 'crm', 'CRM / Leads'),
  },
  {
    name: 'swaram.openAppointments',
    description: 'Navigate to the Demo Booked / Appointments tab.',
    context: 'background',
    handler: async (_a, ctx) => nav(ctx, 'appointments', 'Appointments'),
  },
  {
    name: 'swaram.openAnalytics',
    description: 'Navigate to the Analytics tab.',
    context: 'background',
    handler: async (_a, ctx) => nav(ctx, 'analytics', 'Analytics'),
  },
  {
    name: 'swaram.openLiveMonitoring',
    description: 'Navigate to the Live Monitoring tab.',
    context: 'background',
    handler: async (_a, ctx) => nav(ctx, 'live_ops', 'Live Monitoring'),
  },
  {
    name: 'swaram.openAgentProfiles',
    description: 'Navigate to the Agent Profiles tab.',
    context: 'background',
    handler: async (_a, ctx) => nav(ctx, 'agent_profiles', 'Agent Profiles'),
  },
  {
    name: 'swaram.openSettings',
    description: 'Navigate to the Settings tab.',
    context: 'background',
    handler: async (_a, ctx) => nav(ctx, 'settings', 'Settings'),
  },
  {
    name: 'swaram.openBilling',
    description: 'Navigate to the Billing & Plans tab.',
    context: 'background',
    handler: async (_a, ctx) => nav(ctx, 'billing', 'Billing'),
  },
  {
    name: 'swaram.openDashboard',
    description: 'Navigate to the dashboard overview.',
    context: 'background',
    handler: async (_a, ctx) => nav(ctx, 'overview', 'Dashboard'),
  },
  {
    name: 'swaram.openPage',
    description: 'Open an arbitrary Swaram dashboard path (relative to the configured dashboard URL).',
    context: 'background',
    args: { path: { type: 'string', required: true } },
    handler: async (args, ctx) => {
      const base = await baseUrl();
      const path = args.path as string;
      const url = path.startsWith('http') ? path : `${base}${path.startsWith('/') ? '' : '/'}${path}`;
      const r = await ctx.run('openPage', { url });
      if (!r.success) return fail('swaram.openPage', r.reason ?? 'openPage failed');
      await ctx.run('pageReady', {});
      return ok('swaram.openPage', { url });
    },
  },
];

function openDashboardTool(): ToolDef {
  return {
    name: 'swaram.openDashboard',
    description: 'Navigate to the dashboard overview (alias).',
    context: 'background',
    handler: async (_a, ctx) => nav(ctx, 'overview', 'Dashboard'),
  };
}

async function nav(
  ctx: import('@/tools/types').ToolHandlerCtx,
  tab: string,
  label: string,
) {
  try {
    await gotoTab(ctx, tab);
    return ok(`swaram.open${label.replace(/[^a-zA-Z]/g, '')}`, { tab, url: await openTab(tab) });
  } catch (e) {
    log.error(`swaram nav ${tab} failed: ${(e as Error).message}`);
    return fail('swaram.nav', (e as Error).message);
  }
}

export { gotoTab, baseUrl };
