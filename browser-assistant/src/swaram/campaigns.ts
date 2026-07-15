import type { ToolDef, ToolHandlerCtx } from '@/tools/types';
import { ok, fail } from '@/lib/result';
import { log } from '@/lib/logger';
import { gotoTab } from './nav';

/**
 * Campaign helpers for the Swaram dashboard.
 *
 * Create flow (from src/components/dashboard/views/Campaigns.tsx):
 *   - Click "Create Campaign" button -> opens modal
 *   - Fill campaign name input
 *   - Select agent_profile_id
 *   - Choose upload mode "csv" and attach the CSV file
 *   - Submit
 *
 * Pause / Resume / Delete use the row action buttons (title attributes).
 */

export interface CreateCampaignInput {
  name: string;
  agent_profile_id?: string;
  csv?: { filename: string; contentBase64: string; mimeType?: string };
  contacts_raw?: string; // manual mode fallback
  schedule_type?: string;
  schedule_time?: string;
  language?: string;
  voice?: string;
  retry_count?: number;
  knowledge_base?: string;
}

export const swaramCampaignTools: ToolDef[] = [
  {
    name: 'swaram.createCampaign',
    description:
      'Create a campaign. Required: name. Provide either `csv` ({filename, contentBase64}) for bulk, or `contacts_raw` for manual. Optional: agent_profile_id, language, voice, retry_count, knowledge_base. Returns campaign id if visible.',
    context: 'background',
    args: { name: { type: 'string', required: true } },
    handler: async (args, ctx) => createCampaign(ctx, args as unknown as CreateCampaignInput),
  },
  {
    name: 'swaram.createBulkCampaign',
    description: 'Alias for createCampaign with a CSV payload. Same args; emphasized for bulk uploads.',
    context: 'background',
    args: { name: { type: 'string', required: true }, csv: { type: 'object', required: true } },
    handler: async (args, ctx) => createCampaign(ctx, args as unknown as CreateCampaignInput),
  },
  {
    name: 'swaram.pauseCampaign',
    description: 'Pause a running campaign. `row` = 0-based index or campaign name text.',
    context: 'background',
    handler: async (args, ctx) => rowAction(ctx, args.row as number | string | undefined, 'Pause / Stop', 'pauseCampaign'),
  },
  {
    name: 'swaram.resumeCampaign',
    description: 'Resume / run a campaign now. `row` = 0-based index or campaign name text.',
    context: 'background',
    handler: async (args, ctx) => rowAction(ctx, args.row as number | string | undefined, 'Run Now', 'resumeCampaign'),
  },
  {
    name: 'swaram.deleteCampaign',
    description: 'Delete a campaign. `row` = 0-based index or campaign name text.',
    context: 'background',
    handler: async (args, ctx) => rowAction(ctx, args.row as number | string | undefined, 'Delete', 'deleteCampaign'),
  },
];

async function createCampaign(ctx: ToolHandlerCtx, input: CreateCampaignInput): Promise<ReturnType<typeof ok>> {
  if (!input.name) return fail('swaram.createCampaign', 'name is required', { code: 'bad_args' });
  await gotoTab(ctx, 'campaigns');
  await ctx.run('pageReady', {});

  // Open the Create modal.
  const open = await ctx.run('click', { text: 'Create Campaign' });
  if (!open.success) return fail('swaram.createCampaign', 'Could not open Create Campaign modal');
  await new Promise((r) => setTimeout(r, 600));

  // Campaign name.
  const nameRes = await ctx.run('type', { selector: 'input[name="name"], input[placeholder*="Sales" i]', text: input.name });
  if (!nameRes.success) return fail('swaram.createCampaign', 'Could not fill campaign name');

  // Agent profile select (optional).
  if (input.agent_profile_id) {
    await ctx.run('select', { selector: 'select[name="agent_profile_id"]', value: input.agent_profile_id }).catch((e) =>
      log.warn(`agent select failed: ${(e as Error).message}`),
    );
  }

  // Schedule (optional).
  if (input.schedule_type) {
    await ctx.run('select', { selector: 'select[name="schedule_type"]', value: input.schedule_type }).catch(() => {});
  }
  if (input.schedule_time) {
    await ctx.run('type', { selector: 'input[name="schedule_time"]', text: input.schedule_time }).catch(() => {});
  }

  // Contacts: CSV upload OR manual raw.
  if (input.csv) {
    // Switch to CSV upload mode if the toggle exists.
    await ctx.run('click', { text: 'CSV' }).catch(() => {});
    await ctx.run('click', { ariaLabel: 'Upload CSV' }).catch(() => {});
    const up = await ctx.run('upload', {
      selector: 'input[type="file"]',
      filename: input.csv.filename,
      content: input.csv.contentBase64,
      mimeType: input.csv.mimeType ?? 'text/csv',
    });
    if (!up.success) return fail('swaram.createCampaign', `CSV upload failed: ${up.reason}`);
    await new Promise((r) => setTimeout(r, 800));
  } else if (input.contacts_raw) {
    await ctx.run('type', { selector: 'textarea[name="contacts_raw"], textarea', text: input.contacts_raw }).catch(() => {});
  } else {
    return fail('swaram.createCampaign', 'Provide csv or contacts_raw', { code: 'bad_args' });
  }

  // Submit the modal form.
  const submit = await ctx.run('click', { text: 'Create' });
  if (!submit.success) {
    await ctx.run('submit', { texts: ['Create', 'Save', 'Create Campaign'] }).catch(() => {});
  }
  await new Promise((r) => setTimeout(r, 1500));

  const errs = await ctx.run('extractErrors', {});
  const errors = (errs.data as { errors?: string[] })?.errors ?? [];
  if (errors.length) return fail('swaram.createCampaign', errors.join('; '), { code: 'form_errors' });

  // Try to locate the newly created campaign id from the list.
  const text = await ctx.run('readAllText', {});
  const body = (text.data as { text?: string })?.text ?? '';
  const idMatch = body.match(/(?:campaign[_-]?(?:id|uuid)|id)[:=]?\s*([A-Za-z0-9_-]{6,})/i);
  return ok('swaram.createCampaign', {
    created: true,
    campaignId: idMatch?.[1] ?? null,
    name: input.name,
    message: body.slice(0, 300),
  });
}

async function rowAction(
  ctx: ToolHandlerCtx,
  row: number | string | undefined,
  title: string,
  toolName: string,
) {
  await gotoTab(ctx, 'campaigns');
  await ctx.run('pageReady', {});
  // Prefer the title-attribute action buttons within a row.
  const sel =
    typeof row === 'number'
      ? `tbody tr:nth-child(${row + 1}) button[title="${title}"]`
      : undefined;
  const text = typeof row === 'string' ? row : undefined;
  const r = await ctx.run('click', { selector: sel, text, ariaLabel: title });
  if (!r.success) {
    // Fallback: click by button title text anywhere.
    const r2 = await ctx.run('click', { ariaLabel: title });
    if (!r2.success) return fail(`swaram.${toolName}`, `Could not find "${title}" control`);
  }
  // Confirm dialog if present.
  await ctx.run('click', { text: 'Confirm' }).catch(() => {});
  await ctx.run('click', { text: title }).catch(() => {});
  await new Promise((res) => setTimeout(res, 700));
  return ok(`swaram.${toolName}`, { action: title, done: true });
}
