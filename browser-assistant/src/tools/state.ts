import type { ToolDef } from './types';
import { asLocator } from './types';
import { ok, measure } from '@/lib/result';
import { isEnabled, isVisible, resolveElement, waitFor } from '@/lib/dom';

/** State / readiness tools (content context). */
export const stateTools: ToolDef[] = [
  {
    name: 'pageReady',
    description: 'Wait for the document to finish loading and network/spa to settle. Returns ready state.',
    context: 'content',
    handler: async (args, ctx) =>
      measure('pageReady', ctx.id, async () => {
        const timeout = (args.timeout as number) ?? 8000;
        await waitFor(() => (document.readyState === 'complete' ? true : null), timeout);
        // extra settle for SPA route changes
        await new Promise((r) => setTimeout(r, 200));
        return ok('pageReady', { readyState: document.readyState, url: location.href, title: document.title });
      }),
  },
  {
    name: 'isVisible',
    description: 'Check whether an element is visible.',
    context: 'content',
    handler: async (args) =>
      measure('isVisible', args.id as string | undefined, async () => {
        const el = await resolveElement(asLocator(args.selector ?? args));
        return ok('isVisible', { visible: isVisible(el) });
      }),
  },
  {
    name: 'isEnabled',
    description: 'Check whether an element is enabled / not disabled.',
    context: 'content',
    handler: async (args) =>
      measure('isEnabled', args.id as string | undefined, async () => {
        const el = await resolveElement(asLocator(args.selector ?? args));
        return ok('isEnabled', { enabled: isEnabled(el) });
      }),
  },
  {
    name: 'exists',
    description: 'Check whether an element exists in the DOM (does not wait).',
    context: 'content',
    handler: async (args) => {
      const loc = asLocator(args.selector ?? args);
      const resolve = typeof loc === 'string' ? loc : (loc.selector ?? loc.text ?? loc.xpath ?? '');
      let exists = false;
      if (resolve) {
        try {
          const el = await resolveElement({ ...(typeof loc === 'object' ? loc : { selector: loc }), timeout: 500 });
          exists = !!el;
        } catch {
          exists = false;
        }
      }
      return ok('exists', { exists });
    },
  },
];
