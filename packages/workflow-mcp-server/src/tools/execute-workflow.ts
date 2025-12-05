import type { GatewayClient } from '../services/gateway-client.js';
import type { ExecuteWorkflowParams, ExecuteWorkflowResult } from '../types/index.js';

/**
 * Execute a deployed workflow with actual input
 * Returns execution results with task-level details
 */
export async function executeWorkflow(
  client: GatewayClient,
  params: ExecuteWorkflowParams
): Promise<ExecuteWorkflowResult> {
  const { workflowName, input } = params;

  if (!workflowName || workflowName.trim() === '') {
    throw new Error('Workflow name is required');
  }

  try {
    const result = await client.executeWorkflow(workflowName, input);
    return result;
  } catch (error) {
    if (error instanceof Error) {
      // Re-throw specific errors (like "Workflow not found")
      throw error;
    }
    throw new Error('Unknown error during workflow execution');
  }
}
