/**
 * Unit tests for API client
 *
 * Testing strategy:
 * - Mock global fetch to isolate client logic
 * - Test success scenarios for all endpoints
 * - Test error handling (4xx, 5xx, network failures)
 * - Test URL construction and query parameters
 * - Test request headers and body serialization
 */

import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import * as client from './client';
import { server } from '../mocks/server';

// Mock global fetch
const mockFetch = vi.fn();

describe('API Client', () => {
  // Disable MSW for these unit tests - we're testing the client layer directly
  beforeAll(() => {
    server.close();
    global.fetch = mockFetch;
  });

  afterAll(() => {
    vi.restoreAllMocks();
    // Restart MSW for other tests
    server.listen({ onUnhandledRequest: 'error' });
  });

  beforeEach(() => {
    mockFetch.mockClear();
    // Note: API_BASE_URL is set at module import time, so we use the default localhost:5000
  });

  afterEach(() => {
    // Don't restore mocks here - keep fetch mocked throughout
  });

  describe('apiFetch (base function)', () => {
    it('should construct correct URL from endpoint', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ data: 'test' }),
      });

      await client.listWorkflows();

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:5000/api/v1/workflows',
        expect.any(Object)
      );
    });

    it('should use default API_BASE_URL when env var not set', async () => {
      // Remove env var to test fallback
      delete process.env.API_BASE_URL;

      // Re-import to get new constant value
      vi.resetModules();
      const freshClient = await import('./client');

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ workflows: [] }),
      });

      await freshClient.listWorkflows();

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:5000/api/v1/workflows',
        expect.any(Object)
      );

      // Restore for other tests
      process.env.API_BASE_URL = 'http://localhost:5000/api/v1';
    });

    it('should include Content-Type header', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ workflows: [] }),
      });

      await client.listWorkflows();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        })
      );
    });

    it('should merge custom headers with default headers', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      });

      await client.executeWorkflow('test-workflow', { input: { test: true } });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        })
      );
    });

    it('should parse JSON response on success', async () => {
      const mockData = { workflows: [{ name: 'test' }] };
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockData,
      });

      const result = await client.listWorkflows();

      expect(result).toEqual(mockData);
    });

    it('should throw error for HTTP 404 with JSON error response', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: async () => ({ message: 'Workflow not found' }),
      });

      await expect(client.getWorkflowDetail('non-existent')).rejects.toThrow(
        'Workflow not found'
      );
    });

    it('should throw error for HTTP 500 with JSON error response', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: async () => ({ message: 'Database connection failed' }),
      });

      await expect(client.listWorkflows()).rejects.toThrow('Database connection failed');
    });

    it('should use status text when error response is not JSON', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 503,
        statusText: 'Service Unavailable',
        json: async () => {
          throw new Error('Not JSON');
        },
      });

      await expect(client.listWorkflows()).rejects.toThrow('HTTP 503: Service Unavailable');
    });

    it('should throw error for network failure', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      await expect(client.listWorkflows()).rejects.toThrow('Network error');
    });

    it('should handle unknown error types', async () => {
      mockFetch.mockRejectedValue('Unknown error');

      await expect(client.listWorkflows()).rejects.toThrow(
        'Unknown error occurred while calling API'
      );
    });
  });

  describe('Workflow Management API', () => {
    describe('listWorkflows', () => {
      it('should call correct endpoint without namespace', async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          json: async () => ({ workflows: [] }),
        });

        await client.listWorkflows();

        expect(mockFetch).toHaveBeenCalledWith(
          'http://localhost:5000/api/v1/workflows',
          expect.any(Object)
        );
      });

      it('should include namespace query parameter when provided', async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          json: async () => ({ workflows: [] }),
        });

        await client.listWorkflows('production');

        expect(mockFetch).toHaveBeenCalledWith(
          'http://localhost:5000/api/v1/workflows?namespace=production',
          expect.any(Object)
        );
      });

      it('should URL-encode namespace with special characters', async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          json: async () => ({ workflows: [] }),
        });

        await client.listWorkflows('prod/staging');

        expect(mockFetch).toHaveBeenCalledWith(
          'http://localhost:5000/api/v1/workflows?namespace=prod%2Fstaging',
          expect.any(Object)
        );
      });
    });

    describe('listTasks', () => {
      it('should call correct endpoint without namespace', async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          json: async () => ({ tasks: [] }),
        });

        await client.listTasks();

        expect(mockFetch).toHaveBeenCalledWith(
          'http://localhost:5000/api/v1/tasks',
          expect.any(Object)
        );
      });

      it('should include namespace query parameter when provided', async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          json: async () => ({ tasks: [] }),
        });

        await client.listTasks('staging');

        expect(mockFetch).toHaveBeenCalledWith(
          'http://localhost:5000/api/v1/tasks?namespace=staging',
          expect.any(Object)
        );
      });
    });

    describe('getWorkflowVersions', () => {
      it('should call correct endpoint with encoded workflow name', async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          json: async () => ({ versions: [] }),
        });

        await client.getWorkflowVersions('user-signup');

        expect(mockFetch).toHaveBeenCalledWith(
          'http://localhost:5000/api/v1/workflows/user-signup/versions',
          expect.any(Object)
        );
      });

      it('should URL-encode workflow name with special characters', async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          json: async () => ({ versions: [] }),
        });

        await client.getWorkflowVersions('user/signup');

        expect(mockFetch).toHaveBeenCalledWith(
          'http://localhost:5000/api/v1/workflows/user%2Fsignup/versions',
          expect.any(Object)
        );
      });
    });
  });

  describe('Workflow Execution API', () => {
    describe('getWorkflowDetail', () => {
      it('should call correct endpoint', async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          json: async () => ({ name: 'test-workflow' }),
        });

        await client.getWorkflowDetail('test-workflow');

        expect(mockFetch).toHaveBeenCalledWith(
          'http://localhost:5000/api/v1/workflows/test-workflow',
          expect.any(Object)
        );
      });
    });

    describe('executeWorkflow', () => {
      it('should POST to correct endpoint with request body', async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          json: async () => ({ executionId: '123' }),
        });

        const request = { input: { email: 'test@example.com' } };
        await client.executeWorkflow('user-signup', request);

        expect(mockFetch).toHaveBeenCalledWith(
          'http://localhost:5000/api/v1/workflows/user-signup/execute',
          expect.objectContaining({
            method: 'POST',
            body: JSON.stringify(request),
          })
        );
      });
    });

    describe('testWorkflow', () => {
      it('should POST to correct test endpoint with request body', async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          json: async () => ({ isValid: true }),
        });

        const request = { input: { email: 'test@example.com' } };
        await client.testWorkflow('user-signup', request);

        expect(mockFetch).toHaveBeenCalledWith(
          'http://localhost:5000/api/v1/workflows/user-signup/test',
          expect.objectContaining({
            method: 'POST',
            body: JSON.stringify(request),
          })
        );
      });
    });

    describe('listWorkflowExecutions', () => {
      it('should call endpoint without query parameters', async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          json: async () => ({ executions: [] }),
        });

        await client.listWorkflowExecutions('test-workflow');

        expect(mockFetch).toHaveBeenCalledWith(
          'http://localhost:5000/api/v1/workflows/test-workflow/executions',
          expect.any(Object)
        );
      });

      it('should include namespace filter', async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          json: async () => ({ executions: [] }),
        });

        await client.listWorkflowExecutions('test-workflow', { namespace: 'production' });

        expect(mockFetch).toHaveBeenCalledWith(
          'http://localhost:5000/api/v1/workflows/test-workflow/executions?namespace=production',
          expect.any(Object)
        );
      });

      it('should include status filter', async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          json: async () => ({ executions: [] }),
        });

        await client.listWorkflowExecutions('test-workflow', { status: 'Succeeded' });

        expect(mockFetch).toHaveBeenCalledWith(
          'http://localhost:5000/api/v1/workflows/test-workflow/executions?status=Succeeded',
          expect.any(Object)
        );
      });

      it('should include pagination parameters', async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          json: async () => ({ executions: [] }),
        });

        await client.listWorkflowExecutions('test-workflow', { skip: 10, take: 20 });

        expect(mockFetch).toHaveBeenCalledWith(
          'http://localhost:5000/api/v1/workflows/test-workflow/executions?skip=10&take=20',
          expect.any(Object)
        );
      });

      it('should handle skip=0 correctly', async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          json: async () => ({ executions: [] }),
        });

        await client.listWorkflowExecutions('test-workflow', { skip: 0 });

        expect(mockFetch).toHaveBeenCalledWith(
          'http://localhost:5000/api/v1/workflows/test-workflow/executions?skip=0',
          expect.any(Object)
        );
      });

      it('should combine all filters', async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          json: async () => ({ executions: [] }),
        });

        await client.listWorkflowExecutions('test-workflow', {
          namespace: 'production',
          status: 'Failed',
          skip: 5,
          take: 10,
        });

        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('namespace=production'),
          expect.any(Object)
        );
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('status=Failed'),
          expect.any(Object)
        );
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('skip=5'),
          expect.any(Object)
        );
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('take=10'),
          expect.any(Object)
        );
      });
    });

    describe('getWorkflowDurationTrends', () => {
      it('should use default daysBack=30', async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          json: async () => ({ dataPoints: [] }),
        });

        await client.getWorkflowDurationTrends('test-workflow');

        expect(mockFetch).toHaveBeenCalledWith(
          'http://localhost:5000/api/v1/workflows/test-workflow/duration-trends?daysBack=30',
          expect.any(Object)
        );
      });

      it('should use custom daysBack value', async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          json: async () => ({ dataPoints: [] }),
        });

        await client.getWorkflowDurationTrends('test-workflow', 7);

        expect(mockFetch).toHaveBeenCalledWith(
          'http://localhost:5000/api/v1/workflows/test-workflow/duration-trends?daysBack=7',
          expect.any(Object)
        );
      });
    });
  });

  describe('Execution History API', () => {
    describe('listExecutionsForWorkflow', () => {
      it('should call alternative executions endpoint', async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          json: async () => ({ executions: [] }),
        });

        await client.listExecutionsForWorkflow('test-workflow');

        expect(mockFetch).toHaveBeenCalledWith(
          'http://localhost:5000/api/v1/executions/workflows/test-workflow/list',
          expect.any(Object)
        );
      });

      it('should include filters', async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          json: async () => ({ executions: [] }),
        });

        await client.listExecutionsForWorkflow('test-workflow', {
          status: 'Succeeded',
          skip: 0,
          take: 50,
        });

        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('status=Succeeded'),
          expect.any(Object)
        );
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('skip=0'),
          expect.any(Object)
        );
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('take=50'),
          expect.any(Object)
        );
      });
    });

    describe('getExecutionDetail', () => {
      it('should call correct endpoint with execution ID', async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          json: async () => ({ executionId: 'abc-123' }),
        });

        await client.getExecutionDetail('abc-123');

        expect(mockFetch).toHaveBeenCalledWith(
          'http://localhost:5000/api/v1/executions/abc-123',
          expect.any(Object)
        );
      });

      it('should URL-encode execution ID', async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          json: async () => ({ executionId: 'abc/123' }),
        });

        await client.getExecutionDetail('abc/123');

        expect(mockFetch).toHaveBeenCalledWith(
          'http://localhost:5000/api/v1/executions/abc%2F123',
          expect.any(Object)
        );
      });
    });

    describe('getExecutionTrace', () => {
      it('should call trace endpoint', async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          json: async () => ({ trace: [] }),
        });

        await client.getExecutionTrace('exec-456');

        expect(mockFetch).toHaveBeenCalledWith(
          'http://localhost:5000/api/v1/executions/exec-456/trace',
          expect.any(Object)
        );
      });
    });
  });

  describe('Task Management API', () => {
    describe('getTaskDetail', () => {
      it('should call correct endpoint', async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          json: async () => ({ name: 'send-email' }),
        });

        await client.getTaskDetail('send-email');

        expect(mockFetch).toHaveBeenCalledWith(
          'http://localhost:5000/api/v1/tasks/send-email',
          expect.any(Object)
        );
      });
    });

    describe('getTaskUsage', () => {
      it('should call usage endpoint without pagination', async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          json: async () => ({ workflows: [] }),
        });

        await client.getTaskUsage('send-email');

        expect(mockFetch).toHaveBeenCalledWith(
          'http://localhost:5000/api/v1/tasks/send-email/usage',
          expect.any(Object)
        );
      });

      it('should include pagination parameters', async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          json: async () => ({ workflows: [] }),
        });

        await client.getTaskUsage('send-email', { skip: 10, take: 5 });

        expect(mockFetch).toHaveBeenCalledWith(
          'http://localhost:5000/api/v1/tasks/send-email/usage?skip=10&take=5',
          expect.any(Object)
        );
      });
    });

    describe('getTaskExecutions', () => {
      it('should call task executions endpoint', async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          json: async () => ({ executions: [] }),
        });

        await client.getTaskExecutions('send-email');

        expect(mockFetch).toHaveBeenCalledWith(
          'http://localhost:5000/api/v1/tasks/send-email/executions',
          expect.any(Object)
        );
      });

      it('should include workflow filter', async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          json: async () => ({ executions: [] }),
        });

        await client.getTaskExecutions('send-email', { workflow: 'user-signup' });

        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('workflow=user-signup'),
          expect.any(Object)
        );
      });

      it('should include all filters', async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          json: async () => ({ executions: [] }),
        });

        await client.getTaskExecutions('send-email', {
          workflow: 'user-signup',
          status: 'Succeeded',
          skip: 0,
          take: 100,
        });

        const url = mockFetch.mock.calls[0][0] as string;
        expect(url).toContain('workflow=user-signup');
        expect(url).toContain('status=Succeeded');
        expect(url).toContain('skip=0');
        expect(url).toContain('take=100');
      });
    });

    describe('executeTask', () => {
      it('should POST to task execute endpoint', async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          json: async () => ({ success: true }),
        });

        const input = { to: 'user@example.com', subject: 'Welcome' };
        await client.executeTask('send-email', input);

        expect(mockFetch).toHaveBeenCalledWith(
          'http://localhost:5000/api/v1/tasks/send-email/execute',
          expect.objectContaining({
            method: 'POST',
            body: JSON.stringify({ input }),
          })
        );
      });
    });

    describe('getTaskDurationTrends', () => {
      it('should use default daysBack=30', async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          json: async () => ({ dataPoints: [] }),
        });

        await client.getTaskDurationTrends('send-email');

        expect(mockFetch).toHaveBeenCalledWith(
          'http://localhost:5000/api/v1/tasks/send-email/duration-trends?daysBack=30',
          expect.any(Object)
        );
      });

      it('should use custom daysBack value', async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          json: async () => ({ dataPoints: [] }),
        });

        await client.getTaskDurationTrends('send-email', 14);

        expect(mockFetch).toHaveBeenCalledWith(
          'http://localhost:5000/api/v1/tasks/send-email/duration-trends?daysBack=14',
          expect.any(Object)
        );
      });
    });
  });

  describe('Health Check API', () => {
    describe('checkHealth', () => {
      it('should call health endpoint (replacing /api/v1 with /health)', async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          json: async () => ({}),
        });

        await client.checkHealth();

        expect(mockFetch).toHaveBeenCalledWith('http://localhost:5000/health');
      });

      it('should return healthy status on success', async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          json: async () => ({}),
        });

        const result = await client.checkHealth();

        expect(result).toEqual({ status: 'healthy' });
      });

      it('should throw error when health check fails', async () => {
        mockFetch.mockResolvedValue({
          ok: false,
        });

        await expect(client.checkHealth()).rejects.toThrow('Health check failed');
      });
    });
  });
});
