/**
 * Dependency Analyzer Tests
 * TDD: RED phase - write failing tests first
 */

import { describe, it, expect } from 'vitest';
import {
  analyzeTaskCompatibility,
  findCompatibleChains,
  isSchemaCompatible,
  type TaskDefinition,
  type CompatibilityResult,
  type TaskChain
} from '../../src/workflow-generator/dependency-analyzer.js';

describe('dependency-analyzer', () => {
  describe('isSchemaCompatible', () => {
    it('should return true when output schema matches input schema exactly', () => {
      const outputSchema = {
        type: 'object',
        properties: {
          userId: { type: 'string' },
          name: { type: 'string' }
        }
      };
      const inputSchema = {
        type: 'object',
        properties: {
          userId: { type: 'string' }
        },
        required: ['userId']
      };

      const result = isSchemaCompatible(outputSchema, inputSchema);
      expect(result).toBe(true);
    });

    it('should return false when required field is missing from output', () => {
      const outputSchema = {
        type: 'object',
        properties: {
          name: { type: 'string' }
        }
      };
      const inputSchema = {
        type: 'object',
        properties: {
          userId: { type: 'string' }
        },
        required: ['userId']
      };

      const result = isSchemaCompatible(outputSchema, inputSchema);
      expect(result).toBe(false);
    });

    it('should return false when types do not match', () => {
      const outputSchema = {
        type: 'object',
        properties: {
          userId: { type: 'number' }
        }
      };
      const inputSchema = {
        type: 'object',
        properties: {
          userId: { type: 'string' }
        },
        required: ['userId']
      };

      const result = isSchemaCompatible(outputSchema, inputSchema);
      expect(result).toBe(false);
    });
  });

  describe('analyzeTaskCompatibility', () => {
    const getUserTask: TaskDefinition = {
      name: 'get-user',
      inputSchema: {
        type: 'object',
        properties: { userId: { type: 'string' } },
        required: ['userId']
      },
      outputSchema: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          email: { type: 'string' }
        }
      }
    };

    const sendEmailTask: TaskDefinition = {
      name: 'send-email',
      inputSchema: {
        type: 'object',
        properties: {
          to: { type: 'string' },
          subject: { type: 'string' }
        },
        required: ['to']
      },
      outputSchema: {
        type: 'object',
        properties: { sent: { type: 'boolean' } }
      }
    };

    const createOrderTask: TaskDefinition = {
      name: 'create-order',
      inputSchema: {
        type: 'object',
        properties: {
          userId: { type: 'string' },
          items: { type: 'array' }
        },
        required: ['userId']
      },
      outputSchema: {
        type: 'object',
        properties: {
          orderId: { type: 'string' },
          total: { type: 'number' }
        }
      }
    };

    it('should detect compatible tasks with field mapping', () => {
      const result = analyzeTaskCompatibility(getUserTask, sendEmailTask);

      expect(result.compatible).toBe(true);
      expect(result.fieldMappings).toContainEqual({
        from: 'email',
        to: 'to'
      });
    });

    it('should detect incompatible tasks', () => {
      const result = analyzeTaskCompatibility(sendEmailTask, createOrderTask);

      expect(result.compatible).toBe(false);
      expect(result.missingFields).toContain('userId');
    });

    it('should handle tasks with identical field names', () => {
      const result = analyzeTaskCompatibility(getUserTask, createOrderTask);

      expect(result.compatible).toBe(true);
      expect(result.fieldMappings).toContainEqual({
        from: 'id',
        to: 'userId'
      });
    });
  });

  describe('findCompatibleChains', () => {
    const tasks: TaskDefinition[] = [
      {
        name: 'get-user',
        inputSchema: {
          type: 'object',
          properties: { userId: { type: 'string' } },
          required: ['userId']
        },
        outputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            email: { type: 'string' }
          }
        }
      },
      {
        name: 'get-orders',
        inputSchema: {
          type: 'object',
          properties: { userId: { type: 'string' } },
          required: ['userId']
        },
        outputSchema: {
          type: 'object',
          properties: {
            orders: { type: 'array' }
          }
        }
      },
      {
        name: 'send-email',
        inputSchema: {
          type: 'object',
          properties: { to: { type: 'string' } },
          required: ['to']
        },
        outputSchema: {
          type: 'object',
          properties: { sent: { type: 'boolean' } }
        }
      }
    ];

    it('should find all compatible chains of length 2', () => {
      const chains = findCompatibleChains(tasks, 2);

      expect(chains.length).toBeGreaterThan(0);
      expect(chains.some(chain =>
        chain.tasks[0].name === 'get-user' &&
        chain.tasks[1].name === 'send-email'
      )).toBe(true);
    });

    it('should return empty array when no compatible chains exist', () => {
      const incompatibleTasks: TaskDefinition[] = [
        {
          name: 'task-a',
          inputSchema: { type: 'object', properties: { x: { type: 'string' } }, required: ['x'] },
          outputSchema: { type: 'object', properties: { y: { type: 'number' } } }
        },
        {
          name: 'task-b',
          inputSchema: { type: 'object', properties: { z: { type: 'boolean' } }, required: ['z'] },
          outputSchema: { type: 'object', properties: { w: { type: 'string' } } }
        }
      ];

      const chains = findCompatibleChains(incompatibleTasks, 2);
      expect(chains).toHaveLength(0);
    });

    it('should not include self-chains', () => {
      const chains = findCompatibleChains(tasks, 2);

      chains.forEach(chain => {
        expect(chain.tasks[0].name).not.toBe(chain.tasks[1].name);
      });
    });
  });
});
