import { describe, it, expect, vi } from 'vitest';
import { suggestLabels } from '../tools/suggest-labels.js';
import type { ConsumerGatewayClient } from '../services/consumer-gateway-client.js';
import type { GatewayWorkflowResponse } from '../types.js';

// Mock gateway client factory
const createMockClient = (workflow?: GatewayWorkflowResponse): ConsumerGatewayClient => ({
  listWorkflows: vi.fn(),
  getWorkflow: workflow
    ? vi.fn().mockResolvedValue(workflow)
    : vi.fn().mockRejectedValue(new Error('Not found')),
  getWorkflowStats: vi.fn(),
  validateInput: vi.fn(),
  executeWorkflow: vi.fn(),
  getLabels: vi.fn(),
  listTasks: vi.fn(),
  getWorkflowsByTags: vi.fn(),
  getTasksByTags: vi.fn(),
  bulkUpdateWorkflowLabels: vi.fn(),
  bulkUpdateTaskLabels: vi.fn()
});

describe('suggestLabels', () => {
  describe('suggests tags based on workflow name patterns', () => {
    it('should suggest domain tags from workflow name', async () => {
      const mockWorkflow: GatewayWorkflowResponse = {
        name: 'order-processing-workflow',
        description: 'Process customer orders',
        tasks: []
      };

      const client = createMockClient(mockWorkflow);
      const result = await suggestLabels(client, {
        entityType: 'workflow',
        entityName: 'order-processing-workflow'
      });

      expect(result.entityName).toBe('order-processing-workflow');
      expect(result.suggestions.length).toBeGreaterThan(0);

      const orderTag = result.suggestions.find(s => s.label === 'orders');
      expect(orderTag).toBeDefined();
      expect(orderTag?.type).toBe('tag');
      expect(orderTag?.confidence).toBeGreaterThan(0.5);
    });

    it('should suggest technical tags from workflow name', async () => {
      const mockWorkflow: GatewayWorkflowResponse = {
        name: 'http-api-validator',
        description: 'Validates HTTP API responses',
        tasks: []
      };

      const client = createMockClient(mockWorkflow);
      const result = await suggestLabels(client, {
        entityType: 'workflow',
        entityName: 'http-api-validator'
      });

      const httpTag = result.suggestions.find(s => s.label === 'http-based');
      const validationTag = result.suggestions.find(s => s.label === 'validation');

      expect(httpTag).toBeDefined();
      expect(validationTag).toBeDefined();
    });
  });

  describe('suggests category based on task types', () => {
    it('should suggest category from name patterns', async () => {
      const mockWorkflow: GatewayWorkflowResponse = {
        name: 'payment-refund-processor',
        description: 'Process payment refunds',
        tasks: []
      };

      const client = createMockClient(mockWorkflow);
      const result = await suggestLabels(client, {
        entityType: 'workflow',
        entityName: 'payment-refund-processor'
      });

      const paymentCategory = result.suggestions.find(
        s => s.label === 'payments' && s.type === 'category'
      );
      expect(paymentCategory).toBeDefined();
    });
  });

  describe('returns confidence scores and reasons', () => {
    it('should include confidence and reason for each suggestion', async () => {
      const mockWorkflow: GatewayWorkflowResponse = {
        name: 'user-notification-service',
        tasks: []
      };

      const client = createMockClient(mockWorkflow);
      const result = await suggestLabels(client, {
        entityType: 'workflow',
        entityName: 'user-notification-service'
      });

      expect(result.suggestions.length).toBeGreaterThan(0);
      result.suggestions.forEach(suggestion => {
        expect(suggestion.confidence).toBeGreaterThan(0);
        expect(suggestion.confidence).toBeLessThanOrEqual(1);
        expect(suggestion.reason).toBeTruthy();
        expect(typeof suggestion.reason).toBe('string');
      });
    });

    it('should sort suggestions by confidence (highest first)', async () => {
      const mockWorkflow: GatewayWorkflowResponse = {
        name: 'order-payment-batch-processor',
        tasks: []
      };

      const client = createMockClient(mockWorkflow);
      const result = await suggestLabels(client, {
        entityType: 'workflow',
        entityName: 'order-payment-batch-processor'
      });

      for (let i = 1; i < result.suggestions.length; i++) {
        expect(result.suggestions[i - 1].confidence).toBeGreaterThanOrEqual(
          result.suggestions[i].confidence
        );
      }
    });
  });

  describe('handles unknown workflows gracefully', () => {
    it('should still suggest labels based on name when workflow not found', async () => {
      const client = createMockClient(); // No workflow - will throw error
      const result = await suggestLabels(client, {
        entityType: 'workflow',
        entityName: 'order-management-system'
      });

      expect(result.entityName).toBe('order-management-system');
      expect(result.suggestions.length).toBeGreaterThan(0);

      const orderTag = result.suggestions.find(s => s.label === 'orders');
      expect(orderTag).toBeDefined();
    });
  });

  describe('suggests for tasks', () => {
    it('should suggest labels for task names', async () => {
      const client = createMockClient();
      const result = await suggestLabels(client, {
        entityType: 'task',
        entityName: 'validate-payment-amount'
      });

      expect(result.entityName).toBe('validate-payment-amount');

      const paymentTag = result.suggestions.find(s => s.label === 'payments');
      const validationTag = result.suggestions.find(s => s.label === 'validation');

      expect(paymentTag).toBeDefined();
      expect(validationTag).toBeDefined();
    });
  });

  describe('suggests complexity tags from task count', () => {
    it('should suggest "complex" for workflows with many tasks', async () => {
      const mockWorkflow: GatewayWorkflowResponse = {
        name: 'multi-step-workflow',
        tasks: [
          { id: 't1', taskRef: 'task1' },
          { id: 't2', taskRef: 'task2' },
          { id: 't3', taskRef: 'task3' },
          { id: 't4', taskRef: 'task4' },
          { id: 't5', taskRef: 'task5' }
        ]
      };

      const client = createMockClient(mockWorkflow);
      const result = await suggestLabels(client, {
        entityType: 'workflow',
        entityName: 'multi-step-workflow'
      });

      const complexTag = result.suggestions.find(s => s.label === 'complex');
      expect(complexTag).toBeDefined();
    });

    it('should suggest "simple" for single-task workflows', async () => {
      const mockWorkflow: GatewayWorkflowResponse = {
        name: 'simple-task',
        tasks: [{ id: 't1', taskRef: 'task1' }]
      };

      const client = createMockClient(mockWorkflow);
      const result = await suggestLabels(client, {
        entityType: 'workflow',
        entityName: 'simple-task'
      });

      const simpleTag = result.suggestions.find(s => s.label === 'simple');
      expect(simpleTag).toBeDefined();
    });
  });
});
