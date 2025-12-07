import type { GatewayClient } from '../services/gateway-client.js';
import type { DryRunWorkflowParams, DryRunResult } from '../types/index.js';
/**
 * Dry-run a workflow with sample input (no actual HTTP calls)
 * Returns the execution plan with resolved templates
 */
export declare function dryRunWorkflow(client: GatewayClient, params: DryRunWorkflowParams): Promise<DryRunResult>;
//# sourceMappingURL=dry-run-workflow.d.ts.map