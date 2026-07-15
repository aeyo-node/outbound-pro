import type { ToolDef } from './types';
import { asLocator } from './types';
import { ok, measure } from '@/lib/result';
import { resolveElement } from '@/lib/dom';

/** Reading / extraction tools (content context). */
export const readingTools: ToolDef[] = [
  {
    name: 'readText',
    description: 'Read visible text of an element (or the page if no selector).',
    context: 'content',
    handler: async (args) =>
      measure('readText', args.id as string | undefined, async () => {
        const el = args.selector ? await resolveElement(asLocator(args.selector)) : document.body;
        const text = (el.innerText ?? el.textContent ?? '').trim();
        return ok('readText', { text, length: text.length });
      }),
  },
  {
    name: 'readAllText',
    description: 'Read the entire visible page text.',
    context: 'content',
    handler: async (_args, ctx) =>
      measure('readAllText', ctx.id, async () => {
        const text = document.body.innerText.trim();
        return ok('readAllText', { text, length: text.length });
      }),
  },
  {
    name: 'extractTable',
    description: 'Extract an HTML <table> as rows of cells (array of arrays).',
    context: 'content',
    handler: async (args) =>
      measure('extractTable', args.id as string | undefined, async () => {
        const table = args.selector
          ? ((await resolveElement(asLocator(args.selector))) as HTMLTableElement)
          : (document.querySelector('table') as HTMLTableElement | null);
        if (!table) throw new Error('No <table> found');
        const rows: string[][] = [];
        for (const tr of table.querySelectorAll('tr')) {
          const cells = Array.from(tr.querySelectorAll('th,td')).map(
            (c) => ((c as HTMLElement).innerText ?? c.textContent ?? '').trim(),
          );
          if (cells.length) rows.push(cells);
        }
        return ok('extractTable', { rows, rowCount: rows.length });
      }),
  },
  {
    name: 'extractCards',
    description: 'Extract repeated "card" elements. Provide a selector for one card; returns array of {text, fields}.',
    context: 'content',
    handler: async (args) =>
      measure('extractCards', args.id as string | undefined, async () => {
        const sel = (args.selector as string) ?? '[class*="card"]';
        const cards = Array.from(document.querySelectorAll(sel));
        const data = cards.map((c) => {
          const fields: Record<string, string> = {};
          c.querySelectorAll<HTMLElement>('[data-field], label, .field, dt').forEach((f) => {
            const key = (
              f.getAttribute('data-field') ??
              (f as HTMLElement).innerText ??
              f.textContent ??
              ''
            )
              .trim()
              .slice(0, 40);
            const val = (f.nextElementSibling?.textContent ?? f.closest('div')?.textContent ?? '').trim();
            if (key) fields[key] = val;
          });
          return { text: ((c as HTMLElement).innerText ?? '').trim().slice(0, 500), fields };
        });
        return ok('extractCards', { count: data.length, cards: data });
      }),
  },
  {
    name: 'extractForm',
    description: 'Extract all named form controls and their current values from a <form> (or the whole document).',
    context: 'content',
    handler: async (args) =>
      measure('extractForm', args.id as string | undefined, async () => {
        const root: HTMLElement = args.selector
          ? await resolveElement(asLocator(args.selector))
          : document.body;
        const controls = Array.from(
          root.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(
            'input, select, textarea',
          ),
        ).filter((c) => c.name || c.id);
        const fields = controls.map((c) => ({
          name: c.name || c.id,
          type: c.type || c.tagName.toLowerCase(),
          value: c.value,
          label: labelFor(c),
        }));
        return ok('extractForm', { fields });
      }),
  },
  {
    name: 'extractErrors',
    description: 'Extract visible validation/error messages on the page.',
    context: 'content',
    handler: async (_args, ctx) =>
      measure('extractErrors', ctx.id, async () => {
        const sels = [
          '[role="alert"]',
          '.error',
          '.invalid-feedback',
          '[class*="error"]',
          '[class*="Error"]',
          '[data-error]',
        ];
        const seen = new Set<string>();
        const errors: string[] = [];
        for (const sel of sels) {
          document.querySelectorAll<HTMLElement>(sel).forEach((el) => {
            const t = (el.innerText ?? el.textContent ?? '').trim();
            if (t && el.offsetParent !== null && !seen.has(t)) {
              seen.add(t);
              errors.push(t);
            }
          });
        }
        return ok('extractErrors', { errors, count: errors.length });
      }),
  },
];

function labelFor(c: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement): string | null {
  if (c.id) {
    const lab = document.querySelector(`label[for="${CSS.escape(c.id)}"]`) as HTMLElement | null;
    if (lab) return (lab.innerText ?? '').trim();
  }
  const wrap = c.closest('label');
  if (wrap) return ((wrap as HTMLElement).innerText ?? '').trim();
  return c.getAttribute('aria-label') ?? c.getAttribute('placeholder');
}
