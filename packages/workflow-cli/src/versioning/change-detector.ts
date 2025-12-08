/**
 * Change Detector
 * Detects changes between task versions and determines breaking changes
 */

import type { JsonSchema } from '../types.js';
import type { TaskContent } from './task-hash-calculator.js';

export type ChangeType = 'added' | 'removed' | 'modified';

export interface Change {
  field: string;
  type: ChangeType;
  oldValue?: unknown;
  newValue?: unknown;
  breaking: boolean;
  reason?: string;
}

export interface ChangeResult {
  hasChanges: boolean;
  changes: Change[];
  oldHash?: string;
  newHash?: string;
}

/**
 * Get property names from a schema
 */
function getSchemaProperties(schema: JsonSchema): string[] {
  return Object.keys(schema.properties || {});
}

/**
 * Get required field names from a schema
 */
function getRequiredFields(schema: JsonSchema): string[] {
  return schema.required || [];
}

/**
 * Compare two values for equality
 */
function deepEqual(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/**
 * Detect changes between two task versions.
 */
export function detectChanges(
  oldTask: TaskContent,
  newTask: TaskContent
): ChangeResult {
  const changes: Change[] = [];

  // Compare HTTP config
  if (!deepEqual(oldTask.httpConfig, newTask.httpConfig)) {
    changes.push({
      field: 'httpConfig',
      type: 'modified',
      oldValue: oldTask.httpConfig,
      newValue: newTask.httpConfig,
      breaking: false // HTTP config changes are generally not breaking
    });
  }

  // Compare input schema
  if (!deepEqual(oldTask.inputSchema, newTask.inputSchema)) {
    const oldRequired = getRequiredFields(oldTask.inputSchema);
    const newRequired = getRequiredFields(newTask.inputSchema);
    const addedRequired = newRequired.filter(f => !oldRequired.includes(f));

    changes.push({
      field: 'inputSchema',
      type: 'modified',
      oldValue: oldTask.inputSchema,
      newValue: newTask.inputSchema,
      breaking: addedRequired.length > 0,
      reason: addedRequired.length > 0
        ? `Added required fields: ${addedRequired.join(', ')}`
        : undefined
    });
  }

  // Compare output schema
  if (!deepEqual(oldTask.outputSchema, newTask.outputSchema)) {
    const oldProps = getSchemaProperties(oldTask.outputSchema);
    const newProps = getSchemaProperties(newTask.outputSchema);
    const removedProps = oldProps.filter(p => !newProps.includes(p));

    changes.push({
      field: 'outputSchema',
      type: 'modified',
      oldValue: oldTask.outputSchema,
      newValue: newTask.outputSchema,
      breaking: removedProps.length > 0,
      reason: removedProps.length > 0
        ? `Removed output fields: ${removedProps.join(', ')}`
        : undefined
    });
  }

  return {
    hasChanges: changes.length > 0,
    changes
  };
}

/**
 * Determine if a change result contains breaking changes.
 */
export function isBreakingChange(result: ChangeResult): boolean {
  return result.changes.some(change => change.breaking);
}
