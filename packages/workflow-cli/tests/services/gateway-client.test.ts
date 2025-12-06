/**
 * Gateway Client Tests
 * TDD: RED phase - tests written before implementation
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  GatewayClient,
  WorkflowSummary,
  TaskSummary,
  ExecutionResult,
  DryRunResult,
  GatewayError
} from '../../src/services/gateway-client.js';

// Mock global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('GatewayClient', () => {
  let client: GatewayClient;

  beforeEach(() => {
    vi.clearAllMocks();
    client = new GatewayClient('http://localhost:5001');
  });

  describe('constructor', () => {
    it('should create client with base URL', () => {
      const c = new GatewayClient('http://localhost:5001');
      expect(c.baseUrl).toBe('http://localhost:5001');
    });

    it('should remove trailing slash from base URL', () => {
      const c = new GatewayClient('http://localhost:5001/');
      expect(c.baseUrl).toBe('http://localhost:5001');
    });

    it('should accept optional namespace', () => {
      const c = new GatewayClient('http://localhost:5001', 'production');
      expect(c.namespace).toBe('production');
    });
  });

  describe('listWorkflows', () => {
    it('should return list of workflows', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          workflows: [
            { name: 'workflow-1', namespace: 'default' },
            { name: 'workflow-2', namespace: 'default' }
          ]
        })
      });

      const result = await client.listWorkflows();

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('workflow-1');
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:5001/api/v1/workflows',
        expect.objectContaining({ method: 'GET' })
      );
    });

    it('should filter workflows by namespace', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          workflows: [
            { name: 'workflow-1', namespace: 'test' }
          ]
        })
      });

      const result = await client.listWorkflows('test');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:5001/api/v1/workflows?namespace=test',
        expect.any(Object)
      );
    });

    it('should handle API errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      });

      await expect(client.listWorkflows()).rejects.toThrow(GatewayError);
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(client.listWorkflows()).rejects.toThrow();
    });
  });

  describe('listTasks', () => {
    it('should return list of tasks', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          tasks: [
            { name: 'get-user', namespace: 'default', type: 'http' },
            { name: 'create-order', namespace: 'default', type: 'http' }
          ]
        })
      });

      const result = await client.listTasks();

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('get-user');
      expect(result[0].type).toBe('http');
    });

    it('should filter tasks by namespace', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ tasks: [] })
      });

      await client.listTasks('production');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:5001/api/v1/tasks?namespace=production',
        expect.any(Object)
      );
    });
  });

  describe('executeWorkflow', () => {
    it('should execute workflow and return result', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          executionId: 'exec-123',
          status: 'completed',
          output: { result: 'success' },
          duration: 1500
        })
      });

      const result = await client.executeWorkflow('my-workflow', { userId: '123' });

      expect(result.executionId).toBe('exec-123');
      expect(result.status).toBe('completed');
      expect(result.output).toEqual({ result: 'success' });
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:5001/api/v1/workflows/my-workflow/execute',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ input: { userId: '123' } })
        })
      );
    });

    it('should execute workflow in specified namespace', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          executionId: 'exec-456',
          status: 'completed',
          output: {}
        })
      });

      await client.executeWorkflow('my-workflow', {}, 'production');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:5001/api/v1/workflows/my-workflow/execute?namespace=production',
        expect.any(Object)
      );
    });

    it('should handle execution failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          executionId: 'exec-789',
          status: 'failed',
          error: 'Task timeout',
          failedTask: 'fetch-user'
        })
      });

      const result = await client.executeWorkflow('my-workflow', {});

      expect(result.status).toBe('failed');
      expect(result.error).toBe('Task timeout');
      expect(result.failedTask).toBe('fetch-user');
    });

    it('should handle validation errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          error: 'Validation failed',
          details: ['Missing required field: userId']
        })
      });

      await expect(client.executeWorkflow('my-workflow', {})).rejects.toThrow(GatewayError);
    });
  });

  describe('dryRunWorkflow', () => {
    it('should perform dry run and return execution plan', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          valid: true,
          executionPlan: {
            groups: [
              { tasks: ['fetch-user', 'fetch-inventory'], parallel: true },
              { tasks: ['process-order'], parallel: false }
            ]
          },
          resolvedTemplates: {
            'fetch-user.input.id': '123'
          }
        })
      });

      const result = await client.dryRunWorkflow('my-workflow', { userId: '123' });

      expect(result.valid).toBe(true);
      expect(result.executionPlan).toBeDefined();
      expect(result.executionPlan.groups).toHaveLength(2);
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:5001/api/v1/workflows/my-workflow/test',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ input: { userId: '123' } })
        })
      );
    });

    it('should return validation errors in dry run', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          valid: false,
          errors: ['Missing task reference: nonexistent-task'],
          warnings: ['Unused input field: extraField']
        })
      });

      const result = await client.dryRunWorkflow('my-workflow', {});

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing task reference: nonexistent-task');
      expect(result.warnings).toContain('Unused input field: extraField');
    });
  });

  describe('getWorkflow', () => {
    it('should return workflow details', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          name: 'my-workflow',
          namespace: 'default',
          spec: {
            tasks: [{ id: 'task-1', taskRef: 'get-user' }]
          }
        })
      });

      const result = await client.getWorkflow('my-workflow');

      expect(result.name).toBe('my-workflow');
      expect(result.spec.tasks).toHaveLength(1);
    });

    it('should return null for non-existent workflow', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404
      });

      const result = await client.getWorkflow('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('getExecution', () => {
    it('should return execution details', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          executionId: 'exec-123',
          workflowName: 'my-workflow',
          status: 'completed',
          startTime: '2024-01-15T10:00:00Z',
          endTime: '2024-01-15T10:00:02Z',
          taskResults: [
            { taskId: 'fetch-user', status: 'completed', duration: 500 }
          ]
        })
      });

      const result = await client.getExecution('exec-123');

      expect(result?.executionId).toBe('exec-123');
      expect(result?.taskResults).toHaveLength(1);
    });
  });

  describe('health', () => {
    it('should return true when gateway is healthy', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 'healthy' })
      });

      const result = await client.health();

      expect(result).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:5001/health',
        expect.any(Object)
      );
    });

    it('should return false when gateway is unhealthy', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 503
      });

      const result = await client.health();

      expect(result).toBe(false);
    });

    it('should return false on network error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Connection refused'));

      const result = await client.health();

      expect(result).toBe(false);
    });
  });

  describe('GatewayError', () => {
    it('should have status code', () => {
      const error = new GatewayError('Not found', 404);
      expect(error.statusCode).toBe(404);
      expect(error.message).toBe('Not found');
    });

    it('should have optional details', () => {
      const error = new GatewayError('Validation failed', 400, ['Field X is required']);
      expect(error.details).toContain('Field X is required');
    });
  });
});
