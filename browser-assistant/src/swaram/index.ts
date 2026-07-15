import { registerTools } from '@/tools/registry';
import { swaramNavTools } from './nav';
import { swaramAuthTools } from './auth';
import { swaramCallTools } from './calls';
import { swaramCampaignTools } from './campaigns';
import { swaramMonitorTools, captureMonitor } from './monitor';

/**
 * Swaram dashboard helpers.
 *
 * Register the Swaram-specific tools alongside the generic primitives. The
 * backend LLM can chain these with the generic tools freely. The architecture
 * stays generic: to support a new customer dashboard, add a new module under
 * src/<vendor>/ exporting ToolDef[] and register it here — no core changes.
 */
export function registerSwaramTools(): void {
  registerTools(swaramNavTools);
  registerTools(swaramAuthTools);
  registerTools(swaramCallTools);
  registerTools(swaramCampaignTools);
  registerTools(swaramMonitorTools);
}

export { captureMonitor };
export type { MonitorSnapshot } from './monitor';
