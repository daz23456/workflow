/**
 * search_workflows MCP tool implementation
 * Stage 15: MCP Server for External Workflow Consumption
 */

import type { ConsumerGatewayClient } from '../services/consumer-gateway-client.js';
import type {
  SearchWorkflowsInput,
  SearchWorkflowsResult,
  SearchMatch,
  GatewayWorkflowResponse
} from '../types.js';

/**
 * Calculate confidence score for a workflow match
 */
function calculateConfidence(workflow: GatewayWorkflowResponse, query: string): number {
  const queryLower = query.toLowerCase();
  const nameLower = workflow.name.toLowerCase();
  const descLower = (workflow.description ?? '').toLowerCase();

  // Exact name match - highest confidence
  if (nameLower === queryLower) {
    return 1.0;
  }

  // Name contains query
  if (nameLower.includes(queryLower)) {
    return 0.9;
  }

  // Query contains workflow name
  if (queryLower.includes(nameLower)) {
    return 0.85;
  }

  // Description contains query words
  const queryWords = queryLower.split(/\s+/).filter(w => w.length > 2);
  const matchingWords = queryWords.filter(word =>
    nameLower.includes(word) || descLower.includes(word)
  );

  if (matchingWords.length > 0) {
    return 0.5 + (0.3 * matchingWords.length / queryWords.length);
  }

  // Category/tag match
  const categories = workflow.categories ?? [];
  const tags = workflow.tags ?? [];
  if (categories.some(c => c.toLowerCase().includes(queryLower)) ||
      tags.some(t => t.toLowerCase().includes(queryLower))) {
    return 0.6;
  }

  return 0;
}

/**
 * Generate match reason based on what matched
 */
function generateMatchReason(workflow: GatewayWorkflowResponse, query: string): string {
  const queryLower = query.toLowerCase();
  const nameLower = workflow.name.toLowerCase();
  const descLower = (workflow.description ?? '').toLowerCase();

  if (nameLower === queryLower) {
    return 'Exact name match';
  }
  if (nameLower.includes(queryLower)) {
    return `Name contains '${query}'`;
  }
  if (descLower.includes(queryLower)) {
    return `Description matches '${query}'`;
  }

  const queryWords = queryLower.split(/\s+/).filter(w => w.length > 2);
  const matchingWords = queryWords.filter(word =>
    nameLower.includes(word) || descLower.includes(word)
  );
  if (matchingWords.length > 0) {
    return `Matches keywords: ${matchingWords.join(', ')}`;
  }

  return 'Partial match';
}

/**
 * Get required input field names
 */
function getRequiredInputs(workflow: GatewayWorkflowResponse): string[] {
  if (!workflow.input) return [];
  return Object.entries(workflow.input)
    .filter(([, spec]) => spec.required)
    .map(([name]) => name);
}

/**
 * Extract matching inputs from context
 */
function extractInputsFromContext(
  workflow: GatewayWorkflowResponse,
  context?: Record<string, unknown>
): Record<string, unknown> {
  if (!context || !workflow.input) return {};

  const extracted: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(context)) {
    if (key in workflow.input) {
      extracted[key] = value;
    }
  }
  return extracted;
}

/**
 * Determine missing required inputs
 */
function getMissingInputs(
  workflow: GatewayWorkflowResponse,
  providedInputs: Record<string, unknown>
): string[] {
  const required = getRequiredInputs(workflow);
  return required.filter(field => !(field in providedInputs));
}

/**
 * Search workflows by query with optional auto-execute mode
 */
export async function searchWorkflows(
  client: ConsumerGatewayClient,
  input: SearchWorkflowsInput
): Promise<SearchWorkflowsResult> {
  // Fetch all workflows
  const allWorkflows = await client.listWorkflows();

  // Score and filter workflows
  const scored = allWorkflows
    .map(wf => ({
      workflow: wf,
      confidence: calculateConfidence(wf, input.query)
    }))
    .filter(item => item.confidence > 0)
    .sort((a, b) => b.confidence - a.confidence);

  // Convert to search matches
  const matches: SearchMatch[] = scored.map(item => ({
    workflow: item.workflow.name,
    confidence: item.confidence,
    matchReason: generateMatchReason(item.workflow, input.query),
    requiredInputs: getRequiredInputs(item.workflow)
  }));

  const result: SearchWorkflowsResult = { matches };

  // Auto-execute mode: determine best match and extraction
  if (input.autoExecute && scored.length > 0) {
    const best = scored[0];
    const extractedInputs = extractInputsFromContext(best.workflow, input.context);
    const missingInputs = getMissingInputs(best.workflow, extractedInputs);

    result.bestMatch = {
      workflow: best.workflow.name,
      confidence: best.confidence,
      canAutoExecute: best.confidence >= 0.8 && missingInputs.length === 0,
      extractedInputs,
      missingInputs
    };
  }

  return result;
}
