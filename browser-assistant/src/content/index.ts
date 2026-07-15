import type { RuntimeMessage, ToolArgs, ToolResponse } from '@/types/protocol';
import { registerContentTools, executeTool } from '@/tools';
import { isRuntimeMessage } from '@/lib/messaging';
import { log } from '@/lib/logger';
import { withFailureScreenshot } from './error-recovery';

/**
 * Content script entry. Injected into every page at document_idle.
 *
 * Responsibilities:
 *  - Register the DOM tool set
 *  - Answer `executeTool` messages from the background by running the tool in
 *    the page context and returning a ToolResponse
 *  - Provide a local `run` so helper tools (fillForm, submit, swaram.*) can
 *    compose primitives without a round-trip
 */

registerContentTools();

const CONTENT_TAB_ID = typeof chrome !== 'undefined' && chrome.runtime?.id ? chrome.runtime.id : 'content';

/** Local execution with composable `run` (helpers can call other tools). */
async function runLocal(tool: string, args: ToolArgs): Promise<ToolResponse> {
  const result = await executeTool(tool, args, { run: runLocal });
  return withFailureScreenshot(result);
}

chrome.runtime.onMessage.addListener((message: unknown, _sender, sendResponse) => {
  if (!isRuntimeMessage(message, 'executeTool')) return false;
  const msg = message as RuntimeMessage<{ tool: string; args: ToolArgs }>;
  const { tool, args } = msg.payload ?? { tool: '', args: {} };
  runLocal(tool, args)
    .then((result) => sendResponse(result))
    .catch((err) => {
      const res: ToolResponse = {
        success: false,
        tool,
        time: 0,
        reason: err instanceof Error ? err.message : String(err),
      };
      sendResponse(withFailureScreenshot(res));
    });
  return true; // keep channel open for async response
});

// Signal readiness to the background (used for first-install injection).
chrome.runtime.sendMessage({ type: 'notify', payload: { event: 'content_ready', url: location.href } }).catch(() => {});

log.debug(`content script ready on ${location.href}`);
export { CONTENT_TAB_ID };
