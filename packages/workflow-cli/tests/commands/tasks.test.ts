/**
 * Tasks Command Tests
 * TDD: RED phase - tests written before implementation
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { listTasks, showTask, TaskListResult, TaskShowResult } from '../../src/commands/tasks.js';
import * as loaders from '../../src/loaders.js';
import type { TaskDefinition } from '../../src/loaders.js';

// Mock loaders module
vi.mock('../../src/loaders.js');

describe('Tasks Command', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const sampleTasks: TaskDefinition[] = [
    {
      apiVersion: 'workflow.example.com/v1',
      kind: 'WorkflowTask',
      metadata: {
        name: 'get-user',
        namespace: 'default'
      },
      spec: {
        type: 'http',
        request: {
          url: 'http://localhost:5100/api/users/{{input.id}}',
          method: 'GET'
        }
      }
    },
    {
      apiVersion: 'workflow.example.com/v1',
      kind: 'WorkflowTask',
      metadata: {
        name: 'create-order',
        namespace: 'default'
      },
      spec: {
        type: 'http',
        request: {
          url: 'http://localhost:5100/api/orders',
          method: 'POST'
        }
      }
    },
    {
      apiVersion: 'workflow.example.com/v1',
      kind: 'WorkflowTask',
      metadata: {
        name: 'check-inventory',
        namespace: 'test'
      },
      spec: {
        type: 'http',
        request: {
          url: 'http://localhost:5100/api/inventory',
          method: 'GET'
        }
      }
    }
  ];

  describe('listTasks', () => {
    it('should list all tasks from directory', async () => {
      vi.mocked(loaders.loadTasksFromDirectory).mockResolvedValue(sampleTasks);

      const result = await listTasks({ tasksPath: '/path/to/tasks' });

      expect(result.tasks).toHaveLength(3);
      expect(result.tasks.map(t => t.name)).toContain('get-user');
      expect(result.tasks.map(t => t.name)).toContain('create-order');
      expect(result.tasks.map(t => t.name)).toContain('check-inventory');
    });

    it('should include task type and namespace', async () => {
      vi.mocked(loaders.loadTasksFromDirectory).mockResolvedValue(sampleTasks);

      const result = await listTasks({ tasksPath: '/path/to/tasks' });

      const getUserTask = result.tasks.find(t => t.name === 'get-user');
      expect(getUserTask?.type).toBe('http');
      expect(getUserTask?.namespace).toBe('default');
    });

    it('should filter tasks by name pattern', async () => {
      vi.mocked(loaders.loadTasksFromDirectory).mockResolvedValue(sampleTasks);

      const result = await listTasks({
        tasksPath: '/path/to/tasks',
        filter: 'get-*'
      });

      expect(result.tasks).toHaveLength(1);
      expect(result.tasks[0].name).toBe('get-user');
    });

    it('should filter tasks by namespace', async () => {
      vi.mocked(loaders.loadTasksFromDirectory).mockResolvedValue(sampleTasks);

      const result = await listTasks({
        tasksPath: '/path/to/tasks',
        namespace: 'test'
      });

      expect(result.tasks).toHaveLength(1);
      expect(result.tasks[0].name).toBe('check-inventory');
    });

    it('should return empty array for empty directory', async () => {
      vi.mocked(loaders.loadTasksFromDirectory).mockResolvedValue([]);

      const result = await listTasks({ tasksPath: '/empty/dir' });

      expect(result.tasks).toHaveLength(0);
    });

    it('should handle directory not found', async () => {
      vi.mocked(loaders.loadTasksFromDirectory).mockRejectedValue(new Error('ENOENT'));

      const result = await listTasks({ tasksPath: '/nonexistent' });

      expect(result.tasks).toHaveLength(0);
      expect(result.error).toBeDefined();
    });

    it('should support multiple filter patterns', async () => {
      vi.mocked(loaders.loadTasksFromDirectory).mockResolvedValue(sampleTasks);

      const result = await listTasks({
        tasksPath: '/path/to/tasks',
        filter: '*-user,*-order'
      });

      expect(result.tasks).toHaveLength(2);
      expect(result.tasks.map(t => t.name)).toContain('get-user');
      expect(result.tasks.map(t => t.name)).toContain('create-order');
    });

    it('should include task count in result', async () => {
      vi.mocked(loaders.loadTasksFromDirectory).mockResolvedValue(sampleTasks);

      const result = await listTasks({ tasksPath: '/path/to/tasks' });

      expect(result.count).toBe(3);
    });

    it('should sort tasks alphabetically by name', async () => {
      vi.mocked(loaders.loadTasksFromDirectory).mockResolvedValue(sampleTasks);

      const result = await listTasks({ tasksPath: '/path/to/tasks' });

      const names = result.tasks.map(t => t.name);
      const sortedNames = [...names].sort();
      expect(names).toEqual(sortedNames);
    });
  });

  describe('showTask', () => {
    it('should show details of a specific task', async () => {
      vi.mocked(loaders.loadTasksFromDirectory).mockResolvedValue(sampleTasks);

      const result = await showTask('get-user', { tasksPath: '/path/to/tasks' });

      expect(result.found).toBe(true);
      expect(result.task?.name).toBe('get-user');
      expect(result.task?.type).toBe('http');
      expect(result.task?.namespace).toBe('default');
    });

    it('should include request details', async () => {
      vi.mocked(loaders.loadTasksFromDirectory).mockResolvedValue(sampleTasks);

      const result = await showTask('get-user', { tasksPath: '/path/to/tasks' });

      expect(result.task?.request?.url).toContain('/api/users/');
      expect(result.task?.request?.method).toBe('GET');
    });

    it('should return not found for non-existent task', async () => {
      vi.mocked(loaders.loadTasksFromDirectory).mockResolvedValue(sampleTasks);

      const result = await showTask('nonexistent', { tasksPath: '/path/to/tasks' });

      expect(result.found).toBe(false);
      expect(result.task).toBeUndefined();
    });

    it('should match task by exact name', async () => {
      vi.mocked(loaders.loadTasksFromDirectory).mockResolvedValue(sampleTasks);

      const result = await showTask('get', { tasksPath: '/path/to/tasks' });

      expect(result.found).toBe(false);
    });

    it('should include input schema if defined', async () => {
      const taskWithSchema: TaskDefinition = {
        ...sampleTasks[0],
        spec: {
          ...sampleTasks[0].spec,
          inputSchema: {
            type: 'object',
            properties: {
              id: { type: 'string' }
            },
            required: ['id']
          }
        }
      };
      vi.mocked(loaders.loadTasksFromDirectory).mockResolvedValue([taskWithSchema]);

      const result = await showTask('get-user', { tasksPath: '/path/to/tasks' });

      expect(result.task?.inputSchema).toBeDefined();
      expect(result.task?.inputSchema?.properties?.id).toBeDefined();
    });

    it('should include output schema if defined', async () => {
      const taskWithSchema: TaskDefinition = {
        ...sampleTasks[0],
        spec: {
          ...sampleTasks[0].spec,
          outputSchema: {
            type: 'object',
            properties: {
              user: { type: 'object' }
            }
          }
        }
      };
      vi.mocked(loaders.loadTasksFromDirectory).mockResolvedValue([taskWithSchema]);

      const result = await showTask('get-user', { tasksPath: '/path/to/tasks' });

      expect(result.task?.outputSchema).toBeDefined();
    });

    it('should handle directory error gracefully', async () => {
      vi.mocked(loaders.loadTasksFromDirectory).mockRejectedValue(new Error('ENOENT'));

      const result = await showTask('get-user', { tasksPath: '/nonexistent' });

      expect(result.found).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('TaskListResult', () => {
    it('should have correct structure', () => {
      const result: TaskListResult = {
        tasks: [
          { name: 'test', type: 'http', namespace: 'default' }
        ],
        count: 1
      };

      expect(result.tasks).toHaveLength(1);
      expect(result.count).toBe(1);
    });

    it('should support error field', () => {
      const result: TaskListResult = {
        tasks: [],
        count: 0,
        error: 'Directory not found'
      };

      expect(result.error).toBe('Directory not found');
    });
  });

  describe('TaskShowResult', () => {
    it('should have correct structure for found task', () => {
      const result: TaskShowResult = {
        found: true,
        task: {
          name: 'test-task',
          type: 'http',
          namespace: 'default',
          request: {
            url: 'http://example.com',
            method: 'GET'
          }
        }
      };

      expect(result.found).toBe(true);
      expect(result.task?.name).toBe('test-task');
    });

    it('should have correct structure for not found', () => {
      const result: TaskShowResult = {
        found: false
      };

      expect(result.found).toBe(false);
      expect(result.task).toBeUndefined();
    });
  });
});
