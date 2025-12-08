import { describe, it, expect, vi } from 'vitest';
import { listWorkflows } from '../tools/list-workflows.js';
import type { ConsumerGatewayClient } from '../services/consumer-gateway-client.js';
import type { GatewayWorkflowResponse } from '../types.js';

// Mock gateway client
const createMockClient = (workflows: GatewayWorkflowResponse[] = []): ConsumerGatewayClient => ({
  listWorkflows: vi.fn().mockResolvedValue(workflows),
  getWorkflow: vi.fn(),
  getWorkflowStats: vi.fn().mockResolvedValue(null),
  validateInput: vi.fn(),
  executeWorkflow: vi.fn(),
  // Stage 32.3: Label API methods
  getLabels: vi.fn(),
  listTasks: vi.fn(),
  getWorkflowsByTags: vi.fn(),
  getTasksByTags: vi.fn(),
  bulkUpdateWorkflowLabels: vi.fn(),
  bulkUpdateTaskLabels: vi.fn()
});

describe('listWorkflows', () => {
  describe('returns all workflows', () => {
    it('should return all workflows with metadata', async () => {
      const mockWorkflows: GatewayWorkflowResponse[] = [
        {
          name: 'order-processing',
          description: 'Process customer orders',
          categories: ['orders', 'payments'],
          tags: ['v2', 'production'],
          input: {
            orderId: { type: 'string', required: true, description: 'Order ID' },
            customerId: { type: 'string', required: true }
          },
          tasks: [
            { id: 'fetch-order', taskRef: 'get-order' },
            { id: 'validate', taskRef: 'validate-order' },
            { id: 'process', taskRef: 'process-order' }
          ]
        },
        {
          name: 'user-profile',
          description: 'Get user profile',
          categories: ['users'],
          input: {
            userId: { type: 'string', required: true }
          },
          tasks: [
            { id: 'fetch-user', taskRef: 'get-user' }
          ]
        }
      ];

      const client = createMockClient(mockWorkflows);
      const result = await listWorkflows(client, {});

      expect(result.total).toBe(2);
      expect(result.filtered).toBe(2);
      expect(result.workflows).toHaveLength(2);
      expect(result.workflows[0].name).toBe('order-processing');
      expect(result.workflows[0].description).toBe('Process customer orders');
      expect(result.workflows[0].categories).toEqual(['orders', 'payments']);
      expect(result.workflows[0].tags).toEqual(['v2', 'production']);
      expect(result.workflows[0].inputSummary).toContain('orderId');
      expect(result.workflows[0].taskCount).toBe(3);
    });

    it('should return empty array when no workflows', async () => {
      const client = createMockClient([]);
      const result = await listWorkflows(client, {});

      expect(result.total).toBe(0);
      expect(result.filtered).toBe(0);
      expect(result.workflows).toEqual([]);
    });
  });

  describe('filters by category', () => {
    it('should filter workflows by category', async () => {
      const mockWorkflows: GatewayWorkflowResponse[] = [
        { name: 'order-processing', description: 'Orders', categories: ['orders'], tasks: [] },
        { name: 'user-profile', description: 'Users', categories: ['users'], tasks: [] },
        { name: 'payment-refund', description: 'Payments', categories: ['payments', 'orders'], tasks: [] }
      ];

      const client = createMockClient(mockWorkflows);
      const result = await listWorkflows(client, { category: 'orders' });

      expect(result.total).toBe(3);
      expect(result.filtered).toBe(2);
      expect(result.workflows).toHaveLength(2);
      expect(result.workflows.map(w => w.name)).toContain('order-processing');
      expect(result.workflows.map(w => w.name)).toContain('payment-refund');
    });

    it('should return empty when no matching category', async () => {
      const mockWorkflows: GatewayWorkflowResponse[] = [
        { name: 'order-processing', description: 'Orders', categories: ['orders'], tasks: [] }
      ];

      const client = createMockClient(mockWorkflows);
      const result = await listWorkflows(client, { category: 'nonexistent' });

      expect(result.filtered).toBe(0);
      expect(result.workflows).toEqual([]);
    });
  });

  describe('filters by tags', () => {
    it('should filter workflows by tags (AND logic)', async () => {
      const mockWorkflows: GatewayWorkflowResponse[] = [
        { name: 'wf1', description: 'Workflow 1', tags: ['v2', 'production'], tasks: [] },
        { name: 'wf2', description: 'Workflow 2', tags: ['v2', 'staging'], tasks: [] },
        { name: 'wf3', description: 'Workflow 3', tags: ['v1', 'production'], tasks: [] }
      ];

      const client = createMockClient(mockWorkflows);
      const result = await listWorkflows(client, { tags: ['v2', 'production'] });

      expect(result.filtered).toBe(1);
      expect(result.workflows[0].name).toBe('wf1');
    });

    it('should handle single tag filter', async () => {
      const mockWorkflows: GatewayWorkflowResponse[] = [
        { name: 'wf1', description: 'Workflow 1', tags: ['v2'], tasks: [] },
        { name: 'wf2', description: 'Workflow 2', tags: ['v2'], tasks: [] },
        { name: 'wf3', description: 'Workflow 3', tags: ['v1'], tasks: [] }
      ];

      const client = createMockClient(mockWorkflows);
      const result = await listWorkflows(client, { tags: ['v2'] });

      expect(result.filtered).toBe(2);
    });
  });

  describe('includes stats when requested', () => {
    it('should include stats when includeStats is true', async () => {
      const mockWorkflows: GatewayWorkflowResponse[] = [
        { name: 'order-processing', description: 'Orders', tasks: [] }
      ];

      const client = createMockClient(mockWorkflows);
      client.getWorkflowStats = vi.fn().mockResolvedValue({
        workflowName: 'order-processing',
        totalExecutions: 1234,
        avgDurationMs: 450,
        successRate: 0.98
      });

      const result = await listWorkflows(client, { includeStats: true });

      expect(result.workflows[0].stats).toBeDefined();
      expect(result.workflows[0].stats?.executions).toBe(1234);
      expect(result.workflows[0].stats?.avgDurationMs).toBe(450);
      expect(result.workflows[0].stats?.successRate).toBe(0.98);
    });

    it('should not include stats when includeStats is false', async () => {
      const mockWorkflows: GatewayWorkflowResponse[] = [
        { name: 'order-processing', description: 'Orders', tasks: [] }
      ];

      const client = createMockClient(mockWorkflows);
      const result = await listWorkflows(client, { includeStats: false });

      expect(result.workflows[0].stats).toBeUndefined();
      expect(client.getWorkflowStats).not.toHaveBeenCalled();
    });
  });

  describe('filters by anyTags (OR logic)', () => {
    it('should match workflows with any of the specified tags', async () => {
      const mockWorkflows: GatewayWorkflowResponse[] = [
        { name: 'wf1', description: 'Workflow 1', tags: ['v2', 'production'], tasks: [] },
        { name: 'wf2', description: 'Workflow 2', tags: ['v1', 'staging'], tasks: [] },
        { name: 'wf3', description: 'Workflow 3', tags: ['v2', 'staging'], tasks: [] },
        { name: 'wf4', description: 'Workflow 4', tags: ['v3'], tasks: [] }
      ];

      const client = createMockClient(mockWorkflows);
      const result = await listWorkflows(client, { anyTags: ['production', 'staging'] });

      expect(result.filtered).toBe(3);
      expect(result.workflows.map(w => w.name)).toContain('wf1');
      expect(result.workflows.map(w => w.name)).toContain('wf2');
      expect(result.workflows.map(w => w.name)).toContain('wf3');
      expect(result.workflows.map(w => w.name)).not.toContain('wf4');
    });
  });

  describe('filters by excludeTags', () => {
    it('should exclude workflows with any of the specified tags', async () => {
      const mockWorkflows: GatewayWorkflowResponse[] = [
        { name: 'wf1', description: 'Workflow 1', tags: ['production'], tasks: [] },
        { name: 'wf2', description: 'Workflow 2', tags: ['deprecated'], tasks: [] },
        { name: 'wf3', description: 'Workflow 3', tags: ['beta'], tasks: [] },
        { name: 'wf4', description: 'Workflow 4', tags: ['deprecated', 'legacy'], tasks: [] }
      ];

      const client = createMockClient(mockWorkflows);
      const result = await listWorkflows(client, { excludeTags: ['deprecated', 'legacy'] });

      expect(result.filtered).toBe(2);
      expect(result.workflows.map(w => w.name)).toContain('wf1');
      expect(result.workflows.map(w => w.name)).toContain('wf3');
      expect(result.workflows.map(w => w.name)).not.toContain('wf2');
      expect(result.workflows.map(w => w.name)).not.toContain('wf4');
    });
  });

  describe('filters by multiple categories', () => {
    it('should match workflows in any of the specified categories', async () => {
      const mockWorkflows: GatewayWorkflowResponse[] = [
        { name: 'wf1', description: 'Workflow 1', categories: ['orders'], tasks: [] },
        { name: 'wf2', description: 'Workflow 2', categories: ['payments'], tasks: [] },
        { name: 'wf3', description: 'Workflow 3', categories: ['users'], tasks: [] },
        { name: 'wf4', description: 'Workflow 4', categories: ['orders', 'payments'], tasks: [] }
      ];

      const client = createMockClient(mockWorkflows);
      const result = await listWorkflows(client, { categories: ['orders', 'payments'] });

      expect(result.filtered).toBe(3);
      expect(result.workflows.map(w => w.name)).toContain('wf1');
      expect(result.workflows.map(w => w.name)).toContain('wf2');
      expect(result.workflows.map(w => w.name)).toContain('wf4');
      expect(result.workflows.map(w => w.name)).not.toContain('wf3');
    });
  });

  describe('combined filters', () => {
    it('should combine anyTags and excludeTags correctly', async () => {
      const mockWorkflows: GatewayWorkflowResponse[] = [
        { name: 'wf1', description: 'Workflow 1', tags: ['v2', 'production'], tasks: [] },
        { name: 'wf2', description: 'Workflow 2', tags: ['v2', 'deprecated'], tasks: [] },
        { name: 'wf3', description: 'Workflow 3', tags: ['v1', 'production'], tasks: [] }
      ];

      const client = createMockClient(mockWorkflows);
      const result = await listWorkflows(client, {
        anyTags: ['v2'],
        excludeTags: ['deprecated']
      });

      expect(result.filtered).toBe(1);
      expect(result.workflows[0].name).toBe('wf1');
    });

    it('should combine category and tag filters', async () => {
      const mockWorkflows: GatewayWorkflowResponse[] = [
        { name: 'wf1', description: 'Orders v2', categories: ['orders'], tags: ['v2'], tasks: [] },
        { name: 'wf2', description: 'Orders v1', categories: ['orders'], tags: ['v1'], tasks: [] },
        { name: 'wf3', description: 'Payments v2', categories: ['payments'], tags: ['v2'], tasks: [] }
      ];

      const client = createMockClient(mockWorkflows);
      const result = await listWorkflows(client, {
        category: 'orders',
        tags: ['v2']
      });

      expect(result.filtered).toBe(1);
      expect(result.workflows[0].name).toBe('wf1');
    });
  });

  describe('generates input summary', () => {
    it('should generate human-readable input summary', async () => {
      const mockWorkflows: GatewayWorkflowResponse[] = [
        {
          name: 'test',
          description: 'Test',
          input: {
            orderId: { type: 'string', required: true },
            amount: { type: 'number', required: true },
            notes: { type: 'string', required: false }
          },
          tasks: []
        }
      ];

      const client = createMockClient(mockWorkflows);
      const result = await listWorkflows(client, {});

      expect(result.workflows[0].inputSummary).toContain('orderId (string)');
      expect(result.workflows[0].inputSummary).toContain('amount (number)');
      // Optional fields may or may not be included
    });

    it('should handle workflows with no input', async () => {
      const mockWorkflows: GatewayWorkflowResponse[] = [
        { name: 'test', description: 'Test', tasks: [] }
      ];

      const client = createMockClient(mockWorkflows);
      const result = await listWorkflows(client, {});

      expect(result.workflows[0].inputSummary).toBe('No input required');
    });
  });
});
