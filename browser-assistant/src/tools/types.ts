import type { ToolArgs, ToolResponse } from '@/types/protocol';

/**
 * Tool definitions.
 *
 * A tool is a pure description (name, arg schema, where it runs) plus a handler
 * bound at runtime. Tools split into two execution contexts:
 *
 *   - `background`: runs in the service worker (login, ws, cookies, downloads,
 *     navigation of tabs). Has chrome.* APIs but no DOM.
 *   - `content`: runs in the dashboard page. Has DOM. Invoked by the background
 *     forwarding `executeTool` to the active tab's content script.
 *
 * The registry is generic — Swaram-specific helpers are registered alongside the
 * generic primitives under the same interface, so the backend LLM can chain
 * `openPage -> findButton -> click -> type -> submit` freely.
 */
export type ToolContext = 'background' | 'content';

export interface ToolDef {
  /** Canonical tool name, e.g. "click". */
  name: string;
  /** One-line description for the LLM / docs. */
  description: string;
  /** Where this tool executes. */
  context: ToolContext;
  /** JSON-schema-ish argument description (for docs + light validation). */
  args?: Record<string, ArgSpec>;
  /** Handler. Receives args + a context object with helpers. */
  handler: (args: ToolArgs, ctx: ToolHandlerCtx) => Promise<ToolResponse>;
}

export interface ArgSpec {
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  description?: string;
  required?: boolean;
  default?: unknown;
  enum?: string[];
}

/** Helpers passed into every tool handler. */
export interface ToolHandlerCtx {
  /** Run a sibling tool by name (lets helpers compose primitives). */
  run: (tool: string, args: ToolArgs) => Promise<ToolResponse>;
  /** The active tab id the background is targeting. */
  tabId?: number;
  /** Correlation id from the execute command. */
  id?: string;
  /** The original execute args, for trace context. */
  traceId?: string;
}

/**
 * Selector spec — most DOM tools accept either a CSS selector, or a structured
 * locator object for resilient element finding (text / aria / xpath / role).
 */
export type Locator =
  | string
  | {
      selector?: string;
      text?: string;
      role?: string;
      name?: string;
      ariaLabel?: string;
      xpath?: string;
      /** 0-based index if multiple matches. */
      index?: number;
      /** max ms to wait for the element to appear. */
      timeout?: number;
    };

export function asLocator(v: unknown): Locator {
  if (typeof v === 'string') return v;
  if (v && typeof v === 'object') return v as Locator;
  throw new Error('Expected a selector string or locator object');
}

export function locatorToString(l: Locator): string {
  if (typeof l === 'string') return l;
  return l.text ?? l.ariaLabel ?? l.xpath ?? l.selector ?? l.role ?? '<locator>';
}
