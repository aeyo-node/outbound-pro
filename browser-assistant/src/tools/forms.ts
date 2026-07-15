import type { ToolDef } from './types';
import { ok, measure } from '@/lib/result';
import { findInput, resolveElement, setNativeValue, scrollIntoView, typeInto } from '@/lib/dom';

/** Form-level tools (content context). */
export const formTools: ToolDef[] = [
  {
    name: 'fillForm',
    description:
      'Fill many fields at once. `fields` is a map of {label|selector|name: value}. Uses resilient label lookup per field.',
    context: 'content',
    args: { fields: { type: 'object', required: true } },
    handler: async (args) =>
      measure('fillForm', args.id as string | undefined, async () => {
        const fields = (args.fields as Record<string, string>) ?? {};
        const filled: Record<string, { value: string; via: string }> = {};
        for (const [key, value] of Object.entries(fields)) {
          let el: HTMLElement | null = null;
          let via = '';
          // Try label first, then name attr, then CSS selector.
          try {
            el = await findInput(key, 1500);
            via = 'label';
          } catch {
            const byName = document.querySelector<HTMLElement>(`[name="${CSS.escape(key)}"]`);
            if (byName) {
              el = byName;
              via = 'name';
            } else {
              try {
                el = await resolveElement(key);
                via = 'selector';
              } catch {
                /* leave null */
              }
            }
          }
          if (!el) throw new Error(`fillForm: could not resolve field "${key}"`);
          scrollIntoView(el);
          if (el instanceof HTMLSelectElement) {
            setNativeValue(el, value);
          } else if (el instanceof HTMLInputElement && (el.type === 'checkbox' || el.type === 'radio')) {
            const want = String(value).toLowerCase() === 'true' || value === '1';
            if ((el.checked ?? false) !== want) el.click();
          } else {
            await typeInto(el, value, 5);
          }
          filled[key] = { value, via };
        }
        return ok('fillForm', { filled, count: Object.keys(filled).length });
      }),
  },
  {
    name: 'submit',
    description: 'Submit a form. Finds a submit button by text (Submit/Save/Create/Dispatch/Confirm) or submits the <form> directly.',
    context: 'content',
    handler: async (args) =>
      measure('submit', args.id as string | undefined, async () => {
        const texts = (args.texts as string[]) ?? [
          'Submit',
          'Save',
          'Create',
          'Dispatch Call',
          'Dispatch',
          'Confirm',
          'Send',
          'Next',
        ];
        // Try to find a submit-ish button by text.
        for (const t of texts) {
          try {
            const el = await resolveElement({ text: t, role: 'button', timeout: 800 });
            scrollIntoView(el);
            (el as HTMLButtonElement).click();
            await new Promise((r) => setTimeout(r, 300));
            return ok('submit', { submitted: true, via: 'button', text: t });
          } catch {
            /* try next */
          }
        }
        // Fallback: submit the first <form>.
        const form = document.querySelector<HTMLFormElement>('form');
        if (form) {
          form.requestSubmit ? form.requestSubmit() : form.submit();
          return ok('submit', { submitted: true, via: 'form' });
        }
        throw new Error('No submit button or <form> found');
      }),
  },
  {
    name: 'cancel',
    description: 'Click a Cancel/Close/Dismiss button.',
    context: 'content',
    handler: async (args) =>
      measure('cancel', args.id as string | undefined, async () => {
        for (const t of ['Cancel', 'Close', 'Dismiss', '×']) {
          try {
            const el = await resolveElement({ text: t, role: 'button', timeout: 600 });
            (el as HTMLElement).click();
            return ok('cancel', { cancelled: true, text: t });
          } catch {
            /* try next */
          }
        }
        throw new Error('No cancel button found');
      }),
  },
];
