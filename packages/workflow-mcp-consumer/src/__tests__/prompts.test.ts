/**
 * Tests for MCP prompts
 * Stage 15.4: MCP Resources & Prompts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getDiscoverWorkflowPrompt,
  getExecuteWorkflowPrompt,
  getTroubleshootExecutionPrompt
} from '../prompts/workflow-prompts.js';
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
        input: { orderId: { type: 'string', required: true } }
      },
      {
        name: 'user-profile',
        description: 'Get user profile data',
        categories: ['users'],
        input: { userId: { type: 'string', required: true } }
      }
    ] as GatewayWorkflowResponse[]),
    getWorkflow: vi.fn().mockResolvedValue({
      name: 'order-processing',
      description: 'Process customer orders end-to-end',
      categories: ['orders'],
      examples: [{ name: 'Example', input: { orderId: 'ORD-123' } }],
      input: {
        orderId: { type: 'string', required: true, description: 'Order ID' },
        priority: { type: 'string', required: false, default: 'normal' }
      },
      tasks: [{ id: 'task1', taskRef: 'get-order' }]
    } as GatewayWorkflowResponse),
    getWorkflowStats: vi.fn().mockResolvedValue(null),
    validateInput: vi.fn().mockResolvedValue({ valid: true, missingInputs: [], invalidInputs: [] }),
    executeWorkflow: vi.fn().mockResolvedValue({ executionId: 'exec-123', status: 'completed', output: {}, taskResults: [], durationMs: 100 }),
    ...overrides
  };
}

describe('workflow prompts', () => {
  let mockClient: ConsumerGatewayClient;

  beforeEach(() => {
    mockClient = createMockClient();
  });

  describe('getDiscoverWorkflowPrompt', () => {
    it('should generate discovery context with available workflows', async () => {
      const result = await getDiscoverWorkflowPrompt(mockClient, {
        intent: 'process an order'
      });

      expect(result.description).toContain('discover');
      expect(result.messages).toBeDefined();
      expect(result.messages.length).toBeGreaterThan(0);
    });

    it('should include workflow summaries in context', async () => {
      const result = await getDiscoverWorkflowPrompt(mockClient, {
        intent: 'get user data'
      });

      const systemMessage = result.messages.find(m => m.role === 'user');
      expect(systemMessage?.content).toContain('order-processing');
      expect(systemMessage?.content).toContain('user-profile');
    });

    it('should include the user intent in the prompt', async () => {
      const result = await getDiscoverWorkflowPrompt(mockClient, {
        intent: 'I want to check inventory levels'
      });

      const userMessage = result.messages.find(m => m.role === 'user');
      expect(userMessage?.content).toContain('check inventory levels');
    });
  });

  describe('getExecuteWorkflowPrompt', () => {
    it('should generate execution context for a workflow', async () => {
      const result = await getExecuteWorkflowPrompt(mockClient, {
        workflow: 'order-processing'
      });

      expect(result.description.toLowerCase()).toContain('execut');
      expect(result.messages).toBeDefined();
    });

    it('should include input schema in context', async () => {
      const result = await getExecuteWorkflowPrompt(mockClient, {
        workflow: 'order-processing'
      });

      const systemMessage = result.messages.find(m => m.role === 'user');
      expect(systemMessage?.content).toContain('orderId');
      expect(systemMessage?.content).toContain('required');
    });

    it('should include examples when available', async () => {
      const result = await getExecuteWorkflowPrompt(mockClient, {
        workflow: 'order-processing'
      });

      const systemMessage = result.messages.find(m => m.role === 'user');
      expect(systemMessage?.content).toContain('Example');
      expect(systemMessage?.content).toContain('ORD-123');
    });

    it('should include partial input if provided', async () => {
      const result = await getExecuteWorkflowPrompt(mockClient, {
        workflow: 'order-processing',
        partialInput: { orderId: 'ORD-456' }
      });

      const userMessage = result.messages.find(m => m.role === 'user');
      expect(userMessage?.content).toContain('ORD-456');
    });
  });

  describe('getTroubleshootExecutionPrompt', () => {
    it('should generate troubleshooting context', async () => {
      const result = await getTroubleshootExecutionPrompt(mockClient, {
        executionId: 'exec-failed-123',
        workflowName: 'order-processing',
        error: 'Connection timeout on task process-payment'
      });

      expect(result.description).toContain('troubleshoot');
      expect(result.messages).toBeDefined();
    });

    it('should include error details in context', async () => {
      const result = await getTroubleshootExecutionPrompt(mockClient, {
        executionId: 'exec-123',
        workflowName: 'order-processing',
        error: 'Database connection failed'
      });

      const userMessage = result.messages.find(m => m.role === 'user');
      expect(userMessage?.content).toContain('Database connection failed');
      expect(userMessage?.content).toContain('exec-123');
    });

    it('should include workflow context for troubleshooting', async () => {
      const result = await getTroubleshootExecutionPrompt(mockClient, {
        executionId: 'exec-123',
        workflowName: 'order-processing',
        error: 'Task failed'
      });

      const systemMessage = result.messages.find(m => m.role === 'user');
      expect(systemMessage?.content).toContain('order-processing');
    });
  });

  describe('edge cases', () => {
    it('should handle workflow with no description', async () => {
      mockClient = createMockClient({
        getWorkflow: vi.fn().mockResolvedValue({
          name: 'no-desc-workflow',
          input: {},
          tasks: []
        } as GatewayWorkflowResponse)
      });

      const result = await getExecuteWorkflowPrompt(mockClient, {
        workflow: 'no-desc-workflow'
      });

      expect(result.messages).toBeDefined();
    });

    it('should handle workflow with no input fields', async () => {
      mockClient = createMockClient({
        listWorkflows: vi.fn().mockResolvedValue([
          {
            name: 'no-input-workflow',
            description: 'No input needed'
          }
        ] as GatewayWorkflowResponse[])
      });

      const result = await getDiscoverWorkflowPrompt(mockClient, {
        intent: 'run something'
      });

      const userMessage = result.messages.find(m => m.role === 'user');
      expect(userMessage?.content).toContain('no input');
    });

    it('should handle workflow with no examples', async () => {
      mockClient = createMockClient({
        getWorkflow: vi.fn().mockResolvedValue({
          name: 'no-examples-workflow',
          description: 'Test workflow',
          input: { id: { type: 'string', required: true } },
          tasks: []
        } as GatewayWorkflowResponse)
      });

      const result = await getExecuteWorkflowPrompt(mockClient, {
        workflow: 'no-examples-workflow'
      });

      const userMessage = result.messages.find(m => m.role === 'user');
      // Should not contain example section
      expect(userMessage?.content).not.toContain('## Examples');
    });

    it('should handle troubleshooting with no tasks', async () => {
      mockClient = createMockClient({
        getWorkflow: vi.fn().mockResolvedValue({
          name: 'taskless-workflow',
          description: 'No tasks',
          tasks: []
        } as GatewayWorkflowResponse)
      });

      const result = await getTroubleshootExecutionPrompt(mockClient, {
        executionId: 'exec-123',
        workflowName: 'taskless-workflow',
        error: 'Something failed'
      });

      const userMessage = result.messages.find(m => m.role === 'user');
      expect(userMessage?.content).toContain('No tasks defined');
    });

    it('should handle workflow with input but no required fields', async () => {
      mockClient = createMockClient({
        getWorkflow: vi.fn().mockResolvedValue({
          name: 'optional-workflow',
          description: 'All optional inputs',
          input: {
            optionalField: { type: 'string', required: false, default: 'default-value' }
          },
          tasks: []
        } as GatewayWorkflowResponse)
      });

      const result = await getExecuteWorkflowPrompt(mockClient, {
        workflow: 'optional-workflow'
      });

      const userMessage = result.messages.find(m => m.role === 'user');
      expect(userMessage?.content).toContain('optionalField');
      expect(userMessage?.content).toContain('default-value');
    });
  });
});
