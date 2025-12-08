/**
 * list_tasks MCP tool implementation
 * Stage 32.3: MCP Label Tools
 */

import type { ConsumerGatewayClient } from '../services/consumer-gateway-client.js';
import type {
  ListTasksInput,
  ListTasksResult,
  TaskDefinition
} from '../types.js';

/**
 * List all task definitions with optional filtering by labels
 */
export async function listTasks(
  client: ConsumerGatewayClient,
  input: ListTasksInput
): Promise<ListTasksResult> {
  // Fetch all tasks from gateway
  const allTasks = await client.listTasks();
  const total = allTasks.length;

  // Apply filters
  let filtered = allTasks;

  // Filter by tags (AND logic - must have all specified tags)
  if (input.tags && input.tags.length > 0) {
    filtered = filtered.filter(task =>
      input.tags!.every(tag => task.tags?.includes(tag) ?? false)
    );
  }

  // Filter by anyTags (OR logic - must have at least one specified tag)
  if (input.anyTags && input.anyTags.length > 0) {
    filtered = filtered.filter(task =>
      input.anyTags!.some(tag => task.tags?.includes(tag) ?? false)
    );
  }

  // Exclude tasks with specified tags
  if (input.excludeTags && input.excludeTags.length > 0) {
    filtered = filtered.filter(task =>
      !input.excludeTags!.some(tag => task.tags?.includes(tag) ?? false)
    );
  }

  // Filter by category
  if (input.category) {
    filtered = filtered.filter(task =>
      task.categories?.includes(input.category!) ?? false
    );
  }

  return {
    tasks: filtered,
    total,
    filtered: filtered.length
  };
}
