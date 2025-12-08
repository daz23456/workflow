/**
 * Tests for MCP resources
 * Stage 15.4: MCP Resources & Prompts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getWorkflowResource,
  getWorkflowSchemaResource,
  listWorkflowResources
} from '../resources/workflow-resource.js';
import type { ConsumerGatewayClient } from '../services/consumer-gateway-client.js';
import type { GatewayWorkflowResponse } from '../types.js';

// Mock gateway client
function createMockClient(overrides?: Partial<ConsumerGatewayClient>): ConsumerGatewayClient {
  return {
    listWorkflows: vi.fn().mockResolvedValue([
      {
        name: 'order-processing',
        description: 'Process customer orders',
        categories: ['orders'],
        tags: ['v2'],
        input: {
          orderId: { type: 'string', required: true, description: 'Order ID' }
        },
        tasks: [{ id: 'task1', taskRef: 'get-order' }]
      },
      {
        name: 'user-profile',
        description: 'Get user profile',
        categories: ['users'],
        input: {
          userId: { type: 'string', required: true }
        },
        tasks: []
      }
    ] as GatewayWorkflowResponse[]),
    getWorkflow: vi.fn().mockResolvedValue({
      name: 'order-processing',
      description: 'Process customer orders end-to-end',
      categories: ['orders', 'payments'],
      tags: ['v2', 'production'],
      examples: [
        {
          name: 'Standard order',
          input: { orderId: 'ORD-123' },
          expectedOutput: { status: 'processed' }
        }
      ],
      input: {
        orderId: { type: 'string', required: true, description: 'The order identifier' },
        priority: { type: 'string', required: false, default: 'normal' }
      },
      tasks: [
        { id: 'fetch-order', taskRef: 'get-order', description: 'Fetch order details' },
        { id: 'process', taskRef: 'process-order', dependsOn: ['fetch-order'] }
      ]
    } as GatewayWorkflowResponse),
    getWorkflowStats: vi.fn().mockResolvedValue(null),
    validateInput: vi.fn().mockResolvedValue({ valid: true, missingInputs: [], invalidInputs: [] }),
    executeWorkflow: vi.fn().mockResolvedValue({ executionId: 'exec-123', status: 'completed', output: {}, taskResults: [], durationMs: 100 }),
    ...overrides
  };
}

describe('workflow resources', () => {
  let mockClient: ConsumerGatewayClient;

  beforeEach(() => {
    mockClient = createMockClient();
  });

  describe('listWorkflowResources', () => {
    it('should return list of workflow resources', async () => {
      const resources = await listWorkflowResources(mockClient);

      // 2 workflows x 2 resources each (main + schema) = 4
      expect(resources).toHaveLength(4);
      expect(resources[0].uri).toBe('workflow://order-processing');
      expect(resources[0].name).toBe('order-processing');
      expect(resources[0].description).toBe('Process customer orders');
      expect(resources[0].mimeType).toBe('application/json');
    });

    it('should include schema resources for each workflow', async () => {
      const resources = await listWorkflowResources(mockClient);

      // Each workflow should have both main resource and schema resource
      const orderResources = resources.filter(r => r.uri.includes('order-processing'));
      expect(orderResources.some(r => r.uri === 'workflow://order-processing')).toBe(true);
      expect(orderResources.some(r => r.uri === 'workflow://order-processing/schema')).toBe(true);
    });
  });

  describe('getWorkflowResource', () => {
    it('should return workflow details as resource content', async () => {
      const resource = await getWorkflowResource(mockClient, 'order-processing');

      expect(resource.uri).toBe('workflow://order-processing');
      expect(resource.name).toBe('order-processing');
      expect(resource.mimeType).toBe('application/json');

      const content = JSON.parse(resource.text);
      expect(content.name).toBe('order-processing');
      expect(content.description).toBe('Process customer orders end-to-end');
      expect(content.categories).toContain('orders');
    });

    it('should include examples in resource content', async () => {
      const resource = await getWorkflowResource(mockClient, 'order-processing');
      const content = JSON.parse(resource.text);

      expect(content.examples).toHaveLength(1);
      expect(content.examples[0].name).toBe('Standard order');
    });

    it('should throw error for unknown workflow', async () => {
      mockClient = createMockClient({
        getWorkflow: vi.fn().mockRejectedValue(new Error('Workflow not found: unknown'))
      });

      await expect(getWorkflowResource(mockClient, 'unknown'))
        .rejects.toThrow('Workflow not found');
    });
  });

  describe('getWorkflowSchemaResource', () => {
    it('should return input schema as resource', async () => {
      const resource = await getWorkflowSchemaResource(mockClient, 'order-processing');

      expect(resource.uri).toBe('workflow://order-processing/schema');
      expect(resource.name).toBe('order-processing input schema');
      expect(resource.mimeType).toBe('application/json');
    });

    it('should include field definitions in schema', async () => {
      const resource = await getWorkflowSchemaResource(mockClient, 'order-processing');
      const content = JSON.parse(resource.text);

      expect(content.properties.orderId).toBeDefined();
      expect(content.properties.orderId.type).toBe('string');
      expect(content.properties.orderId.description).toBe('The order identifier');
      expect(content.required).toContain('orderId');
    });

    it('should handle optional fields with defaults', async () => {
      const resource = await getWorkflowSchemaResource(mockClient, 'order-processing');
      const content = JSON.parse(resource.text);

      expect(content.properties.priority).toBeDefined();
      expect(content.properties.priority.default).toBe('normal');
      expect(content.required).not.toContain('priority');
    });

    it('should handle workflow with no input schema', async () => {
      mockClient = createMockClient({
        getWorkflow: vi.fn().mockResolvedValue({
          name: 'no-input-workflow',
          description: 'Workflow with no input',
          tasks: []
        } as GatewayWorkflowResponse)
      });

      const resource = await getWorkflowSchemaResource(mockClient, 'no-input-workflow');
      const content = JSON.parse(resource.text);

      expect(content.properties).toEqual({});
      expect(content.required).toEqual([]);
    });

    it('should handle workflow with fields without descriptions', async () => {
      mockClient = createMockClient({
        getWorkflow: vi.fn().mockResolvedValue({
          name: 'simple-workflow',
          input: {
            id: { type: 'string', required: true }
          },
          tasks: []
        } as GatewayWorkflowResponse)
      });

      const resource = await getWorkflowSchemaResource(mockClient, 'simple-workflow');
      const content = JSON.parse(resource.text);

      expect(content.properties.id.type).toBe('string');
      expect(content.properties.id.description).toBeUndefined();
    });
  });

  describe('edge cases', () => {
    it('should handle workflow with no categories/tags/examples', async () => {
      mockClient = createMockClient({
        getWorkflow: vi.fn().mockResolvedValue({
          name: 'minimal-workflow',
          tasks: []
        } as GatewayWorkflowResponse)
      });

      const resource = await getWorkflowResource(mockClient, 'minimal-workflow');
      const content = JSON.parse(resource.text);

      expect(content.categories).toEqual([]);
      expect(content.tags).toEqual([]);
      expect(content.examples).toEqual([]);
    });
  });
});
