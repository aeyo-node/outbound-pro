import type { Locator } from '@/tools/types';

/**
 * DOM resolution engine — the resilient core of error recovery.
 *
 * Given a Locator (CSS string OR a structured object), find the target element
 * using a cascade of strategies:
 *
 *   1. CSS selector (explicit `selector` or a bare string)
 *   2. [aria-label], [role], name attribute
 *   3. Visible text match (buttons, links, labels, any element)
 *   4. XPath
 *
 * If the first strategy fails, the next is tried automatically — so a `click`
 * that names a button by text still works even if the LLM guessed the selector
 * wrong. This is what makes the tools "AI friendly": the agent does not need to
 * know exact selectors.
 */

const DEFAULT_TIMEOUT = 5000;

function wait(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/** Wait for `predicate` to return truthy, polling every ~100ms up to `timeout`. */
export async function waitFor<T>(
  predicate: () => T | null | undefined,
  timeout = DEFAULT_TIMEOUT,
  interval = 100,
): Promise<T | null> {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const v = predicate();
    if (v) return v;
    await wait(interval);
  }
  return null;
}

export function isVisible(el: Element): boolean {
  if (!(el instanceof HTMLElement)) return false;
  if (el.getAttribute('hidden') !== null) return false;
  const style = window.getComputedStyle(el);
  if (style.display === 'none' || style.visibility === 'hidden') return false;
  if (parseFloat(style.opacity) === 0) return false;
  const rect = el.getBoundingClientRect();
  if (rect.width === 0 && rect.height === 0) return false;
  return true;
}

export function isEnabled(el: Element): boolean {
  if (!(el instanceof HTMLElement)) return false;
  if (el instanceof HTMLButtonElement || el instanceof HTMLInputElement || el instanceof HTMLSelectElement) {
    return !el.disabled;
  }
  if (el.getAttribute('aria-disabled') === 'true') return false;
  return true;
}

/** Normalize whitespace for text comparison. */
function norm(s: string | null | undefined): string {
  return (s ?? '').trim().replace(/\s+/g, ' ').toLowerCase();
}

function findByCss(selector: string, index = 0): Element | null {
  const all = document.querySelectorAll(selector);
  const arr = Array.from(all).filter(isVisible);
  const target = arr[index] ?? all[index];
  return target ?? null;
}

function findByText(text: string, index = 0): Element | null {
  const target = norm(text);
  const candidates = Array.from(
    document.querySelectorAll<HTMLElement>(
      'button, a, [role="button"], [role="link"], [role="menuitem"], label, span, div, li, summary, input[type="button"], input[type="submit"]',
    ),
  ).filter((el) => isVisible(el));
  let matchIndex = 0;
  for (const el of candidates) {
    const own = norm(el.innerText ?? el.textContent ?? '');
    const aria = norm(el.getAttribute('aria-label'));
    const title = norm(el.getAttribute('title'));
    const value = norm(el.getAttribute('value'));
    const haystacks = [own, aria, title, value];
    if (haystacks.some((h) => h === target || (target.length > 3 && h.includes(target)))) {
      if (matchIndex === index) return el;
      matchIndex++;
    }
  }
  return null;
}

function findByAria(label: string, index = 0): Element | null {
  const target = norm(label);
  const els = Array.from(
    document.querySelectorAll<HTMLElement>('[aria-label], [aria-labelledby], [title]'),
  ).filter(isVisible);
  let matchIndex = 0;
  for (const el of els) {
    const aria = norm(el.getAttribute('aria-label'));
    const title = norm(el.getAttribute('title'));
    if (aria === target || title === target || aria.includes(target)) {
      if (matchIndex === index) return el;
      matchIndex++;
    }
  }
  return null;
}

function findByRole(role: string, name?: string, index = 0): Element | null {
  const els = Array.from(
    document.querySelectorAll<HTMLElement>(`[role="${role}"], ${role}`),
  ).filter(isVisible);
  const target = name ? norm(name) : null;
  let matchIndex = 0;
  for (const el of els) {
    if (target) {
      const txt = norm(el.innerText ?? el.textContent ?? el.getAttribute('aria-label'));
      if (txt !== target && !txt.includes(target)) continue;
    }
    if (matchIndex === index) return el;
    matchIndex++;
  }
  return null;
}

function findByXPath(xpath: string): Element | null {
  const res = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
  const node = res.singleNodeValue;
  return node instanceof Element ? node : null;
}

/**
 * Resolve a Locator to a live element, waiting up to `timeout` and cascading
 * through strategies. Throws a descriptive Error (caught by `measure`) if none
 * match — the caller attaches a screenshot.
 */
export async function resolveElement(locator: Locator): Promise<HTMLElement> {
  const loc = typeof locator === 'string' ? { selector: locator } : locator;
  const timeout = loc.timeout ?? DEFAULT_TIMEOUT;
  const index = loc.index ?? 0;

  const tryAll = (): Element | null => {
    if (loc.xpath) return findByXPath(loc.xpath);
    if (loc.selector) {
      const el = findByCss(loc.selector, index);
      if (el) return el;
    }
    if (loc.ariaLabel) {
      const el = findByAria(loc.ariaLabel, index);
      if (el) return el;
    }
    if (loc.role) {
      const el = findByRole(loc.role, loc.name, index);
      if (el) return el;
    }
    if (loc.text) {
      const el = findByText(loc.text, index);
      if (el) return el;
    }
    if (loc.name) {
      const el = document.querySelector<HTMLElement>(`[name="${CSS.escape(loc.name)}"]`);
      if (el && isVisible(el)) return el;
    }
    return null;
  };

  const el = await waitFor(tryAll, timeout);
  if (!el) {
    const described = JSON.stringify(loc);
    throw new Error(`Element not found: ${described}`);
  }
  return el as HTMLElement;
}

/** Find a form control by its associated <label> text or placeholder/name. */
export async function findInput(label: string, timeout = DEFAULT_TIMEOUT): Promise<HTMLElement> {
  const target = norm(label);
  const tryAll = (): HTMLElement | null => {
    // 1. <label for="id"> text
    const labels = Array.from(document.querySelectorAll<HTMLLabelElement>('label'));
    for (const lab of labels) {
      if (norm(lab.innerText ?? lab.textContent).includes(target)) {
        const forId = lab.getAttribute('for');
        if (forId) {
          const ctl = document.getElementById(forId);
          if (ctl instanceof HTMLElement) return ctl;
        }
        // nested control
        const ctl = lab.querySelector<HTMLElement>('input, select, textarea');
        if (ctl) return ctl;
      }
    }
    // 2. placeholder
    const byPlaceholder = Array.from(
      document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('input, textarea'),
    ).find((el) => isVisible(el) && norm(el.getAttribute('placeholder')).includes(target));
    if (byPlaceholder) return byPlaceholder;
    // 3. aria-label
    const byAria = Array.from(document.querySelectorAll<HTMLElement>('[aria-label]')).find(
      (el) => isVisible(el) && norm(el.getAttribute('aria-label')).includes(target),
    );
    if (byAria) return byAria;
    // 4. name attribute
    const byName = document.querySelector<HTMLElement>(`[name="${CSS.escape(label)}"]`);
    if (byName && isVisible(byName)) return byName;
    return null;
  };
  const el = await waitFor(tryAll, timeout);
  if (!el) throw new Error(`Input not found for label: ${label}`);
  return el;
}

export function scrollIntoView(el: Element): void {
  el.scrollIntoView({ behavior: 'auto', block: 'center', inline: 'center' });
}

/** Human-ish input: focus, clear, set value, dispatch events React listens to. */
export function setNativeValue(el: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement, value: string): void {
  const proto = el instanceof HTMLSelectElement ? HTMLSelectElement.prototype : el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
  if (setter) setter.call(el, value);
  else (el as HTMLInputElement).value = value;
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
}

/** Simulate typing character-by-character (for keydown/keyup listeners). */
export async function typeInto(el: HTMLElement, text: string, delay = 10): Promise<void> {
  el.focus();
  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
    setNativeValue(el, text);
  }
  for (const ch of text) {
    el.dispatchEvent(new KeyboardEvent('keydown', { key: ch, bubbles: true }));
    el.dispatchEvent(new KeyboardEvent('keypress', { key: ch, bubbles: true }));
    el.dispatchEvent(new KeyboardEvent('keyup', { key: ch, bubbles: true }));
    if (delay) await wait(delay);
  }
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
}

export async function clickEl(el: HTMLElement): Promise<void> {
  scrollIntoView(el);
  el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
  el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
  el.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
  el.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
  el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
}
