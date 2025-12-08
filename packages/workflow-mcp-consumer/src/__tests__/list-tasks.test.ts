import { describe, it, expect, vi } from 'vitest';
import { listTasks } from '../tools/list-tasks.js';
import type { ConsumerGatewayClient } from '../services/consumer-gateway-client.js';
import type { TaskDefinition } from '../types.js';

// Mock gateway client factory
const createMockClient = (tasks: TaskDefinition[] = []): ConsumerGatewayClient => ({
  listWorkflows: vi.fn(),
  getWorkflow: vi.fn(),
  getWorkflowStats: vi.fn(),
  validateInput: vi.fn(),
  executeWorkflow: vi.fn(),
  getLabels: vi.fn(),
  listTasks: vi.fn().mockResolvedValue(tasks),
  getWorkflowsByTags: vi.fn(),
  getTasksByTags: vi.fn(),
  bulkUpdateWorkflowLabels: vi.fn(),
  bulkUpdateTaskLabels: vi.fn()
});

describe('listTasks', () => {
  describe('returns all tasks', () => {
    it('should return all tasks with metadata', async () => {
      const mockTasks: TaskDefinition[] = [
        { name: 'get-order', description: 'Fetch order details', tags: ['http'], categories: ['orders'] },
        { name: 'validate-order', description: 'Validate order data', tags: ['validation'], categories: ['orders'] },
        { name: 'send-email', description: 'Send notification email', tags: ['notification'], categories: ['notifications'] }
      ];

      const client = createMockClient(mockTasks);
      const result = await listTasks(client, {});

      expect(result.total).toBe(3);
      expect(result.filtered).toBe(3);
      expect(result.tasks).toHaveLength(3);
    });

    it('should return empty array when no tasks', async () => {
      const client = createMockClient([]);
      const result = await listTasks(client, {});

      expect(result.total).toBe(0);
      expect(result.filtered).toBe(0);
      expect(result.tasks).toEqual([]);
    });
  });

  describe('filters by tags (AND logic)', () => {
    it('should filter tasks that have all specified tags', async () => {
      const mockTasks: TaskDefinition[] = [
        { name: 'task1', tags: ['http', 'external'] },
        { name: 'task2', tags: ['http', 'internal'] },
        { name: 'task3', tags: ['validation'] }
      ];

      const client = createMockClient(mockTasks);
      const result = await listTasks(client, { tags: ['http', 'external'] });

      expect(result.filtered).toBe(1);
      expect(result.tasks[0].name).toBe('task1');
    });
  });

  describe('filters by anyTags (OR logic)', () => {
    it('should match tasks with any of the specified tags', async () => {
      const mockTasks: TaskDefinition[] = [
        { name: 'task1', tags: ['http'] },
        { name: 'task2', tags: ['grpc'] },
        { name: 'task3', tags: ['internal'] }
      ];

      const client = createMockClient(mockTasks);
      const result = await listTasks(client, { anyTags: ['http', 'grpc'] });

      expect(result.filtered).toBe(2);
      expect(result.tasks.map(t => t.name)).toContain('task1');
      expect(result.tasks.map(t => t.name)).toContain('task2');
    });
  });

  describe('filters by excludeTags', () => {
    it('should exclude tasks with specified tags', async () => {
      const mockTasks: TaskDefinition[] = [
        { name: 'task1', tags: ['production'] },
        { name: 'task2', tags: ['deprecated'] },
        { name: 'task3', tags: ['beta'] }
      ];

      const client = createMockClient(mockTasks);
      const result = await listTasks(client, { excludeTags: ['deprecated'] });

      expect(result.filtered).toBe(2);
      expect(result.tasks.map(t => t.name)).not.toContain('task2');
    });
  });

  describe('filters by category', () => {
    it('should filter tasks by category', async () => {
      const mockTasks: TaskDefinition[] = [
        { name: 'get-order', categories: ['orders'] },
        { name: 'get-user', categories: ['users'] },
        { name: 'process-order', categories: ['orders', 'processing'] }
      ];

      const client = createMockClient(mockTasks);
      const result = await listTasks(client, { category: 'orders' });

      expect(result.filtered).toBe(2);
      expect(result.tasks.map(t => t.name)).toContain('get-order');
      expect(result.tasks.map(t => t.name)).toContain('process-order');
    });
  });

  describe('combined filters', () => {
    it('should combine multiple filter types', async () => {
      const mockTasks: TaskDefinition[] = [
        { name: 'task1', tags: ['http', 'v2'], categories: ['orders'] },
        { name: 'task2', tags: ['http', 'deprecated'], categories: ['orders'] },
        { name: 'task3', tags: ['grpc', 'v2'], categories: ['orders'] },
        { name: 'task4', tags: ['http', 'v2'], categories: ['users'] }
      ];

      const client = createMockClient(mockTasks);
      const result = await listTasks(client, {
        anyTags: ['http', 'grpc'],
        excludeTags: ['deprecated'],
        category: 'orders'
      });

      expect(result.filtered).toBe(2);
      expect(result.tasks.map(t => t.name)).toContain('task1');
      expect(result.tasks.map(t => t.name)).toContain('task3');
    });
  });

  describe('error handling', () => {
    it('should propagate errors from gateway client', async () => {
      const client = createMockClient([]);
      client.listTasks = vi.fn().mockRejectedValue(new Error('Network error'));

      await expect(listTasks(client, {})).rejects.toThrow('Network error');
    });
  });
});
