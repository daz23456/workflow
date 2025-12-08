/**
 * manage_labels MCP tool implementation
 * Stage 32.3: MCP Label Tools
 */

import type { ConsumerGatewayClient } from '../services/consumer-gateway-client.js';
import type {
  ManageLabelsInput,
  ManageLabelsResult,
  LabelChange,
  BulkLabelsRequest
} from '../types.js';

/**
 * Validate manage labels input
 */
function validateInput(input: ManageLabelsInput): string | null {
  if (!input.entityNames || input.entityNames.length === 0) {
    return 'entityNames is required and must not be empty';
  }

  const hasOperations =
    (input.addTags && input.addTags.length > 0) ||
    (input.removeTags && input.removeTags.length > 0) ||
    (input.addCategories && input.addCategories.length > 0) ||
    (input.removeCategories && input.removeCategories.length > 0);

  if (!hasOperations) {
    return 'At least one label operation (addTags, removeTags, addCategories, removeCategories) is required';
  }

  return null;
}

/**
 * Manage labels on workflows or tasks (add/remove tags and categories)
 */
export async function manageLabels(
  client: ConsumerGatewayClient,
  input: ManageLabelsInput
): Promise<ManageLabelsResult> {
  // Validate input
  const validationError = validateInput(input);
  if (validationError) {
    return {
      success: false,
      changes: [],
      summary: {
        entitiesModified: 0,
        tagsAdded: 0,
        tagsRemoved: 0,
        categoriesAdded: 0,
        categoriesRemoved: 0
      },
      dryRun: input.dryRun ?? false
    };
  }

  // Build the request
  const request: BulkLabelsRequest = {
    entityNames: input.entityNames,
    addTags: input.addTags,
    removeTags: input.removeTags,
    addCategories: input.addCategories,
    removeCategories: input.removeCategories,
    dryRun: input.dryRun
  };

  // Call the appropriate gateway endpoint based on entity type
  let result: ManageLabelsResult;

  if (input.entityType === 'workflow') {
    result = await client.bulkUpdateWorkflowLabels(request);
  } else {
    result = await client.bulkUpdateTaskLabels(request);
  }

  return result;
}
