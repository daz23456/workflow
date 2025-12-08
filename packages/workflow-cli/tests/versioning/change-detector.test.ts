/**
 * Change Detector Tests
 * TDD: RED phase - write failing tests first
 */

import { describe, it, expect } from 'vitest';
import {
  detectChanges,
  isBreakingChange,
  type ChangeResult,
  type ChangeType
} from '../../src/versioning/change-detector.js';
import type { TaskContent } from '../../src/versioning/task-hash-calculator.js';

describe('change-detector', () => {
  const baseTask: TaskContent = {
    name: 'get-user',
    httpConfig: {
      method: 'GET',
      url: 'https://api.example.com/users/{{userId}}'
    },
    inputSchema: {
      type: 'object',
      properties: { userId: { type: 'string' } },
      required: ['userId']
    },
    outputSchema: {
      type: 'object',
      properties: { id: { type: 'string' }, name: { type: 'string' } }
    }
  };

  describe('detectChanges', () => {
    it('should detect no changes when tasks are identical', () => {
      const result = detectChanges(baseTask, baseTask);

      expect(result.hasChanges).toBe(false);
      expect(result.changes).toHaveLength(0);
    });

    it('should detect input schema changes', () => {
      const newTask: TaskContent = {
        ...baseTask,
        inputSchema: {
          ...baseTask.inputSchema,
          properties: {
            ...baseTask.inputSchema.properties,
            email: { type: 'string' }
          },
          required: ['userId', 'email']
        }
      };

      const result = detectChanges(baseTask, newTask);

      expect(result.hasChanges).toBe(true);
      expect(result.changes).toContainEqual(
        expect.objectContaining({
          field: 'inputSchema',
          type: 'modified'
        })
      );
    });

    it('should detect output schema changes', () => {
      const newTask: TaskContent = {
        ...baseTask,
        outputSchema: {
          type: 'object',
          properties: { id: { type: 'string' } } // removed 'name'
        }
      };

      const result = detectChanges(baseTask, newTask);

      expect(result.hasChanges).toBe(true);
      expect(result.changes).toContainEqual(
        expect.objectContaining({
          field: 'outputSchema',
          type: 'modified'
        })
      );
    });

    it('should detect HTTP config changes', () => {
      const newTask: TaskContent = {
        ...baseTask,
        httpConfig: {
          ...baseTask.httpConfig,
          method: 'POST'
        }
      };

      const result = detectChanges(baseTask, newTask);

      expect(result.hasChanges).toBe(true);
      expect(result.changes).toContainEqual(
        expect.objectContaining({
          field: 'httpConfig',
          type: 'modified'
        })
      );
    });
  });

  describe('isBreakingChange', () => {
    it('should mark adding required input field as breaking', () => {
      const newTask: TaskContent = {
        ...baseTask,
        inputSchema: {
          ...baseTask.inputSchema,
          properties: {
            ...baseTask.inputSchema.properties,
            newField: { type: 'string' }
          },
          required: ['userId', 'newField']
        }
      };

      const result = detectChanges(baseTask, newTask);
      expect(isBreakingChange(result)).toBe(true);
    });

    it('should mark removing output field as breaking', () => {
      const newTask: TaskContent = {
        ...baseTask,
        outputSchema: {
          type: 'object',
          properties: { id: { type: 'string' } } // removed 'name'
        }
      };

      const result = detectChanges(baseTask, newTask);
      expect(isBreakingChange(result)).toBe(true);
    });

    it('should not mark adding optional input field as breaking', () => {
      const newTask: TaskContent = {
        ...baseTask,
        inputSchema: {
          ...baseTask.inputSchema,
          properties: {
            ...baseTask.inputSchema.properties,
            optionalField: { type: 'string' }
          }
          // required stays the same - new field is optional
        }
      };

      const result = detectChanges(baseTask, newTask);
      expect(isBreakingChange(result)).toBe(false);
    });

    it('should not mark adding output field as breaking', () => {
      const newTask: TaskContent = {
        ...baseTask,
        outputSchema: {
          type: 'object',
          properties: {
            ...baseTask.outputSchema.properties,
            newField: { type: 'string' }
          }
        }
      };

      const result = detectChanges(baseTask, newTask);
      expect(isBreakingChange(result)).toBe(false);
    });
  });
});
