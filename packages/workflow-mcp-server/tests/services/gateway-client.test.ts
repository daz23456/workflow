import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GatewayClient } from '../../src/services/gateway-client.js';
import type { WorkflowTask } from '../../src/types/index.js';

describe('GatewayClient', () => {
  let client: GatewayClient;
  const mockFetch = vi.fn();

  beforeEach(() => {
    vi.resetAllMocks();
    global.fetch = mockFetch;
    client = new GatewayClient('http://localhost:5000');
  });

  describe('listTasks', () => {
    it('should list all tasks successfully', async () => {
      const mockTasks: WorkflowTask[] = [
        {
          name: 'get-user',
          description: 'Fetch user by ID',
          category: 'data',
          spec: {
            http: { url: 'http://api/users/{id}', method: 'GET' },
            input: { type: 'object', properties: { userId: { type: 'string' } } },
            output: { type: 'object', properties: { user: { type: 'object' } } }
          }
        },
        {
          name: 'send-email',
          description: 'Send email notification',
          category: 'notification',
          spec: {
            http: { url: 'http://api/email', method: 'POST' },
            input: { type: 'object', properties: { to: { type: 'string' }, message: { type: 'string' } } },
            output: { type: 'object', properties: { sent: { type: 'boolean' } } }
          }
        }
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockTasks)
      });

      const result = await client.listTasks();

      expect(mockFetch).toHaveBeenCalledWith('http://localhost:5000/api/v1/tasks');
      expect(result).toEqual(mockTasks);
    });

    it('should handle API errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      });

      await expect(client.listTasks()).rejects.toThrow('Failed to fetch tasks: 500 Internal Server Error');
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(client.listTasks()).rejects.toThrow('Network error');
    });
  });

  describe('getTask', () => {
    it('should get a single task by name', async () => {
      const mockTask: WorkflowTask = {
        name: 'get-user',
        description: 'Fetch user by ID',
        spec: {
          http: { url: 'http://api/users/{id}', method: 'GET' },
          input: { type: 'object', properties: { userId: { type: 'string' } } },
          output: { type: 'object', properties: { user: { type: 'object' } } }
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockTask)
      });

      const result = await client.getTask('get-user');

      expect(mockFetch).toHaveBeenCalledWith('http://localhost:5000/api/v1/tasks/get-user');
      expect(result).toEqual(mockTask);
    });

    it('should handle task not found', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found'
      });

      await expect(client.getTask('nonexistent')).rejects.toThrow('Failed to fetch task: 404 Not Found');
    });
  });

  describe('validateWorkflow', () => {
    it('should validate a workflow successfully', async () => {
      const mockResult = {
        valid: true,
        errors: [],
        executionPlan: { tasks: [] }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResult)
      });

      const yaml = 'name: test-workflow\ntasks: []';
      const result = await client.validateWorkflow(yaml);

      expect(mockFetch).toHaveBeenCalledWith('http://localhost:5000/api/v1/workflows/test-execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-yaml' },
        body: yaml
      });
      expect(result.valid).toBe(true);
    });

    it('should handle validation errors from API', async () => {
      const mockResult = {
        valid: false,
        errors: [
          { message: 'Unknown task reference: invalid-task', code: 'UNKNOWN_TASK_REF' }
        ]
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResult)
      });

      const yaml = 'name: test\ntasks:\n  - id: t1\n    taskRef: invalid-task';
      const result = await client.validateWorkflow(yaml);

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
    });

    it('should handle API errors during validation', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request'
      });

      await expect(client.validateWorkflow('invalid yaml')).rejects.toThrow('Failed to validate workflow: 400 Bad Request');
    });
  });

  describe('constructor', () => {
    it('should use default base URL if not provided', () => {
      const defaultClient = new GatewayClient();
      expect(defaultClient.baseUrl).toBe('http://localhost:5000');
    });

    it('should use provided base URL', () => {
      const customClient = new GatewayClient('http://custom:8080');
      expect(customClient.baseUrl).toBe('http://custom:8080');
    });

    it('should use environment variable if set', () => {
      process.env.GATEWAY_URL = 'http://env:9000';
      const envClient = new GatewayClient();
      expect(envClient.baseUrl).toBe('http://env:9000');
      delete process.env.GATEWAY_URL;
    });
  });

  describe('dryRunWorkflow', () => {
    it('should dry-run a workflow with sample input', async () => {
      const mockResult = {
        valid: true,
        executionPlan: {
          tasks: [
            { id: 'task-1', taskRef: 'get-user', resolvedInput: { userId: '123' }, dependencies: [] }
          ],
          parallelGroups: [['task-1']]
        },
        errors: []
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResult)
      });

      const yaml = 'name: test-workflow\ntasks:\n  - id: task-1\n    taskRef: get-user';
      const sampleInput = { userId: '123' };
      const result = await client.dryRunWorkflow(yaml, sampleInput);

      expect(mockFetch).toHaveBeenCalledWith('http://localhost:5000/api/v1/workflows/test-execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ yaml, input: sampleInput })
      });
      expect(result.valid).toBe(true);
      expect(result.executionPlan.tasks).toHaveLength(1);
    });

    it('should handle dry-run validation errors', async () => {
      const mockResult = {
        valid: false,
        executionPlan: { tasks: [], parallelGroups: [] },
        errors: [{ message: 'Invalid template syntax' }]
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResult)
      });

      const result = await client.dryRunWorkflow('invalid yaml', {});

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
    });

    it('should handle API errors during dry-run', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      });

      await expect(client.dryRunWorkflow('yaml', {})).rejects.toThrow('Failed to dry-run workflow: 500 Internal Server Error');
    });
  });

  describe('executeWorkflow', () => {
    it('should execute a workflow successfully', async () => {
      const mockResult = {
        executionId: 'exec-123',
        status: 'completed',
        output: { result: 'success' },
        taskResults: [
          { taskId: 'task-1', status: 'completed', duration: 100, output: { data: 'test' } }
        ],
        totalDuration: 150
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResult)
      });

      const result = await client.executeWorkflow('my-workflow', { userId: '123' });

      expect(mockFetch).toHaveBeenCalledWith('http://localhost:5000/api/v1/workflows/my-workflow/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: '123' })
      });
      expect(result.executionId).toBe('exec-123');
      expect(result.status).toBe('completed');
    });

    it('should handle workflow not found', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found'
      });

      await expect(client.executeWorkflow('nonexistent', {})).rejects.toThrow('Workflow not found: nonexistent');
    });

    it('should handle execution failure', async () => {
      const mockResult = {
        executionId: 'exec-456',
        status: 'failed',
        output: {},
        taskResults: [
          { taskId: 'task-1', status: 'failed', duration: 50, error: 'Connection timeout' }
        ],
        totalDuration: 50
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResult)
      });

      const result = await client.executeWorkflow('my-workflow', {});

      expect(result.status).toBe('failed');
      expect(result.taskResults[0].error).toBe('Connection timeout');
    });

    it('should handle API errors during execution', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      });

      await expect(client.executeWorkflow('my-workflow', {})).rejects.toThrow('Failed to execute workflow: 500 Internal Server Error');
    });
  });
});
