import type { ToolDef, ToolHandlerCtx } from './types';
import type { ToolArgs, ToolResponse } from '@/types/protocol';
import { fail } from '@/lib/result';
import { log } from '@/lib/logger';

/**
 * Global tool registry. Both generic primitives and Swaram helpers register
 * here. The background dispatcher looks tools up by name and routes execution
 * to the right context (background runs directly; content tools are forwarded
 * to the active tab).
 */
const tools = new Map<string, ToolDef>();

export function registerTool(def: ToolDef): void {
  if (tools.has(def.name)) {
    log.warn(`Tool "${def.name}" is being overwritten`);
  }
  tools.set(def.name, def);
}

export function registerTools(defs: ToolDef[]): void {
  for (const d of defs) registerTool(d);
}

export function getTool(name: string): ToolDef | undefined {
  return tools.get(name);
}

export function listTools(): ToolDef[] {
  return Array.from(tools.values());
}

export function listToolNames(): string[] {
  return Array.from(tools.keys());
}

/** Execute a registered tool by name, with full envelope handling. */
export async function executeTool(
  name: string,
  args: ToolArgs,
  ctx: ToolHandlerCtx,
): Promise<ToolResponse> {
  const def = tools.get(name);
  if (!def) {
    return fail(name, `Unknown tool: ${name}`, { code: 'unknown_tool' });
  }
  log.debug(`▶ ${name} ${JSON.stringify(args).slice(0, 200)}`);
  const result = await def.handler(args, ctx);
  log.debug(`◀ ${name} success=${result.success} time=${result.time}`);
  return result;
}

/** Validate required args against the tool's arg spec (light). */
export function validateArgs(name: string, args: ToolArgs): string | null {
  const def = tools.get(name);
  if (!def?.args) return null;
  for (const [key, spec] of Object.entries(def.args)) {
    if (spec.required && (args[key] === undefined || args[key] === null)) {
      return `Missing required argument: ${key}`;
    }
  }
  return null;
}
