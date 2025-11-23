import { describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { handlers } from './handlers';

/**
 * Test MSW handlers to ensure they return correct responses
 * This validates our mock API implementation
 */

const server = setupServer(...handlers);

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('MSW Handlers', () => {
  describe('GET /api/v1/workflows', () => {
    it('returns list of workflows', async () => {
      const response = await fetch('/api/v1/workflows');
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('workflows');
      expect(data).toHaveProperty('total');
      expect(Array.isArray(data.workflows)).toBe(true);
      expect(data.workflows.length).toBe(5); // We have 5 mock workflows
    });

    it('includes workflow stats', async () => {
      const response = await fetch('/api/v1/workflows');
      const data = await response.json();

      const workflow = data.workflows[0];
      expect(workflow).toHaveProperty('name');
      expect(workflow).toHaveProperty('namespace');
      expect(workflow).toHaveProperty('stats');
      expect(workflow.stats).toHaveProperty('totalExecutions');
      expect(workflow.stats).toHaveProperty('successRate');
      expect(workflow.stats).toHaveProperty('avgDurationMs');
    });

    it('filters workflows by search query (name)', async () => {
      const response = await fetch('/api/v1/workflows?search=user');
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.workflows.length).toBe(2); // user-signup, user-onboarding
      expect(data.workflows.every((w: { name: string }) => w.name.includes('user'))).toBe(true);
      expect(data.total).toBe(2);
    });

    it('filters workflows by search query (description)', async () => {
      const response = await fetch('/api/v1/workflows?search=payment');
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.workflows.length).toBeGreaterThan(0);
      expect(
        data.workflows.some((w: { description: string }) =>
          w.description.toLowerCase().includes('payment')
        )
      ).toBe(true);
    });

    it('filters workflows by namespace', async () => {
      const response = await fetch('/api/v1/workflows?namespace=production');
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.workflows.every((w: { namespace: string }) => w.namespace === 'production')).toBe(true);
    });

    it('sorts workflows by name (ascending)', async () => {
      const response = await fetch('/api/v1/workflows?sort=name');
      const data = await response.json();

      expect(response.status).toBe(200);
      const names = data.workflows.map((w: { name: string }) => w.name);
      const sortedNames = [...names].sort();
      expect(names).toEqual(sortedNames);
    });

    it('sorts workflows by success rate (descending)', async () => {
      const response = await fetch('/api/v1/workflows?sort=success-rate');
      const data = await response.json();

      expect(response.status).toBe(200);
      const rates = data.workflows.map((w: { stats: { successRate: number } }) => w.stats.successRate);
      for (let i = 0; i < rates.length - 1; i++) {
        expect(rates[i]).toBeGreaterThanOrEqual(rates[i + 1]);
      }
    });

    it('sorts workflows by total executions (descending)', async () => {
      const response = await fetch('/api/v1/workflows?sort=executions');
      const data = await response.json();

      expect(response.status).toBe(200);
      const executions = data.workflows.map((w: { stats: { totalExecutions: number } }) => w.stats.totalExecutions);
      for (let i = 0; i < executions.length - 1; i++) {
        expect(executions[i]).toBeGreaterThanOrEqual(executions[i + 1]);
      }
    });

    it('combines search and namespace filters', async () => {
      const response = await fetch('/api/v1/workflows?search=order&namespace=production');
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(
        data.workflows.every((w: { name: string; namespace: string }) =>
          w.name.includes('order') && w.namespace === 'production'
        )
      ).toBe(true);
    });

    it('returns empty array when no workflows match filters', async () => {
      const response = await fetch('/api/v1/workflows?search=nonexistent');
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.workflows).toEqual([]);
      expect(data.total).toBe(0);
    });
  });

  describe('GET /api/v1/workflows/:name', () => {
    it('returns workflow details for valid name', async () => {
      const response = await fetch('/api/v1/workflows/user-signup');
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.name).toBe('user-signup');
      expect(data).toHaveProperty('tasks');
      expect(data).toHaveProperty('graph');
      expect(data).toHaveProperty('inputSchema');
      expect(data).toHaveProperty('outputSchema');
    });

    it('returns 404 for non-existent workflow', async () => {
      const response = await fetch('/api/v1/workflows/non-existent');
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data).toHaveProperty('error');
      expect(data.error).toContain('not found');
    });

    it('includes graph data with nodes and edges', async () => {
      const response = await fetch('/api/v1/workflows/order-processing');
      const data = await response.json();

      expect(data.graph).toHaveProperty('nodes');
      expect(data.graph).toHaveProperty('edges');
      expect(data.graph).toHaveProperty('parallelGroups');
      expect(Array.isArray(data.graph.nodes)).toBe(true);
      expect(Array.isArray(data.graph.edges)).toBe(true);
    });
  });

  describe('POST /api/v1/workflows/:name/execute', () => {
    it('executes workflow successfully with valid input', async () => {
      const response = await fetch('/api/v1/workflows/user-signup/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'password123',
          username: 'testuser',
        }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data).toHaveProperty('executionId');
      expect(data).toHaveProperty('workflowName');
      expect(data).toHaveProperty('tasks');
      expect(data).toHaveProperty('output');
    });

    it('simulates payment failure for high amounts', async () => {
      const response = await fetch('/api/v1/workflows/payment-flow/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: 150, // > 100 triggers failure
          currency: 'USD',
          cardToken: 'tok_123',
          customerId: 'cust_123',
        }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Card declined');
    });

    it('returns fallback execution for workflows without mock data', async () => {
      const response = await fetch('/api/v1/workflows/data-pipeline/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceUrl: 'https://example.com/data.csv',
          format: 'csv',
        }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.executionId).toMatch(/^exec-data-pipeline-/);
    });

    it('returns 404 for non-existent workflow', async () => {
      const response = await fetch('/api/v1/workflows/non-existent/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      expect(response.status).toBe(404);
    });

    it('returns validation error for invalid input', async () => {
      const response = await fetch('/api/v1/workflows/user-signup/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ simulateError: true }),
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toHaveProperty('error');
      expect(data.error).toContain('validation failed');
    });

    it('returns failed execution for schema mismatch workflow', async () => {
      const response = await fetch('/api/v1/workflows/user-onboarding/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: 'user-123', plan: 'pro' }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(false);
      expect(data).toHaveProperty('error');
      expect(data.error).toContain('Template resolution failed');
    });

    it('includes task execution details', async () => {
      const response = await fetch('/api/v1/workflows/order-processing/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: 'order-123',
          items: [{ productId: 'prod-1', quantity: 2 }],
          paymentMethod: 'card',
        }),
      });
      const data = await response.json();

      expect(data.tasks).toBeDefined();
      expect(Array.isArray(data.tasks)).toBe(true);
      const task = data.tasks[0];
      expect(task).toHaveProperty('taskId');
      expect(task).toHaveProperty('status');
      expect(task).toHaveProperty('durationMs');
      expect(task).toHaveProperty('retries');
    });
  });

  describe('POST /api/v1/workflows/:name/test', () => {
    it('returns dry-run response for valid workflow', async () => {
      const response = await fetch('/api/v1/workflows/user-signup/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'password123',
          username: 'testuser',
        }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('valid');
      expect(data).toHaveProperty('executionPlan');
      expect(data).toHaveProperty('templateResolution');
    });

    it('includes execution plan with parallel groups', async () => {
      const response = await fetch('/api/v1/workflows/order-processing/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: 'order-123',
          items: [],
          paymentMethod: 'card',
        }),
      });
      const data = await response.json();

      expect(data.executionPlan).toHaveProperty('totalTasks');
      expect(data.executionPlan).toHaveProperty('parallelGroups');
      expect(data.executionPlan).toHaveProperty('executionOrder');
      expect(Array.isArray(data.executionPlan.parallelGroups)).toBe(true);
    });

    it('returns validation errors for schema mismatch workflow', async () => {
      const response = await fetch('/api/v1/workflows/user-onboarding/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: 'user-123', plan: 'pro' }),
      });
      const data = await response.json();

      expect(data.valid).toBe(false);
      expect(data).toHaveProperty('validationErrors');
      expect(Array.isArray(data.validationErrors)).toBe(true);
      expect(data.validationErrors.length).toBeGreaterThan(0);
    });

    it('includes template resolution preview', async () => {
      const response = await fetch('/api/v1/workflows/user-signup/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'user@example.com',
          password: 'password123',
          username: 'johndoe',
        }),
      });
      const data = await response.json();

      expect(data.templateResolution).toBeDefined();
      expect(typeof data.templateResolution).toBe('object');
      // Should have resolution for each task
      expect(Object.keys(data.templateResolution).length).toBeGreaterThan(0);
    });

    it('returns fallback dry-run for workflows without mock data', async () => {
      const response = await fetch('/api/v1/workflows/data-pipeline/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceUrl: 'https://example.com/data.csv',
          format: 'csv',
        }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.valid).toBe(true);
      expect(data.executionPlan).toBeDefined();
      expect(data.executionPlan.totalTasks).toBe(0);
    });
  });

  describe('GET /api/v1/workflows/:name/executions', () => {
    it('returns execution history for workflow', async () => {
      const response = await fetch('/api/v1/workflows/user-signup/executions');
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('executions');
      expect(data).toHaveProperty('total');
      expect(Array.isArray(data.executions)).toBe(true);
    });

    it('supports pagination', async () => {
      const response = await fetch(
        '/api/v1/workflows/user-signup/executions?limit=2&offset=0'
      );
      const data = await response.json();

      expect(data.limit).toBe(2);
      expect(data.offset).toBe(0);
      expect(data.executions.length).toBeLessThanOrEqual(2);
    });

    it('supports status filtering', async () => {
      const response = await fetch(
        '/api/v1/workflows/user-signup/executions?status=succeeded'
      );
      const data = await response.json();

      data.executions.forEach((exec: { status: string }) => {
        expect(exec.status).toBe('succeeded');
      });
    });

    it('returns 404 for non-existent workflow', async () => {
      const response = await fetch('/api/v1/workflows/non-existent/executions');
      expect(response.status).toBe(404);
    });
  });

  describe('GET /api/v1/executions/:id', () => {
    it('returns execution details for valid ID', async () => {
      const response = await fetch('/api/v1/executions/exec-signup-001');
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('executionId');
      expect(data).toHaveProperty('workflowName');
      expect(data).toHaveProperty('tasks');
    });

    it('returns 404 for non-existent execution', async () => {
      const response = await fetch('/api/v1/executions/non-existent');
      expect(response.status).toBe(404);
    });
  });

  describe('GET /api/v1/tasks', () => {
    it('returns list of available tasks', async () => {
      const response = await fetch('/api/v1/tasks');
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('tasks');
      expect(Array.isArray(data.tasks)).toBe(true);
    });

    it('includes task schemas', async () => {
      const response = await fetch('/api/v1/tasks');
      const data = await response.json();

      const task = data.tasks[0];
      expect(task).toHaveProperty('name');
      expect(task).toHaveProperty('description');
      expect(task).toHaveProperty('inputSchema');
      expect(task).toHaveProperty('outputSchema');
    });
  });

  describe('GET /api/health', () => {
    it('returns health status', async () => {
      const response = await fetch('/api/health');
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe('healthy');
      expect(data).toHaveProperty('timestamp');
      expect(data).toHaveProperty('version');
    });
  });
});
