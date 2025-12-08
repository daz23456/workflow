/**
 * list_workflows MCP tool implementation
 * Stage 15: MCP Server for External Workflow Consumption
 */

import type { ConsumerGatewayClient } from '../services/consumer-gateway-client.js';
import type {
  ListWorkflowsInput,
  ListWorkflowsResult,
  WorkflowSummary,
  GatewayWorkflowResponse
} from '../types.js';

/**
 * Generate a human-readable summary of required inputs
 */
function generateInputSummary(input?: Record<string, { type: string; required: boolean }>): string {
  if (!input || Object.keys(input).length === 0) {
    return 'No input required';
  }

  const requiredFields = Object.entries(input)
    .filter(([, spec]) => spec.required)
    .map(([name, spec]) => `${name} (${spec.type})`);

  return requiredFields.length > 0
    ? requiredFields.join(', ')
    : 'No required inputs';
}

/**
 * Convert gateway workflow response to workflow summary
 */
function toWorkflowSummary(workflow: GatewayWorkflowResponse): WorkflowSummary {
  return {
    name: workflow.name,
    description: workflow.description ?? '',
    categories: workflow.categories,
    tags: workflow.tags,
    inputSummary: generateInputSummary(workflow.input),
    taskCount: workflow.tasks?.length ?? 0
  };
}

/**
 * List workflows with optional filtering
 */
export async function listWorkflows(
  client: ConsumerGatewayClient,
  input: ListWorkflowsInput
): Promise<ListWorkflowsResult> {
  // Fetch all workflows from gateway
  const allWorkflows = await client.listWorkflows();
  const total = allWorkflows.length;

  // Apply filters
  let filtered = allWorkflows;

  // Filter by single category (legacy)
  if (input.category) {
    filtered = filtered.filter(wf =>
      wf.categories?.includes(input.category!) ?? false
    );
  }

  // Filter by multiple categories (OR logic - must have at least one)
  if (input.categories && input.categories.length > 0) {
    filtered = filtered.filter(wf =>
      input.categories!.some(cat => wf.categories?.includes(cat) ?? false)
    );
  }

  // Filter by tags (AND logic - must have all specified tags)
  if (input.tags && input.tags.length > 0) {
    filtered = filtered.filter(wf =>
      input.tags!.every(tag => wf.tags?.includes(tag) ?? false)
    );
  }

  // Filter by anyTags (OR logic - must have at least one specified tag)
  if (input.anyTags && input.anyTags.length > 0) {
    filtered = filtered.filter(wf =>
      input.anyTags!.some(tag => wf.tags?.includes(tag) ?? false)
    );
  }

  // Exclude workflows with specified tags
  if (input.excludeTags && input.excludeTags.length > 0) {
    filtered = filtered.filter(wf =>
      !input.excludeTags!.some(tag => wf.tags?.includes(tag) ?? false)
    );
  }

  // Convert to summaries
  const summaries = filtered.map(toWorkflowSummary);

  // Optionally include stats
  if (input.includeStats) {
    await Promise.all(
      summaries.map(async (summary) => {
        const stats = await client.getWorkflowStats(summary.name);
        if (stats) {
          summary.stats = {
            executions: stats.totalExecutions,
            avgDurationMs: stats.avgDurationMs,
            successRate: stats.successRate
          };
        }
      })
    );
  }

  return {
    workflows: summaries,
    total,
    filtered: filtered.length
  };
}
