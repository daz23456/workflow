/**
 * Task Hash Calculator
 * Generates SHA256 hashes for task content to detect changes
 */

import { createHash } from 'crypto';
import type { JsonSchema } from '../types.js';

export interface TaskContent {
  name: string;
  httpConfig: {
    method: string;
    url: string;
    headers?: Record<string, string>;
    body?: unknown;
  };
  inputSchema: JsonSchema;
  outputSchema: JsonSchema;
}

/**
 * Fields to include in hash calculation (content-affecting only)
 */
const HASH_FIELDS = ['name', 'httpConfig', 'inputSchema', 'outputSchema'] as const;

/**
 * Recursively sort object keys for consistent serialization
 */
function sortObjectKeys(obj: unknown): unknown {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(sortObjectKeys);
  }

  const sorted: Record<string, unknown> = {};
  const keys = Object.keys(obj as Record<string, unknown>).sort();
  for (const key of keys) {
    sorted[key] = sortObjectKeys((obj as Record<string, unknown>)[key]);
  }
  return sorted;
}

/**
 * Normalize task content for consistent hashing.
 * Extracts only content-affecting fields and sorts keys.
 */
export function normalizeTaskForHashing(task: TaskContent): string {
  const contentOnly: Record<string, unknown> = {};

  for (const field of HASH_FIELDS) {
    if (field in task) {
      contentOnly[field] = task[field];
    }
  }

  const sorted = sortObjectKeys(contentOnly);
  return JSON.stringify(sorted);
}

/**
 * Calculate SHA256 hash of task content.
 * Used for change detection and versioning.
 */
export function calculateTaskHash(task: TaskContent): string {
  const normalized = normalizeTaskForHashing(task);
  return createHash('sha256').update(normalized).digest('hex');
}
