import type { Dispatcher } from '@/background/dispatcher';
import type { ToolDef } from '@/tools/types';
import { ok } from '@/lib/result';
import { log } from '@/lib/logger';

export interface MonitorSnapshot {
  campaigns: unknown;
  calls: unknown;
  errors: string[];
  completionPct?: number;
  disconnected?: number;
  failed?: number;
  url?: string;
}

/**
 * Dashboard monitor.
 *
 * Periodically reads the currently visible dashboard page (without navigating
 * away from whatever the operator is viewing) and returns a status snapshot:
 * campaign statuses, call statuses, errors, disconnected/failed counts and
 * completion percentage. The background pushes this to the backend as a
 * `monitor` message.
 *
 * Parsing is intentionally lenient (text + table extraction) so it survives
 * dashboard layout changes.
 */
export async function captureMonitor(dispatcher: Dispatcher): Promise<MonitorSnapshot> {
  const errors: string[] = [];
  let campaigns: unknown = null;
  let calls: unknown = null;
  let completionPct: number | undefined;
  let disconnected: number | undefined;
  let failed: number | undefined;
  let url: string | undefined;

  try {
    const urlRes = await dispatcher.executeLocal('currentUrl', {});
    url = (urlRes.data as { url?: string })?.url;
    if (!url || !/\/app/.test(url)) {
      // Not on the dashboard — skip (don't disrupt the operator).
      return { campaigns, calls, errors: ['not on dashboard'], url };
    }

    // Extract any visible table (campaigns or calls view).
    const tableRes = await dispatcher.executeLocal('extractTable', {});
    const rows = (tableRes.data as { rows?: string[][] } | undefined)?.rows;
    if (rows && rows.length) {
      // Heuristic: header contains "status" -> campaigns; "phone"/"duration" -> calls.
      const header = (rows[0] ?? []).join(' ').toLowerCase();
      if (header.includes('status') && header.includes('campaign')) campaigns = rows;
      else if (header.includes('phone') || header.includes('duration') || header.includes('call')) calls = rows;
      else campaigns = rows;
    }

    // Errors on page.
    const errRes = await dispatcher.executeLocal('extractErrors', {});
    const pageErrors = (errRes.data as { errors?: string[] })?.errors ?? [];
    errors.push(...pageErrors);

    // Completion %: look for a number followed by % in visible text.
    const textRes = await dispatcher.executeLocal('readAllText', {});
    const body = (textRes.data as { text?: string })?.text ?? '';
    const pctMatch = body.match(/(\d{1,3})\s*%/);
    if (pctMatch) completionPct = Number(pctMatch[1]);
    const discMatch = body.match(/disconnected[:\s]+(\d+)/i);
    if (discMatch) disconnected = Number(discMatch[1]);
    const failedMatch = body.match(/failed[:\s]+(\d+)/i);
    if (failedMatch) failed = Number(failedMatch[1]);
  } catch (e) {
    log.debug(`monitor capture error: ${(e as Error).message}`);
    errors.push((e as Error).message);
  }

  return { campaigns, calls, errors, completionPct, disconnected, failed, url };
}

export const swaramMonitorTools: ToolDef[] = [
  {
    name: 'swaram.monitor',
    description: 'Return a one-shot dashboard status snapshot (campaigns, calls, errors, completion %).',
    context: 'background',
    handler: async (_args, _ctx) => {
      // ctx.run cannot call captureMonitor (it needs the dispatcher); the
      // background exposes this tool via a closure in swaram/index.ts.
      return ok('swaram.monitor', { note: 'use the monitor message stream' });
    },
  },
];
