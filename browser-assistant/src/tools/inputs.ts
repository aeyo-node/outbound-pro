import type { ToolDef } from './types';
import { asLocator } from './types';
import { ok, measure } from '@/lib/result';
import { findInput, resolveElement, setNativeValue, typeInto, scrollIntoView } from '@/lib/dom';

/** Form input tools (content context). */
export const inputTools: ToolDef[] = [
  {
    name: 'type',
    description: 'Type text into an input/textarea. Clears the field first unless `append` is true.',
    context: 'content',
    args: { selector: { type: 'string' }, text: { type: 'string', required: true } },
    handler: async (args) =>
      measure('type', args.id as string | undefined, async () => {
        const el = (await resolveInputElement(args)) as
          | HTMLInputElement
          | HTMLTextAreaElement
          | HTMLSelectElement;
        scrollIntoView(el);
        if (!args.append) {
          setNativeValue(el, '');
        }
        await typeInto(el as HTMLElement, args.text as string, (args.delay as number) ?? 10);
        return ok('type', { value: (el as HTMLInputElement).value });
      }),
  },
  {
    name: 'clear',
    description: 'Clear an input/textarea.',
    context: 'content',
    handler: async (args) =>
      measure('clear', args.id as string | undefined, async () => {
        const el = (await resolveInputElement(args)) as HTMLInputElement | HTMLTextAreaElement;
        setNativeValue(el, '');
        return ok('clear', { cleared: true });
      }),
  },
  {
    name: 'select',
    description: 'Choose an <option> in a <select> by value or visible text.',
    context: 'content',
    args: { value: { type: 'string' } },
    handler: async (args) =>
      measure('select', args.id as string | undefined, async () => {
        const el = (await resolveInputElement(args)) as HTMLSelectElement;
        const want = args.value as string;
        const byValue = Array.from(el.options).find((o) => o.value === want);
        const byText = Array.from(el.options).find((o) => o.text.trim() === want);
        const opt = byValue ?? byText;
        if (!opt) {
          const available = Array.from(el.options).map((o) => ({ value: o.value, text: o.text }));
          throw new Error(`Option "${want}" not found. Available: ${JSON.stringify(available)}`);
        }
        setNativeValue(el, opt.value);
        return ok('select', { value: opt.value, text: opt.text });
      }),
  },
  {
    name: 'check',
    description: 'Check a checkbox.',
    context: 'content',
    handler: async (args) =>
      measure('check', args.id as string | undefined, async () => {
        const el = (await resolveInputElement(args)) as HTMLInputElement;
        if (el.type !== 'checkbox') throw new Error('Element is not a checkbox');
        if (!el.checked) el.click();
        return ok('check', { checked: el.checked });
      }),
  },
  {
    name: 'uncheck',
    description: 'Uncheck a checkbox.',
    context: 'content',
    handler: async (args) =>
      measure('uncheck', args.id as string | undefined, async () => {
        const el = (await resolveInputElement(args)) as HTMLInputElement;
        if (el.type !== 'checkbox') throw new Error('Element is not a checkbox');
        if (el.checked) el.click();
        return ok('uncheck', { checked: el.checked });
      }),
  },
  {
    name: 'radio',
    description: 'Select a radio button by name + value.',
    context: 'content',
    args: { name: { type: 'string' }, value: { type: 'string' } },
    handler: async (args) =>
      measure('radio', args.id as string | undefined, async () => {
        const radio = document.querySelector<HTMLInputElement>(
          `input[type="radio"][name="${CSS.escape(args.name as string)}"][value="${CSS.escape(args.value as string)}"]`,
        );
        if (!radio) throw new Error(`Radio name="${args.name}" value="${args.value}" not found`);
        radio.click();
        return ok('radio', { checked: radio.checked });
      }),
  },
];

async function resolveInputElement(args: Record<string, unknown>): Promise<HTMLElement> {
  if (args.label) return findInput(args.label as string);
  return resolveElement(asLocator(args.selector ?? args));
}
