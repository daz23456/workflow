import { describe, it, expect, vi } from 'vitest';
import { getWorkflowDetails } from '../tools/get-workflow-details.js';
import type { ConsumerGatewayClient } from '../services/consumer-gateway-client.js';
import type { GatewayWorkflowResponse } from '../types.js';

// Mock gateway client
const createMockClient = (): ConsumerGatewayClient => ({
  listWorkflows: vi.fn(),
  getWorkflow: vi.fn(),
  getWorkflowStats: vi.fn().mockResolvedValue(null),
  validateInput: vi.fn(),
  executeWorkflow: vi.fn()
});

describe('getWorkflowDetails', () => {
  describe('returns full schema', () => {
    it('should return complete workflow details with input schema', async () => {
      const mockWorkflow: GatewayWorkflowResponse = {
        name: 'order-processing',
        description: 'Process customer orders end-to-end',
        categories: ['orders', 'payments'],
        tags: ['v2', 'production'],
        input: {
          orderId: { type: 'string', required: true, description: 'The order identifier' },
          customerId: { type: 'string', required: true, description: 'The customer ID' },
          notes: { type: 'string', required: false, description: 'Optional notes' }
        },
        tasks: [
          { id: 'fetch-order', taskRef: 'get-order', dependsOn: [] },
          { id: 'validate', taskRef: 'validate-order', dependsOn: ['fetch-order'] },
          { id: 'process', taskRef: 'process-payment', dependsOn: ['validate'] }
        ]
      };

      const client = createMockClient();
      client.getWorkflow = vi.fn().mockResolvedValue(mockWorkflow);

      const result = await getWorkflowDetails(client, { name: 'order-processing' });

      expect(result.name).toBe('order-processing');
      expect(result.description).toBe('Process customer orders end-to-end');
      expect(result.inputSchema).toBeDefined();
      expect(result.inputSchema.orderId.type).toBe('string');
      expect(result.inputSchema.orderId.required).toBe(true);
      expect(result.inputSchema.orderId.description).toBe('The order identifier');
    });
  });

  describe('returns examples', () => {
    it('should return workflow examples', async () => {
      const mockWorkflow: GatewayWorkflowResponse = {
        name: 'order-processing',
        description: 'Process orders',
        examples: [
          {
            name: 'Happy path',
            description: 'Standard order processing',
            input: { orderId: '123', customerId: '456' },
            expectedOutput: { status: 'completed' }
          }
        ],
        tasks: []
      };

      const client = createMockClient();
      client.getWorkflow = vi.fn().mockResolvedValue(mockWorkflow);

      const result = await getWorkflowDetails(client, { name: 'order-processing' });

      expect(result.examples).toHaveLength(1);
      expect(result.examples[0].name).toBe('Happy path');
      expect(result.examples[0].input).toEqual({ orderId: '123', customerId: '456' });
    });

    it('should return empty examples if none defined', async () => {
      const mockWorkflow: GatewayWorkflowResponse = {
        name: 'simple-workflow',
        description: 'Simple',
        tasks: []
      };

      const client = createMockClient();
      client.getWorkflow = vi.fn().mockResolvedValue(mockWorkflow);

      const result = await getWorkflowDetails(client, { name: 'simple-workflow' });

      expect(result.examples).toEqual([]);
    });
  });

  describe('returns task list', () => {
    it('should return tasks with dependencies', async () => {
      const mockWorkflow: GatewayWorkflowResponse = {
        name: 'pipeline',
        description: 'Data pipeline',
        tasks: [
          { id: 'extract', taskRef: 'extract-data', description: 'Extract from source', dependsOn: [] },
          { id: 'transform', taskRef: 'transform-data', description: 'Transform data', dependsOn: ['extract'] },
          { id: 'load', taskRef: 'load-data', description: 'Load to destination', dependsOn: ['transform'] }
        ]
      };

      const client = createMockClient();
      client.getWorkflow = vi.fn().mockResolvedValue(mockWorkflow);

      const result = await getWorkflowDetails(client, { name: 'pipeline' });

      expect(result.tasks).toHaveLength(3);
      expect(result.tasks[0].id).toBe('extract');
      expect(result.tasks[0].description).toBe('Extract from source');
      expect(result.tasks[0].dependencies).toEqual([]);
      expect(result.tasks[1].dependencies).toEqual(['extract']);
      expect(result.tasks[2].dependencies).toEqual(['transform']);
    });
  });

  describe('returns 404 for unknown workflow', () => {
    it('should throw error for non-existent workflow', async () => {
      const client = createMockClient();
      client.getWorkflow = vi.fn().mockRejectedValue(new Error('Workflow not found: nonexistent'));

      await expect(getWorkflowDetails(client, { name: 'nonexistent' }))
        .rejects.toThrow('Workflow not found');
    });
  });

  describe('includes estimated duration', () => {
    it('should include estimated duration from stats', async () => {
      const mockWorkflow: GatewayWorkflowResponse = {
        name: 'order-processing',
        description: 'Process orders',
        tasks: []
      };

      const client = createMockClient();
      client.getWorkflow = vi.fn().mockResolvedValue(mockWorkflow);
      client.getWorkflowStats = vi.fn().mockResolvedValue({
        workflowName: 'order-processing',
        totalExecutions: 100,
        avgDurationMs: 450,
        successRate: 0.98
      });

      const result = await getWorkflowDetails(client, { name: 'order-processing' });

      expect(result.estimatedDurationMs).toBe(450);
    });
  });

  describe('includes categories and tags', () => {
    it('should include categories and tags in details', async () => {
      const mockWorkflow: GatewayWorkflowResponse = {
        name: 'order-processing',
        description: 'Process orders',
        categories: ['orders', 'payments'],
        tags: ['v2', 'critical'],
        tasks: []
      };

      const client = createMockClient();
      client.getWorkflow = vi.fn().mockResolvedValue(mockWorkflow);

      const result = await getWorkflowDetails(client, { name: 'order-processing' });

      expect(result.categories).toEqual(['orders', 'payments']);
      expect(result.tags).toEqual(['v2', 'critical']);
    });
  });
});
