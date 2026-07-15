import type { ToolDef, ToolHandlerCtx } from '@/tools/types';
import { ok, fail } from '@/lib/result';
import { log } from '@/lib/logger';
import { gotoTab } from './nav';

/**
 * Single-call and customer helpers for the Swaram dashboard.
 *
 * The Single Call form fields (from src/components/dashboard/views/SingleCall.tsx):
 *   phone, lead_name, business_name, industry, place   (inputs)
 *   agent_profile_id                                    (select)
 *   system_prompt                                       (textarea)
 * Submit button text: "Dispatch Call"
 */

export interface SingleCallInput {
  phone: string;
  lead_name?: string;
  business_name?: string;
  industry?: string;
  place?: string;
  agent_profile_id?: string; // profile id or visible name
  system_prompt?: string;
}

export const swaramCallTools: ToolDef[] = [
  {
    name: 'swaram.createSingleCall',
    description:
      'Create a single outbound call. Required: phone. Optional: lead_name, business_name, industry, place, agent_profile_id, system_prompt. Returns the resulting call id if visible.',
    context: 'background',
    args: { phone: { type: 'string', required: true } },
    handler: async (args, ctx) => createSingleCall(ctx, args as unknown as SingleCallInput & { id?: string }),
  },
  {
    name: 'swaram.deleteCall',
    description: 'Delete a call/log entry by clicking its delete control. `row` = 0-based row index or text to match.',
    context: 'background',
    handler: async (args, ctx) => deleteRow(ctx, args.row as number | string | undefined, 'call'),
  },
  {
    name: 'swaram.searchCustomer',
    description: 'Search customers/leads in the CRM tab. `query` is typed into the search box.',
    context: 'background',
    args: { query: { type: 'string', required: true } },
    handler: async (args, ctx) => {
      await gotoTab(ctx, 'crm');
      const r = await ctx.run('type', { selector: 'input[placeholder*="Search" i]', text: args.query as string });
      await ctx.run('pressKey', { key: 'Enter' });
      await new Promise((res) => setTimeout(res, 800));
      const cards = await ctx.run('extractCards', { selector: 'tbody tr, [class*="card"]' });
      return ok('swaram.searchCustomer', { query: args.query, searched: r.success, results: (cards.data as { cards?: unknown[] })?.cards ?? [] });
    },
  },
  {
    name: 'swaram.openCustomer',
    description: 'Open a customer record by row index (0-based) or matched text in the CRM tab.',
    context: 'background',
    handler: async (args, ctx) => {
      await gotoTab(ctx, 'crm');
      const row = args.row as number | string | undefined;
      const sel = typeof row === 'number' ? `tbody tr:nth-child(${row + 1})` : 'tbody tr';
      const click = await ctx.run('click', { selector: sel, text: typeof row === 'string' ? row : undefined });
      if (!click.success) return fail('swaram.openCustomer', click.reason ?? 'row not found');
      await new Promise((res) => setTimeout(res, 800));
      const text = await ctx.run('readAllText', {});
      return ok('swaram.openCustomer', { opened: true, text: (text.data as { text?: string })?.text?.slice(0, 1000) });
    },
  },
  {
    name: 'swaram.viewNotes',
    description: 'Read notes from the currently open customer/call record.',
    context: 'background',
    handler: async (_args, ctx) => {
      const r = await ctx.run('readText', { selector: '[class*="note" i], [data-notes], .notes' });
      if (!r.success) {
        const all = await ctx.run('readAllText', {});
        return ok('swaram.viewNotes', { notes: (all.data as { text?: string })?.text ?? '', via: 'fallback' });
      }
      return ok('swaram.viewNotes', { notes: (r.data as { text?: string })?.text ?? '' });
    },
  },
  {
    name: 'swaram.downloadReports',
    description: 'Click a Download/Export reports control on the current tab.',
    context: 'background',
    handler: async (_args, ctx) => {
      const r = await ctx.run('click', { text: 'Download' });
      if (!r.success) await ctx.run('click', { text: 'Export' }).catch(() => {});
      return ok('swaram.downloadReports', { triggered: true });
    },
  },
];

async function createSingleCall(ctx: ToolHandlerCtx, input: SingleCallInput & { id?: string }): Promise<ReturnType<typeof ok>> {
  if (!input.phone) return fail('swaram.createSingleCall', 'phone is required', { code: 'bad_args' });
  await gotoTab(ctx, 'single_call');
  await ctx.run('pageReady', {});

  const fields: Record<string, string> = {
    phone: input.phone,
  };
  if (input.lead_name) fields['lead_name'] = input.lead_name;
  if (input.business_name) fields['business_name'] = input.business_name;
  if (input.industry) fields['industry'] = input.industry;
  if (input.place) fields['place'] = input.place;
  if (input.system_prompt) fields['system_prompt'] = input.system_prompt;

  // Fill text inputs by their name attribute (resilient via fillForm).
  const fillText = await ctx.run('fillForm', {
    fields: Object.fromEntries(Object.entries(fields).map(([k, v]) => [`[name="${k}"]`, v])),
  });
  if (!fillText.success) return fail('swaram.createSingleCall', fillText.reason ?? 'could not fill form');

  // Agent profile select (optional).
  if (input.agent_profile_id) {
    await ctx.run('select', { selector: '[name="agent_profile_id"]', value: input.agent_profile_id }).catch((e) => {
      log.warn(`agent select failed: ${(e as Error).message}`);
    });
  }

  // Dispatch.
  const submit = await ctx.run('click', { text: 'Dispatch Call' });
  if (!submit.success) {
    await ctx.run('submit', { texts: ['Dispatch Call', 'Dispatch'] }).catch(() => {});
  }
  await new Promise((r) => setTimeout(r, 1500));

  // Read success / errors.
  const errs = await ctx.run('extractErrors', {});
  const errors = (errs.data as { errors?: string[] })?.errors ?? [];
  if (errors.length) return fail('swaram.createSingleCall', errors.join('; '), { code: 'form_errors' });

  const text = await ctx.run('readAllText', {});
  const body = (text.data as { text?: string })?.text ?? '';
  const idMatch = body.match(/(?:call[_-]?(?:id|uuid)|id)[:=]?\s*([A-Za-z0-9_-]{6,})/i);
  return ok('swaram.createSingleCall', {
    dispatched: true,
    callId: idMatch?.[1] ?? null,
    message: body.slice(0, 300),
  });
}

async function deleteRow(ctx: ToolHandlerCtx, row: number | string | undefined, kind: string) {
  await ctx.run('pageReady', {});
  const text = typeof row === 'string' ? row : undefined;
  const sel = typeof row === 'number' ? `tbody tr:nth-child(${row + 1}) [title="Delete"], tbody tr:nth-child(${row + 1}) button[title="Delete"]` : undefined;
  const r = await ctx.run('click', { selector: sel, text, ariaLabel: 'Delete' });
  if (!r.success) return fail(`swaram.delete${kind}`, r.reason ?? 'delete control not found');
  // Confirm if a confirmation dialog appears.
  await ctx.run('click', { text: 'Confirm' }).catch(() => {});
  await ctx.run('click', { text: 'Delete' }).catch(() => {});
  await new Promise((res) => setTimeout(res, 600));
  return ok(`swaram.delete${kind}`, { deleted: true });
}
