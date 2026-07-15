import { registerTools } from './registry';
import { browserTools } from './browser';
import { navigationTools } from './navigation';
import { actionTools } from './actions';
import { inputTools } from './inputs';
import { readingTools } from './reading';
import { formTools } from './forms';
import { stateTools } from './state';
import { miscTools } from './misc';
import { visionTools } from './vision';
import { fileTools, makeBackgroundFileTools } from './files';

/** All content-context tool definitions (run inside the dashboard page). */
export const contentToolDefs = [
  ...navigationTools,
  ...actionTools,
  ...inputTools,
  ...readingTools,
  ...formTools,
  ...stateTools,
  ...miscTools,
  ...visionTools,
  ...fileTools, // upload only
];

/** Register only the DOM tools — called by the content script. */
export function registerContentTools(): void {
  registerTools(contentToolDefs);
}

/**
 * Register the full tool set — called by the background. The background needs
 * every def so the dispatcher can (a) run background tools directly and
 * (b) forward content tools to the active tab by name.
 */
export function registerAllTools(
  downloads: Map<string, { state: string; filename?: string; url: string }>,
): void {
  registerTools(contentToolDefs);
  registerTools(browserTools);
  registerTools(makeBackgroundFileTools(downloads));
}

export * from './types';
export * from './registry';
