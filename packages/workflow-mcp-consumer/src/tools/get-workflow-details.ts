/**
 * get_workflow_details MCP tool implementation
 * Stage 15: MCP Server for External Workflow Consumption
 */

import type { ConsumerGatewayClient } from '../services/consumer-gateway-client.js';
import type {
  GetWorkflowDetailsInput,
  WorkflowDetails,
  TaskSummary,
  WorkflowInputParameter
} from '../types.js';

/**
 * Get full workflow details including schema, examples, and tasks
 */
export async function getWorkflowDetails(
  client: ConsumerGatewayClient,
  input: GetWorkflowDetailsInput
): Promise<WorkflowDetails> {
  // Fetch workflow from gateway
  const workflow = await client.getWorkflow(input.name);

  // Convert tasks to summaries
  const tasks: TaskSummary[] = (workflow.tasks ?? []).map(task => ({
    id: task.id,
    description: task.description,
    dependencies: task.dependsOn ?? []
  }));

  // Build input schema
  const inputSchema: Record<string, WorkflowInputParameter> = {};
  if (workflow.input) {
    for (const [key, value] of Object.entries(workflow.input)) {
      inputSchema[key] = {
        type: value.type,
        required: value.required,
        description: value.description,
        default: value.default
      };
    }
  }

  // Try to get stats for estimated duration
  const stats = await client.getWorkflowStats(input.name);

  return {
    name: workflow.name,
    description: workflow.description ?? '',
    inputSchema,
    outputSchema: undefined, // Not yet exposed by gateway
    examples: workflow.examples ?? [],
    tasks,
    estimatedDurationMs: stats?.avgDurationMs,
    categories: workflow.categories,
    tags: workflow.tags
  };
}
