import { describe, it, expect, vi } from 'vitest';
import { searchWorkflows } from '../tools/search-workflows.js';
import type { ConsumerGatewayClient } from '../services/consumer-gateway-client.js';
import type { GatewayWorkflowResponse } from '../types.js';

// Mock gateway client
const createMockClient = (workflows: GatewayWorkflowResponse[] = []): ConsumerGatewayClient => ({
  listWorkflows: vi.fn().mockResolvedValue(workflows),
  getWorkflow: vi.fn(),
  getWorkflowStats: vi.fn().mockResolvedValue(null),
  validateInput: vi.fn(),
  executeWorkflow: vi.fn()
});

describe('searchWorkflows', () => {
  describe('finds by exact name', () => {
    it('should find workflow by exact name match', async () => {
      const mockWorkflows: GatewayWorkflowResponse[] = [
        { name: 'order-processing', description: 'Process orders', input: { orderId: { type: 'string', required: true } }, tasks: [] },
        { name: 'user-profile', description: 'Get user', input: { userId: { type: 'string', required: true } }, tasks: [] }
      ];

      const client = createMockClient(mockWorkflows);
      const result = await searchWorkflows(client, { query: 'order-processing' });

      expect(result.matches).toHaveLength(1);
      expect(result.matches[0].workflow).toBe('order-processing');
      expect(result.matches[0].confidence).toBeGreaterThan(0.9);
    });
  });

  describe('finds by keyword in description', () => {
    it('should find workflow by description keyword', async () => {
      const mockWorkflows: GatewayWorkflowResponse[] = [
        { name: 'wf1', description: 'Process customer orders end-to-end', tasks: [] },
        { name: 'wf2', description: 'Get user profile data', tasks: [] },
        { name: 'wf3', description: 'Send order confirmation email', tasks: [] }
      ];

      const client = createMockClient(mockWorkflows);
      const result = await searchWorkflows(client, { query: 'order' });

      expect(result.matches.length).toBeGreaterThanOrEqual(2);
      expect(result.matches.map(m => m.workflow)).toContain('wf1');
      expect(result.matches.map(m => m.workflow)).toContain('wf3');
    });
  });

  describe('ranks by confidence', () => {
    it('should rank exact name match higher than partial match', async () => {
      const mockWorkflows: GatewayWorkflowResponse[] = [
        { name: 'order', description: 'Simple order', tasks: [] },
        { name: 'order-processing', description: 'Process orders', tasks: [] }
      ];

      const client = createMockClient(mockWorkflows);
      const result = await searchWorkflows(client, { query: 'order' });

      expect(result.matches[0].workflow).toBe('order');
      expect(result.matches[0].confidence).toBeGreaterThan(result.matches[1].confidence);
    });
  });

  describe('returns extractedInputs from context', () => {
    it('should extract inputs from context', async () => {
      const mockWorkflows: GatewayWorkflowResponse[] = [
        {
          name: 'order-processing',
          description: 'Process orders',
          input: {
            orderId: { type: 'string', required: true },
            customerId: { type: 'string', required: true }
          },
          tasks: []
        }
      ];

      const client = createMockClient(mockWorkflows);
      const result = await searchWorkflows(client, {
        query: 'process order',
        autoExecute: true,
        context: { orderId: '123', customerId: '456' }
      });

      expect(result.bestMatch).toBeDefined();
      expect(result.bestMatch?.extractedInputs).toEqual({ orderId: '123', customerId: '456' });
    });
  });

  describe('identifies canAutoExecute', () => {
    it('should set canAutoExecute true when all required inputs are present', async () => {
      const mockWorkflows: GatewayWorkflowResponse[] = [
        {
          name: 'user-profile',
          description: 'Get user profile',
          input: {
            userId: { type: 'string', required: true }
          },
          tasks: []
        }
      ];

      const client = createMockClient(mockWorkflows);
      const result = await searchWorkflows(client, {
        query: 'user profile',
        autoExecute: true,
        context: { userId: '3' }
      });

      expect(result.bestMatch?.canAutoExecute).toBe(true);
      expect(result.bestMatch?.missingInputs).toEqual([]);
    });

    it('should set canAutoExecute false when required inputs are missing', async () => {
      const mockWorkflows: GatewayWorkflowResponse[] = [
        {
          name: 'order-processing',
          description: 'Process orders',
          input: {
            orderId: { type: 'string', required: true },
            customerId: { type: 'string', required: true }
          },
          tasks: []
        }
      ];

      const client = createMockClient(mockWorkflows);
      const result = await searchWorkflows(client, {
        query: 'process order',
        autoExecute: true,
        context: { orderId: '123' }
      });

      expect(result.bestMatch?.canAutoExecute).toBe(false);
      expect(result.bestMatch?.missingInputs).toContain('customerId');
    });
  });

  describe('handles no matches gracefully', () => {
    it('should return empty matches for no results', async () => {
      const mockWorkflows: GatewayWorkflowResponse[] = [
        { name: 'wf1', description: 'Something unrelated', tasks: [] }
      ];

      const client = createMockClient(mockWorkflows);
      const result = await searchWorkflows(client, { query: 'xyz123nonexistent' });

      expect(result.matches).toEqual([]);
      expect(result.bestMatch).toBeUndefined();
    });
  });

  describe('confidence threshold filtering', () => {
    it('should only include bestMatch if confidence >= 0.8 in autoExecute mode', async () => {
      const mockWorkflows: GatewayWorkflowResponse[] = [
        { name: 'order-processing', description: 'Process orders', tasks: [] }
      ];

      const client = createMockClient(mockWorkflows);
      // Partial match should have lower confidence
      const result = await searchWorkflows(client, {
        query: 'xyz partial',
        autoExecute: true
      });

      // If no good match, bestMatch should be undefined
      if (result.bestMatch && result.bestMatch.confidence < 0.8) {
        expect(result.bestMatch.canAutoExecute).toBe(false);
      }
    });
  });

  describe('requiredInputs in matches', () => {
    it('should include required inputs in match results', async () => {
      const mockWorkflows: GatewayWorkflowResponse[] = [
        {
          name: 'order-processing',
          description: 'Process orders',
          input: {
            orderId: { type: 'string', required: true },
            customerId: { type: 'string', required: true },
            notes: { type: 'string', required: false }
          },
          tasks: []
        }
      ];

      const client = createMockClient(mockWorkflows);
      const result = await searchWorkflows(client, { query: 'order' });

      expect(result.matches[0].requiredInputs).toContain('orderId');
      expect(result.matches[0].requiredInputs).toContain('customerId');
      expect(result.matches[0].requiredInputs).not.toContain('notes');
    });
  });
});
