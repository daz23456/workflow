/**
 * Migration Generator
 * Generates TaskMigration CRDs with transform suggestions
 */

import type { JsonSchema } from '../types.js';
import type { ChangeResult } from './change-detector.js';

export interface TransformSuggestion {
  field: string;
  suggestion: string;
  example: string;
}

export interface MigrationSpec {
  apiVersion: string;
  kind: string;
  metadata: {
    name: string;
  };
  spec: {
    from: string;
    to: string;
    status: 'draft' | 'active' | 'deprecated';
    transforms: TransformSuggestion[];
  };
}

/**
 * Extract added required fields from schema change
 */
function extractAddedRequiredFields(change: ChangeResult['changes'][0]): string[] {
  if (change.field !== 'inputSchema' || !change.reason) {
    return [];
  }

  const match = change.reason.match(/Added required fields: (.+)/);
  if (match) {
    return match[1].split(', ');
  }
  return [];
}

/**
 * Extract removed output fields from schema change
 */
function extractRemovedOutputFields(change: ChangeResult['changes'][0]): string[] {
  if (change.field !== 'outputSchema' || !change.reason) {
    return [];
  }

  const match = change.reason.match(/Removed output fields: (.+)/);
  if (match) {
    return match[1].split(', ');
  }
  return [];
}

/**
 * Generate transform suggestions based on detected changes.
 */
export function generateTransforms(changeResult: ChangeResult): TransformSuggestion[] {
  const transforms: TransformSuggestion[] = [];

  for (const change of changeResult.changes) {
    if (!change.breaking) continue;

    // Handle added required input fields
    const addedFields = extractAddedRequiredFields(change);
    for (const field of addedFields) {
      transforms.push({
        field,
        suggestion: `Add mapping for new required field: ${field}`,
        example: `${field}: "{{workflow.input.${field}}}"`
      });
    }

    // Handle removed output fields
    const removedFields = extractRemovedOutputFields(change);
    for (const field of removedFields) {
      transforms.push({
        field,
        suggestion: `Field "${field}" removed from output - update dependent workflows`,
        example: 'Consider alternative source or remove dependency'
      });
    }
  }

  return transforms;
}

/**
 * Generate a TaskMigration CRD spec.
 */
export function generateMigration(
  fromTask: string,
  toTask: string,
  transforms: TransformSuggestion[]
): MigrationSpec {
  return {
    apiVersion: 'workflow.io/v1',
    kind: 'TaskMigration',
    metadata: {
      name: `${fromTask}-to-${toTask}`
    },
    spec: {
      from: fromTask,
      to: toTask,
      status: 'draft',
      transforms
    }
  };
}
