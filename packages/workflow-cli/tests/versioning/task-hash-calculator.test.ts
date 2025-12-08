/**
 * Task Hash Calculator Tests
 * TDD: RED phase - write failing tests first
 */

import { describe, it, expect } from 'vitest';
import {
  calculateTaskHash,
  normalizeTaskForHashing,
  type TaskContent
} from '../../src/versioning/task-hash-calculator.js';

describe('task-hash-calculator', () => {
  const sampleTask: TaskContent = {
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

  describe('calculateTaskHash', () => {
    it('should generate consistent SHA256 hash for same content', () => {
      const hash1 = calculateTaskHash(sampleTask);
      const hash2 = calculateTaskHash(sampleTask);

      expect(hash1).toBe(hash2);
      expect(hash1).toMatch(/^[a-f0-9]{64}$/); // SHA256 is 64 hex chars
    });

    it('should generate different hash when content changes', () => {
      const modifiedTask: TaskContent = {
        ...sampleTask,
        httpConfig: {
          ...sampleTask.httpConfig,
          method: 'POST'
        }
      };

      const hash1 = calculateTaskHash(sampleTask);
      const hash2 = calculateTaskHash(modifiedTask);

      expect(hash1).not.toBe(hash2);
    });

    it('should ignore non-content fields like metadata', () => {
      const taskWithMeta = {
        ...sampleTask,
        metadata: { createdAt: '2024-01-01', author: 'test' }
      };

      const hash1 = calculateTaskHash(sampleTask);
      const hash2 = calculateTaskHash(taskWithMeta as TaskContent);

      expect(hash1).toBe(hash2);
    });
  });

  describe('normalizeTaskForHashing', () => {
    it('should sort object keys for consistent serialization', () => {
      const task1: TaskContent = {
        name: 'test',
        inputSchema: { type: 'object' },
        outputSchema: { type: 'object' },
        httpConfig: { method: 'GET', url: 'http://test.com' }
      };
      const task2: TaskContent = {
        httpConfig: { url: 'http://test.com', method: 'GET' },
        outputSchema: { type: 'object' },
        inputSchema: { type: 'object' },
        name: 'test'
      };

      const normalized1 = normalizeTaskForHashing(task1);
      const normalized2 = normalizeTaskForHashing(task2);

      expect(normalized1).toBe(normalized2);
    });
  });
});
