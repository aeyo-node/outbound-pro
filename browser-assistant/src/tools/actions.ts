import type { ToolDef } from './types';
import { asLocator } from './types';
import { ok, measure } from '@/lib/result';
import { clickEl, resolveElement, scrollIntoView, isVisible } from '@/lib/dom';

/** Pointer/interaction tools (content context). */
export const actionTools: ToolDef[] = [
  {
    name: 'click',
    description: 'Click an element. Accepts a locator; retries via text/aria/xpath if the selector misses.',
    context: 'content',
    handler: async (args, ctx) =>
      measure(
        'click',
        args.id as string | undefined,
        async () => {
          const el = await resolveElement(asLocator(args.selector ?? args));
          // If it looks like a submit button inside a form, prefer a real .click()
          scrollIntoView(el);
          await clickEl(el);
          await settle();
          return ok('click', { clicked: true, tag: el.tagName.toLowerCase(), text: (el.innerText ?? '').slice(0, 120) }, { id: ctx.id });
        },
        async () => captureLocalScreenshot(),
      ),
  },
  {
    name: 'doubleClick',
    description: 'Double-click an element.',
    context: 'content',
    handler: async (args) =>
      measure('doubleClick', args.id as string | undefined, async () => {
        const el = await resolveElement(asLocator(args.selector ?? args));
        scrollIntoView(el);
        el.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
        await settle();
        return ok('doubleClick', { clicked: true });
      }),
  },
  {
    name: 'rightClick',
    description: 'Right-click (context click) an element.',
    context: 'content',
    handler: async (args) =>
      measure('rightClick', args.id as string | undefined, async () => {
        const el = await resolveElement(asLocator(args.selector ?? args));
        scrollIntoView(el);
        el.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, button: 2 }));
        await settle();
        return ok('rightClick', { clicked: true });
      }),
  },
  {
    name: 'hover',
    description: 'Hover (mouse over) an element to trigger menus/tooltips.',
    context: 'content',
    handler: async (args) =>
      measure('hover', args.id as string | undefined, async () => {
        const el = await resolveElement(asLocator(args.selector ?? args));
        scrollIntoView(el);
        el.dispatchEvent(new PointerEvent('pointerenter', { bubbles: true }));
        el.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
        el.dispatchEvent(new MouseEvent('mousemove', { bubbles: true }));
        await settle();
        return ok('hover', { hovered: true });
      }),
  },
  {
    name: 'focus',
    description: 'Focus an element.',
    context: 'content',
    handler: async (args) =>
      measure('focus', args.id as string | undefined, async () => {
        const el = await resolveElement(asLocator(args.selector ?? args));
        (el as HTMLElement).focus();
        return ok('focus', { focused: true });
      }),
  },
  {
    name: 'blur',
    description: 'Remove focus from an element.',
    context: 'content',
    handler: async (args) =>
      measure('blur', args.id as string | undefined, async () => {
        const el = await resolveElement(asLocator(args.selector ?? args));
        (el as HTMLElement).blur();
        return ok('blur', { blurred: true });
      }),
  },
];

/** Brief pause to let SPA routers / animations settle after a click. */
function settle(): Promise<void> {
  return new Promise((r) => setTimeout(r, 250));
}

/**
 * Content-side screenshot fallback. The full-page capture happens in the
 * background via chrome.tabs.captureVisibleTab; here we return null and let the
 * background attach the real screenshot on failure. This keeps content scripts
 * free of the debugger permission.
 */
async function captureLocalScreenshot(): Promise<string | undefined> {
  return undefined;
}

export { isVisible };
