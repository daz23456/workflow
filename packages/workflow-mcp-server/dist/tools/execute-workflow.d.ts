import type { GatewayClient } from '../services/gateway-client.js';
import type { ExecuteWorkflowParams, ExecuteWorkflowResult } from '../types/index.js';
/**
 * Execute a deployed workflow with actual input
 * Returns execution results with task-level details
 */
export declare function executeWorkflow(client: GatewayClient, params: ExecuteWorkflowParams): Promise<ExecuteWorkflowResult>;
//# sourceMappingURL=execute-workflow.d.ts.map