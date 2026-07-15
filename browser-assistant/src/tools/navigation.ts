import type { ToolDef } from './types';
import { asLocator } from './types';
import { ok, measure } from '@/lib/result';
import { findInput, resolveElement, scrollIntoView, waitFor, isVisible } from '@/lib/dom';

/** Navigation & element-finding tools (content context). */
export const navigationTools: ToolDef[] = [
  {
    name: 'findButton',
    description: 'Locate a button by visible text, aria-label, role, or CSS. Returns match info.',
    context: 'content',
    args: { text: { type: 'string', description: 'Button text or aria-label' } },
    handler: async (args) =>
      measure('findButton', args.id as string | undefined, async () => {
        const el = await resolveElement({ text: args.text as string, role: 'button', ...(args.selector ? { selector: args.selector as string } : {}) });
        return describeMatch(el);
      }),
  },
  {
    name: 'findLink',
    description: 'Locate a link by visible text or href.',
    context: 'content',
    args: { text: { type: 'string' } },
    handler: async (args) =>
      measure('findLink', args.id as string | undefined, async () => {
        const el = await resolveElement({ text: args.text as string, role: 'link' });
        return describeMatch(el);
      }),
  },
  {
    name: 'findInput',
    description: 'Locate a form input by its label, placeholder, aria-label, or name attribute.',
    context: 'content',
    args: { label: { type: 'string', required: true } },
    handler: async (args) =>
      measure('findInput', args.id as string | undefined, async () => {
        const el = await findInput(args.label as string);
        return describeMatch(el);
      }),
  },
  {
    name: 'findElement',
    description: 'Locate any element via a locator (CSS, text, aria, xpath, role).',
    context: 'content',
    args: { selector: { type: 'string' } },
    handler: async (args) =>
      measure('findElement', args.id as string | undefined, async () => {
        const el = await resolveElement(asLocator(args.selector ?? args));
        return describeMatch(el);
      }),
  },
  {
    name: 'scroll',
    description: 'Scroll the page. direction: up|down|left|right|top|bottom. Optional amount in px.',
    context: 'content',
    args: { direction: { type: 'string', enum: ['up', 'down', 'left', 'right', 'top', 'bottom'] } },
    handler: async (args, _ctx) => {
      const dir = (args.direction as string) ?? 'down';
      const amount = (args.amount as number) ?? 600;
      const map: Record<string, [number, number]> = {
        up: [0, -amount],
        down: [0, amount],
        left: [-amount, 0],
        right: [amount, 0],
        top: [0, 0],
        bottom: [0, 0],
      };
      if (dir === 'top') window.scrollTo({ top: 0 });
      else if (dir === 'bottom') window.scrollTo({ top: document.body.scrollHeight, behavior: 'auto' });
      else {
        const delta = map[dir] ?? [0, amount];
        window.scrollBy({ left: delta[0], top: delta[1], behavior: 'auto' });
      }
      await new Promise((r) => setTimeout(r, 150));
      return ok('scroll', { scrolled: dir, scrollY: window.scrollY, scrollX: window.scrollX });
    },
  },
  {
    name: 'scrollTo',
    description: 'Scroll a specific element into view.',
    context: 'content',
    handler: async (args) =>
      measure('scrollTo', args.id as string | undefined, async () => {
        const el = await resolveElement(asLocator(args.selector ?? args));
        scrollIntoView(el);
        const rect = el.getBoundingClientRect();
        await new Promise((r) => setTimeout(r, 150));
        return ok('scrollTo', { visible: isVisible(el), rect });
      }),
  },
  {
    name: 'wait',
    description: 'Pause for a number of milliseconds (or until a selector appears if given).',
    context: 'content',
    handler: async (args) => {
      const ms = (args.ms as number) ?? 1000;
      if (args.selector) {
        const found = await waitFor(() => {
          const el = document.querySelector(args.selector as string);
          return el && isVisible(el) ? el : null;
        }, ms);
        return ok('wait', { ms, selector: args.selector, found: !!found });
      }
      await new Promise((r) => setTimeout(r, ms));
      return ok('wait', { ms });
    },
  },
];

function describeMatch(el: HTMLElement) {
  const rect = el.getBoundingClientRect();
  return {
    tag: el.tagName.toLowerCase(),
    id: el.id || null,
    text: (el.innerText ?? el.textContent ?? '').trim().slice(0, 200),
    role: el.getAttribute('role'),
    ariaLabel: el.getAttribute('aria-label'),
    name: el.getAttribute('name'),
    visible: isVisible(el),
    rect: { x: Math.round(rect.x), y: Math.round(rect.y), w: Math.round(rect.width), h: Math.round(rect.height) },
  };
}
