/**
 * Check Changes Command Tests
 * TDD: RED phase - write failing tests first
 */

import { describe, it, expect } from 'vitest';
import {
  checkChangesCommand,
  type CheckChangesOptions
} from '../../src/commands/check-changes.js';
import type { TaskContent } from '../../src/versioning/task-hash-calculator.js';

describe('check-changes command', () => {
  const oldTask: TaskContent = {
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

  describe('checkChangesCommand', () => {
    it('should detect no changes when tasks are identical', async () => {
      const options: CheckChangesOptions = {
        oldTask,
        newTask: oldTask
      };

      const result = await checkChangesCommand(options);

      expect(result.hasChanges).toBe(false);
      expect(result.breaking).toBe(false);
      expect(result.exitCode).toBe(0);
    });

    it('should detect breaking changes and return exit code 1', async () => {
      const newTask: TaskContent = {
        ...oldTask,
        inputSchema: {
          ...oldTask.inputSchema,
          properties: {
            ...oldTask.inputSchema.properties,
            email: { type: 'string' }
          },
          required: ['userId', 'email'] // Added required field
        }
      };

      const options: CheckChangesOptions = {
        oldTask,
        newTask
      };

      const result = await checkChangesCommand(options);

      expect(result.hasChanges).toBe(true);
      expect(result.breaking).toBe(true);
      expect(result.exitCode).toBe(1);
      expect(result.suggestedVersion).toMatch(/-v2$/);
    });

    it('should detect non-breaking changes and return exit code 0', async () => {
      const newTask: TaskContent = {
        ...oldTask,
        outputSchema: {
          type: 'object',
          properties: {
            ...oldTask.outputSchema.properties,
            email: { type: 'string' } // Added output field (non-breaking)
          }
        }
      };

      const options: CheckChangesOptions = {
        oldTask,
        newTask
      };

      const result = await checkChangesCommand(options);

      expect(result.hasChanges).toBe(true);
      expect(result.breaking).toBe(false);
      expect(result.exitCode).toBe(0);
    });

    it('should generate migration suggestion for breaking changes', async () => {
      const newTask: TaskContent = {
        ...oldTask,
        outputSchema: {
          type: 'object',
          properties: { id: { type: 'string' } } // Removed 'name' field
        }
      };

      const options: CheckChangesOptions = {
        oldTask,
        newTask,
        generateMigration: true
      };

      const result = await checkChangesCommand(options);

      expect(result.breaking).toBe(true);
      expect(result.migration).toBeDefined();
      expect(result.migration?.spec.transforms.length).toBeGreaterThan(0);
    });
  });
});
