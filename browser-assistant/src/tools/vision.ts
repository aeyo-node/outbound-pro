import type { ToolDef } from './types';
import { asLocator } from './types';
import { ok, measure } from '@/lib/result';
import { resolveElement, scrollIntoView } from '@/lib/dom';

const highlightId = 'swaram-highlight-style';
function ensureHighlightStyle(): void {
  if (document.getElementById(highlightId)) return;
  const style = document.createElement('style');
  style.id = highlightId;
  style.textContent = `
    .swaram-hl { outline: 3px solid #FFD166 !important; outline-offset: 2px !important;
      box-shadow: 0 0 0 6px rgba(255,209,102,0.25) !important; transition: outline .15s ease !important; }
    .swaram-anno { position: fixed; z-index: 2147483647; background: #FFD166; color: #000;
      font: 600 12px/1.2 Inter, system-ui, sans-serif; padding: 3px 6px; border-radius: 6px;
      pointer-events: none; box-shadow: 0 2px 8px rgba(0,0,0,.4); }
  `;
  document.documentElement.appendChild(style);
}

/** Vision / annotation tools (content context). */
export const visionTools: ToolDef[] = [
  {
    name: 'highlight',
    description: 'Visually highlight one or more elements (useful before screenshotting). Pass `seconds` to auto-clear.',
    context: 'content',
    handler: async (args) =>
      measure('highlight', args.id as string | undefined, async () => {
        ensureHighlightStyle();
        const loc = asLocator(args.selector ?? args);
        const el = await resolveElement(loc);
        scrollIntoView(el);
        el.classList.add('swaram-hl');
        const seconds = (args.seconds as number) ?? 0;
        if (seconds > 0) {
          setTimeout(() => el.classList.remove('swaram-hl'), seconds * 1000);
        }
        const rect = el.getBoundingClientRect();
        return ok('highlight', { highlighted: true, rect });
      }),
  },
  {
    name: 'annotate',
    description: 'Place a floating text label near an element and highlight it.',
    context: 'content',
    args: { selector: { type: 'string' }, label: { type: 'string', required: true } },
    handler: async (args) =>
      measure('annotate', args.id as string | undefined, async () => {
        ensureHighlightStyle();
        const el = await resolveElement(asLocator(args.selector ?? args));
        scrollIntoView(el);
        el.classList.add('swaram-hl');
        const tag = document.createElement('div');
        tag.className = 'swaram-anno';
        tag.textContent = args.label as string;
        document.documentElement.appendChild(tag);
        const rect = el.getBoundingClientRect();
        tag.style.left = `${Math.max(8, rect.left)}px`;
        tag.style.top = `${Math.max(8, rect.top - 24)}px`;
        const seconds = (args.seconds as number) ?? 5;
        setTimeout(() => {
          tag.remove();
          el.classList.remove('swaram-hl');
        }, seconds * 1000);
        return ok('annotate', { annotated: true, rect });
      }),
  },
  {
    name: 'clearHighlights',
    description: 'Remove all Swaram highlights/annotations from the page.',
    context: 'content',
    handler: async (_args, ctx) =>
      measure('clearHighlights', ctx.id, async () => {
        document.querySelectorAll('.swaram-hl').forEach((e) => e.classList.remove('swaram-hl'));
        document.querySelectorAll('.swaram-anno').forEach((e) => e.remove());
        return ok('clearHighlights', { cleared: true });
      }),
  },
];
