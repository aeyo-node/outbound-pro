import type {
  ExecuteCommand,
  ToolArgs,
  ToolResponse,
  ServerMessage,
  ResponseMessage,
} from '@/types/protocol';
import { executeTool, getTool, validateArgs } from '@/tools';
import type { ToolHandlerCtx } from '@/tools/types';
import { fail, ok } from '@/lib/result';
import { log, setTraceId } from '@/lib/logger';
import { sendTabMessage } from '@/lib/messaging';
import { recordAction } from './action-history';
import { patchState } from './state';
import { randomId } from '@/lib/crypto';

/**
 * Dispatcher: turns an `execute` command into a tool run.
 *
 * Routing:
 *  - background tools: run in this service worker via executeTool()
 *  - content tools: forward to the active tab's content script
 *
 * The ctx.run passed to background tools lets them compose OTHER tools (e.g.
 * login() calls openPage + type + submit); those nested calls are themselves
 * routed correctly by `runTool`.
 */

export interface DispatcherOpts {
  wsSend: (msg: ResponseMessage) => void;
  downloads: Map<string, { state: string; filename?: string; url: string }>;
}

export class Dispatcher {
  private inFlight = new Map<string, { cancelled: boolean }>();
  private readonly wsSend: (msg: ResponseMessage) => void;

  constructor(opts: DispatcherOpts) {
    this.wsSend = opts.wsSend;
  }

  async handle(cmd: ServerMessage): Promise<void> {
    if (cmd.type === 'execute') return this.execute(cmd);
    if (cmd.type === 'cancel') return this.cancel(cmd.id);
  }

  async execute(cmd: ExecuteCommand): Promise<void> {
    setTraceId(cmd.traceId);
    const { id, tool, args } = cmd;
    this.inFlight.set(id, { cancelled: false });

    const validation = validateArgs(tool, args);
    if (validation) {
      return this.finish(id, fail(tool, validation, { code: 'bad_args', id }));
    }

    const def = getTool(tool);
    if (!def) {
      return this.finish(id, fail(tool, `Unknown tool: ${tool}`, { code: 'unknown_tool', id }));
    }

    const ctx: ToolHandlerCtx = {
      run: (t, a) => this.runTool(t, a, id),
      id,
      traceId: cmd.traceId,
    };

    let result: ToolResponse;
    const start = Date.now();
    try {
      if (def.context === 'background') {
        result = await executeTool(tool, args, ctx);
      } else {
        result = await this.runContentTool(tool, args, id, cmd.timeout);
      }
    } catch (e) {
      const reason = e instanceof Error ? e.message : String(e);
      result = fail(tool, reason, { code: 'exception', id });
    }

    // Attach screenshot on failure if the tool didn't provide one.
    if (!result.success && !result.screenshot) {
      const shot = await this.captureScreenshot().catch(() => undefined);
      if (shot) result = { ...result, screenshot: shot };
    }

    result.time = Date.now() - start;
    await this.finish(id, result);
  }

  async cancel(id: string): Promise<void> {
    const entry = this.inFlight.get(id);
    if (entry) entry.cancelled = true;
    log.info(`cancel requested for ${id}`);
  }

  /**
   * Run a tool locally (not from the backend) — used by the popup's Login /
   * Reconnect / Screenshot buttons and by the session keep-alive loop. Does
   * not emit a WS response; returns the ToolResponse to the caller.
   */
  async executeLocal(tool: string, args: ToolArgs): Promise<ToolResponse> {
    const def = getTool(tool);
    if (!def) return fail(tool, `Unknown tool: ${tool}`, { code: 'unknown_tool' });
    const ctx: ToolHandlerCtx = { run: (t, a) => this.runTool(t, a, undefined) };
    if (def.context === 'background') return executeTool(tool, args, ctx);
    return this.runContentTool(tool, args, undefined, 30000);
  }

  /** Run a single tool (used by ctx.run composition). */
  private async runTool(tool: string, args: ToolArgs, parentId: string | undefined): Promise<ToolResponse> {
    const def = getTool(tool);
    if (!def) return fail(tool, `Unknown tool: ${tool}`, { code: 'unknown_tool', ...(parentId ? { id: parentId } : {}) });
    const ctx: ToolHandlerCtx = { run: (t, a) => this.runTool(t, a, parentId), id: parentId };
    if (def.context === 'background') {
      return executeTool(tool, args, ctx);
    }
    return this.runContentTool(tool, args, parentId, 30000);
  }

  /** Forward a content tool to the active tab and await its ToolResponse. */
  private async runContentTool(
    tool: string,
    args: ToolArgs,
    id: string | undefined,
    timeout: number | undefined,
  ): Promise<ToolResponse> {
    const tab = await this.activeTab();
    if (!tab) return fail(tool, 'No active tab to run content tool', { code: 'no_tab', id });

    // Ensure content script is present (inject if missing).
    await this.ensureContentScript(tab.id!);

    const ac = new AbortController();
    const to = setTimeout(() => ac.abort(), timeout ?? 30_000);
    try {
      const result = await sendTabMessage<ToolArgs, ToolResponse>(tab.id!, {
        type: 'executeTool',
        id,
        payload: { tool, args },
      });
      if (!result) return fail(tool, 'Content script returned no response', { id });
      // Content may request a screenshot via marker.
      if (result.screenshot === '__REQUEST_BG__') {
        delete result.screenshot;
        if (!result.success) {
          const shot = await this.captureScreenshot().catch(() => undefined);
          if (shot) result.screenshot = shot;
        }
      }
      return result;
    } catch (e) {
      const reason = e instanceof Error ? e.message : String(e);
      return fail(tool, `Content tool error: ${reason}`, { code: 'content_error', id });
    } finally {
      clearTimeout(to);
    }
  }

  private async activeTab(): Promise<chrome.tabs.Tab | null> {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    return tab ?? null;
  }

  private async ensureContentScript(tabId: number): Promise<void> {
    try {
      const file = chrome.runtime.getManifest().content_scripts?.[0]?.js?.[0];
      if (!file) return;
      await chrome.scripting.executeScript({
        target: { tabId },
        files: [file],
      });
    } catch {
      // Will fail on chrome:// pages etc. — the subsequent sendMessage will
      // surface a clearer error to the caller.
    }
  }

  private async captureScreenshot(): Promise<string | undefined> {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.windowId) return undefined;
      return await chrome.tabs.captureVisibleTab(tab.windowId, { format: 'png' });
    } catch (e) {
      log.debug(`screenshot capture failed: ${(e as Error).message}`);
      return undefined;
    }
  }

  private async finish(id: string, result: ToolResponse): Promise<void> {
    setTraceId(undefined);
    const entry = this.inFlight.get(id);
    if (entry?.cancelled) {
      result = { ...result, cancelled: true };
    }
    this.inFlight.delete(id);

    const entry2: import('@/types/protocol').ActionHistoryEntry = {
      id,
      ts: Date.now(),
      tool: result.tool,
      args: {},
      duration: result.time,
      success: result.success,
      reason: result.reason,
      screenshot: result.screenshot,
    };
    recordAction(entry2);
    await patchState({
      lastAction: `${result.tool} → ${result.success ? 'ok' : 'fail'}`,
      lastError: result.success ? null : result.reason ?? null,
    });

    const msg: ResponseMessage = { type: 'response', id, result };
    this.wsSend(msg);
  }
}

export { ok, fail, randomId };
