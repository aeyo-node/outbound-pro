import type { ToolDef } from './types';
import { asLocator } from './types';
import { ok, measure } from '@/lib/result';
import { resolveElement } from '@/lib/dom';

/** Miscellaneous tools (content context). */
export const miscTools: ToolDef[] = [
  {
    name: 'copy',
    description: 'Copy selected text or a given string to the clipboard.',
    context: 'content',
    handler: async (args) =>
      measure('copy', args.id as string | undefined, async () => {
        const text = (args.text as string) ?? window.getSelection()?.toString() ?? '';
        if (!text) throw new Error('Nothing to copy (no text arg and no selection)');
        await navigator.clipboard.writeText(text);
        return ok('copy', { length: text.length });
      }),
  },
  {
    name: 'paste',
    description: 'Paste clipboard text into a focused/selected input.',
    context: 'content',
    handler: async (args) =>
      measure('paste', args.id as string | undefined, async () => {
        const text = await navigator.clipboard.readText();
        let target: HTMLElement | null = null;
        if (args.selector) target = await resolveElement(asLocator(args.selector));
        else target = document.activeElement as HTMLElement | null;
        if (!target) throw new Error('No target element to paste into');
        target.focus();
        const input = target as HTMLInputElement | HTMLTextAreaElement;
        if ('value' in input) {
          input.setRangeText(text, input.selectionStart ?? input.value.length, input.selectionEnd ?? input.value.length, 'end');
          input.dispatchEvent(new Event('input', { bubbles: true }));
        }
        return ok('paste', { length: text.length });
      }),
  },
  {
    name: 'pressKey',
    description: 'Dispatch a keyboard event (Enter, Escape, Tab, ArrowDown, etc.). Optionally target an element.',
    context: 'content',
    args: { key: { type: 'string', required: true } },
    handler: async (args) =>
      measure('pressKey', args.id as string | undefined, async () => {
        const key = args.key as string;
        const target: HTMLElement = args.selector
          ? await resolveElement(asLocator(args.selector))
          : (document.activeElement as HTMLElement) ?? document.body;
        for (const type of ['keydown', 'keypress', 'keyup'] as const) {
          target.dispatchEvent(
            new KeyboardEvent(type, {
              key,
              code: args.code as string,
              keyCode: args.keyCode as number,
              bubbles: true,
              cancelable: true,
            }),
          );
        }
        return ok('pressKey', { key });
      }),
  },
  {
    name: 'runJavascript',
    description:
      'Evaluate a JavaScript expression in the page context. DISABLE in production via config flag `allowJs=false`. Returns the serialized result.',
    context: 'content',
    args: { js: { type: 'string', required: true } },
    handler: async (args) =>
      measure('runJavascript', args.id as string | undefined, async () => {
        // Gated by a page-level flag set by the background on init.
        if ((window as any).__SWARAM_ALLOW_JS__ === false) {
          throw new Error('runJavascript is disabled by policy');
        }
        const js = args.js as string;
        // eslint-disable-next-line no-new-func
        const fn = new Function(`"use strict"; return (function(){ ${js} })();`);
        const result = fn();
        return ok('runJavascript', { result: safeSerialize(result) });
      }),
  },
];

function safeSerialize(v: unknown): unknown {
  try {
    JSON.stringify(v);
    return v;
  } catch {
    return String(v);
  }
}
