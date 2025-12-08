/**
 * list_labels MCP tool implementation
 * Stage 32.3: MCP Label Tools
 */

import type { ConsumerGatewayClient } from '../services/consumer-gateway-client.js';
import type {
  ListLabelsInput,
  ListLabelsResult,
  TagInfo,
  CategoryInfo
} from '../types.js';

/**
 * Sort labels by name (alphabetically)
 */
function sortByName<T extends { name: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Sort labels by usage count (descending)
 */
function sortByUsage<T extends { count: number }>(items: T[]): T[] {
  return [...items].sort((a, b) => b.count - a.count);
}

/**
 * List all available labels with usage counts
 */
export async function listLabels(
  client: ConsumerGatewayClient,
  input: ListLabelsInput
): Promise<ListLabelsResult> {
  // Fetch all labels from gateway
  const labelsResponse = await client.getLabels();

  let tags: TagInfo[] = labelsResponse.tags || [];
  let categories: CategoryInfo[] = labelsResponse.categories || [];

  // Filter by entity type if specified
  // Note: The gateway API returns all labels; filtering would need additional API support
  // For now, we return all labels (the API should be enhanced to support entityType filter)

  // Apply sorting
  if (input.sortBy === 'name') {
    tags = sortByName(tags);
    categories = sortByName(categories);
  } else if (input.sortBy === 'usage') {
    tags = sortByUsage(tags);
    categories = sortByUsage(categories);
  } else {
    // Default: sort by usage (most used first)
    tags = sortByUsage(tags);
    categories = sortByUsage(categories);
  }

  return {
    tags,
    categories,
    totalTags: tags.length,
    totalCategories: categories.length
  };
}
