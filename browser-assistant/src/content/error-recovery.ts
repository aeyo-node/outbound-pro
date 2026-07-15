import type { ToolArgs, ToolResponse } from '@/types/protocol';
import { fail, ok } from '@/lib/result';
import { resolveElement, findInput } from '@/lib/dom';
import { log } from '@/lib/logger';

/**
 * Error recovery layer.
 *
 * When a primary action fails (e.g. click on a guessed CSS selector), the
 * executor retries through a cascade of alternative locators before giving up.
 * This is the "never silently fail" guarantee: we try text search, ARIA,
 * XPath, and role-based lookup, and only return failure (with a screenshot
 * request) after all strategies are exhausted.
 */

export interface RecoveryAttempt {
  strategy: string;
  args: ToolArgs;
}

/**
 * Given the original args of a click/scroll/etc. that failed, produce a list of
 * alternative resolution strategies to try in order.
 */
export function buildRecoveryPlan(_tool: string, args: ToolArgs): RecoveryAttempt[] {
  const text = args.text as string | undefined;
  const aria = args.ariaLabel as string | undefined;
  const role = args.role as string | undefined;
  const name = args.name as string | undefined;
  const plans: RecoveryAttempt[] = [];
  if (text) plans.push({ strategy: 'text', args: { ...args, text } });
  if (aria) plans.push({ strategy: 'aria', args: { ...args, ariaLabel: aria } });
  if (role) plans.push({ strategy: 'role', args: { ...args, role } });
  if (name) plans.push({ strategy: 'name', args: { ...args, name } });
  if (text) plans.push({ strategy: 'xpath', args: { ...args, xpath: `//*[contains(translate(text(),'ABCDEFGHIJKLMNOPQRSTUVWXYZ','abcdefghijklmnopqrstuvwxyz'),"${text.toLowerCase()}")]` } });
  return plans;
}

/**
 * Resolve an element using the full recovery cascade. Returns the element or
 * null. Used by the executor before issuing the actual action.
 */
export async function resolveWithRecovery(
  args: ToolArgs,
  primarySelector: unknown,
): Promise<HTMLElement | null> {
  // 1. Primary selector
  if (primarySelector) {
    try {
      return await resolveElement(primarySelector as string);
    } catch {
      log.debug('primary selector missed, trying recovery');
    }
  }
  // 2. label-based (for inputs)
  if (args.label) {
    try {
      return await findInput(args.label as string, 1500);
    } catch {
      /* next */
    }
  }
  // 3. cascade
  const plan = buildRecoveryPlan('resolve', args);
  for (const attempt of plan) {
    try {
      const el = await resolveElement(attempt.args as any);
      if (el) {
        log.info(`recovery succeeded via ${attempt.strategy}`);
        return el;
      }
    } catch {
      /* next */
    }
  }
  return null;
}

/** Wrap a content-tool result: if it failed, attach a screenshot request flag. */
export function withFailureScreenshot(res: ToolResponse): ToolResponse {
  if (!res.success && !res.screenshot) {
    return { ...res, screenshot: '__REQUEST_BG__' };
  }
  return res;
}

export { fail, ok };
