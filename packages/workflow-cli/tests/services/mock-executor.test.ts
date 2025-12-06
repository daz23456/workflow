/**
 * Mock Executor Tests
 * TDD: RED phase - tests written before implementation
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  MockExecutor,
  MockTaskResponse,
  MockExecutionResult,
  MockTaskResult
} from '../../src/services/mock-executor.js';
import type { WorkflowDefinition, TaskDefinition } from '../../src/loaders.js';

describe('MockExecutor', () => {
  let executor: MockExecutor;

  const sampleWorkflow: WorkflowDefinition = {
    apiVersion: 'workflow.example.com/v1',
    kind: 'Workflow',
    metadata: {
      name: 'test-workflow',
      namespace: 'default'
    },
    spec: {
      tasks: [
        {
          id: 'fetch-user',
          taskRef: 'get-user',
          input: { id: '{{input.userId}}' }
        },
        {
          id: 'fetch-orders',
          taskRef: 'get-orders',
          dependsOn: ['fetch-user'],
          input: { userId: '{{tasks.fetch-user.output.id}}' }
        }
      ],
      input: {
        type: 'object',
        properties: {
          userId: { type: 'string' }
        }
      },
      output: {
        user: '{{tasks.fetch-user.output}}',
        orders: '{{tasks.fetch-orders.output}}'
      }
    }
  };

  const sampleTasks: TaskDefinition[] = [
    {
      apiVersion: 'workflow.example.com/v1',
      kind: 'WorkflowTask',
      metadata: { name: 'get-user', namespace: 'default' },
      spec: {
        type: 'http',
        request: { url: 'http://localhost:5100/api/users/{{input.id}}', method: 'GET' }
      }
    },
    {
      apiVersion: 'workflow.example.com/v1',
      kind: 'WorkflowTask',
      metadata: { name: 'get-orders', namespace: 'default' },
      spec: {
        type: 'http',
        request: { url: 'http://localhost:5100/api/orders?userId={{input.userId}}', method: 'GET' }
      }
    }
  ];

  beforeEach(() => {
    executor = new MockExecutor();
  });

  describe('registerMockResponse', () => {
    it('should register mock response for a task', () => {
      executor.registerMockResponse('get-user', {
        status: 200,
        body: { id: '123', name: 'John' }
      });

      const response = executor.getMockResponse('get-user');
      expect(response).toBeDefined();
      expect(response?.body).toEqual({ id: '123', name: 'John' });
    });

    it('should support multiple responses for same task', () => {
      executor.registerMockResponse('get-user', { status: 200, body: { id: '1' } });
      executor.registerMockResponse('get-user', { status: 200, body: { id: '2' } });

      // Should queue responses
      const responses = executor.getAllMockResponses('get-user');
      expect(responses).toHaveLength(2);
    });

    it('should support error responses', () => {
      executor.registerMockResponse('get-user', {
        status: 404,
        body: { error: 'User not found' }
      });

      const response = executor.getMockResponse('get-user');
      expect(response?.status).toBe(404);
    });
  });

  describe('setDefaultResponse', () => {
    it('should set default response for unregistered tasks', () => {
      executor.setDefaultResponse({
        status: 200,
        body: { default: true }
      });

      const response = executor.getMockResponse('unknown-task');
      expect(response?.body).toEqual({ default: true });
    });
  });

  describe('execute', () => {
    it('should execute workflow with mock responses', async () => {
      executor.registerMockResponse('get-user', {
        status: 200,
        body: { id: '123', name: 'John' }
      });
      executor.registerMockResponse('get-orders', {
        status: 200,
        body: [{ orderId: 'order-1' }]
      });

      const result = await executor.execute(sampleWorkflow, sampleTasks, {
        userId: '123'
      });

      expect(result.status).toBe('completed');
      expect(result.output.user).toEqual({ id: '123', name: 'John' });
      expect(result.output.orders).toEqual([{ orderId: 'order-1' }]);
    });

    it('should resolve template expressions', async () => {
      executor.registerMockResponse('get-user', {
        status: 200,
        body: { id: '456', name: 'Jane' }
      });
      executor.registerMockResponse('get-orders', {
        status: 200,
        body: []
      });

      const result = await executor.execute(sampleWorkflow, sampleTasks, {
        userId: '456'
      });

      // Check that task inputs were resolved
      const userTask = result.taskResults.find(t => t.taskId === 'fetch-user');
      expect(userTask?.resolvedInput).toEqual({ id: '456' });
    });

    it('should track task execution order', async () => {
      executor.setDefaultResponse({ status: 200, body: {} });

      const result = await executor.execute(sampleWorkflow, sampleTasks, { userId: '1' });

      // fetch-user should run before fetch-orders (dependency)
      const userIndex = result.taskResults.findIndex(t => t.taskId === 'fetch-user');
      const ordersIndex = result.taskResults.findIndex(t => t.taskId === 'fetch-orders');
      expect(userIndex).toBeLessThan(ordersIndex);
    });

    it('should handle task failure', async () => {
      executor.registerMockResponse('get-user', {
        status: 500,
        body: { error: 'Internal error' }
      });

      const result = await executor.execute(sampleWorkflow, sampleTasks, { userId: '1' });

      expect(result.status).toBe('failed');
      expect(result.failedTask).toBe('fetch-user');
    });

    it('should stop execution on failure', async () => {
      executor.registerMockResponse('get-user', {
        status: 500,
        body: { error: 'Failed' }
      });

      const result = await executor.execute(sampleWorkflow, sampleTasks, { userId: '1' });

      // fetch-orders should not execute
      const ordersTask = result.taskResults.find(t => t.taskId === 'fetch-orders');
      expect(ordersTask?.status).toBe('skipped');
    });

    it('should include execution duration', async () => {
      executor.setDefaultResponse({ status: 200, body: {} });

      const result = await executor.execute(sampleWorkflow, sampleTasks, { userId: '1' });

      expect(result.duration).toBeGreaterThanOrEqual(0);
      result.taskResults.forEach(task => {
        expect(task.duration).toBeGreaterThanOrEqual(0);
      });
    });

    it('should generate execution ID', async () => {
      executor.setDefaultResponse({ status: 200, body: {} });

      const result = await executor.execute(sampleWorkflow, sampleTasks, { userId: '1' });

      expect(result.executionId).toBeDefined();
      expect(result.executionId).toMatch(/^mock-/);
    });
  });

  describe('execute with parallel tasks', () => {
    const parallelWorkflow: WorkflowDefinition = {
      apiVersion: 'workflow.example.com/v1',
      kind: 'Workflow',
      metadata: { name: 'parallel-workflow', namespace: 'default' },
      spec: {
        tasks: [
          { id: 'task-a', taskRef: 'get-user', input: {} },
          { id: 'task-b', taskRef: 'get-orders', input: {} },
          {
            id: 'task-c',
            taskRef: 'process',
            dependsOn: ['task-a', 'task-b'],
            input: {}
          }
        ],
        output: { result: '{{tasks.task-c.output}}' }
      }
    };

    it('should execute independent tasks in parallel', async () => {
      executor.setDefaultResponse({ status: 200, body: {} });

      const result = await executor.execute(parallelWorkflow, sampleTasks, {});

      // task-a and task-b should be in parallel group
      expect(result.parallelGroups).toBeDefined();
      expect(result.parallelGroups[0]).toContain('task-a');
      expect(result.parallelGroups[0]).toContain('task-b');
    });
  });

  describe('withDelay', () => {
    it('should add simulated delay to task execution', async () => {
      executor.setDefaultResponse({ status: 200, body: {} });
      executor.withDelay('get-user', 100);

      const start = Date.now();
      await executor.execute(sampleWorkflow, sampleTasks, { userId: '1' });
      const duration = Date.now() - start;

      expect(duration).toBeGreaterThanOrEqual(100);
    });
  });

  describe('MockExecutionResult', () => {
    it('should have correct structure', () => {
      const result: MockExecutionResult = {
        executionId: 'mock-123',
        status: 'completed',
        output: { user: { id: '1' } },
        duration: 150,
        taskResults: [
          {
            taskId: 'fetch-user',
            taskRef: 'get-user',
            status: 'completed',
            output: { id: '1' },
            resolvedInput: { id: '123' },
            duration: 50
          }
        ],
        parallelGroups: [['fetch-user']]
      };

      expect(result.status).toBe('completed');
      expect(result.taskResults).toHaveLength(1);
    });
  });

  describe('MockTaskResponse', () => {
    it('should have correct structure', () => {
      const response: MockTaskResponse = {
        status: 200,
        body: { data: 'test' },
        headers: { 'X-Custom': 'value' }
      };

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ data: 'test' });
    });
  });
});
