import type { ToolResponse } from '@/types/protocol';

/**
 * Helpers for building the standard tool response envelope.
 *
 * Every tool MUST return a ToolResponse — never plain text, never a thrown
 * exception that escapes unstructured. These factories keep the shape uniform.
 */

export function ok<T>(tool: string, data: T, opts: { time?: number; screenshot?: string; id?: string } = {}): ToolResponse<T> {
  return {
    success: true,
    tool,
    time: opts.time ?? 0,
    data,
    ...(opts.screenshot ? { screenshot: opts.screenshot } : {}),
    ...(opts.id ? { id: opts.id } : {}),
  };
}

export function fail(
  tool: string,
  reason: string,
  opts: { code?: string; screenshot?: string; id?: string; trace?: string; time?: number } = {},
): ToolResponse {
  return {
    success: false,
    tool,
    time: opts.time ?? 0,
    reason,
    ...(opts.code ? { code: opts.code } : {}),
    ...(opts.screenshot ? { screenshot: opts.screenshot } : {}),
    ...(opts.id ? { id: opts.id } : {}),
    ...(opts.trace ? { trace: opts.trace } : {}),
  };
}

/**
 * Wrap an async tool body so it ALWAYS resolves to a ToolResponse.
 * Duration is measured, exceptions are converted to `fail()`.
 */
export async function measure<T>(
  tool: string,
  id: string | undefined,
  fn: () => Promise<T>,
  onFailScreenshot?: () => Promise<string | undefined>,
): Promise<ToolResponse<T>> {
  const start = now();
  try {
    const data = await fn();
    return ok(tool, data, { time: elapsed(start), id }) as ToolResponse<T>;
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    const trace = err instanceof Error ? err.stack ?? err.message : String(err);
    let screenshot: string | undefined;
    try {
      if (onFailScreenshot) screenshot = await onFailScreenshot();
    } catch {
      /* ignore screenshot failures */
    }
    return fail(tool, reason, { trace, screenshot, id, time: elapsed(start) }) as ToolResponse<T>;
  }
}

/** Performance.now where available, else Date.now fallback. */
function now(): number {
  return typeof performance !== 'undefined' ? performance.now() : Date.now();
}
function elapsed(start: number): number {
  return Math.round(now() - start);
}
