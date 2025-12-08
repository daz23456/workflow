/**
 * End-to-End Integration Tests for MCP Consumer
 * Stage 15.5: Integration & Documentation
 *
 * Tests the full discover → details → execute flow
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ConsumerGatewayClient } from '../services/consumer-gateway-client.js';
import type { GatewayWorkflowResponse, ValidationResult, ExecutionResult } from '../types.js';

// Import all modules to test E2E flow
import { searchWorkflows } from '../tools/search-workflows.js';
import { getWorkflowDetails } from '../tools/get-workflow-details.js';
import { executeWorkflow } from '../tools/execute-workflow.js';
import { listWorkflowResources, getWorkflowResource, getWorkflowSchemaResource } from '../resources/workflow-resource.js';
import { getDiscoverWorkflowPrompt, getExecuteWorkflowPrompt, getTroubleshootExecutionPrompt } from '../prompts/workflow-prompts.js';

// Mock gateway client that simulates a real workflow gateway
function createE2EMockClient(overrides?: Partial<ConsumerGatewayClient>): ConsumerGatewayClient {
  const mockWorkflows: GatewayWorkflowResponse[] = [
    {
      name: 'order-processing',
      description: 'Process customer orders end-to-end including payment and fulfillment',
      categories: ['orders', 'payments'],
      tags: ['v2', 'production'],
      examples: [
        {
          name: 'Standard order',
          input: { orderId: 'ORD-123', customerId: 'CUST-456' },
          expectedOutput: { status: 'processed', invoiceId: 'INV-789' }
        }
      ],
      input: {
        orderId: { type: 'string', required: true, description: 'The order identifier' },
        customerId: { type: 'string', required: true, description: 'Customer ID' },
        priority: { type: 'string', required: false, default: 'normal' }
      },
      tasks: [
        { id: 'fetch-order', taskRef: 'get-order', description: 'Fetch order from database' },
        { id: 'validate-payment', taskRef: 'check-payment', dependsOn: ['fetch-order'], description: 'Validate payment details' },
        { id: 'process-fulfillment', taskRef: 'fulfill-order', dependsOn: ['validate-payment'], description: 'Process order fulfillment' }
      ]
    },
    {
      name: 'user-profile',
      description: 'Get user profile information',
      categories: ['users'],
      input: {
        userId: { type: 'string', required: true, description: 'User ID to look up' }
      },
      tasks: [
        { id: 'fetch-user', taskRef: 'get-user' }
      ]
    }
  ];

  return {
    listWorkflows: vi.fn().mockResolvedValue(mockWorkflows),
    getWorkflow: vi.fn().mockImplementation((name: string) => {
      const wf = mockWorkflows.find(w => w.name === name);
      if (!wf) {
        return Promise.reject(new Error(`Workflow not found: ${name}`));
      }
      return Promise.resolve(wf);
    }),
    getWorkflowStats: vi.fn().mockResolvedValue({
      executions: 1234,
      avgDurationMs: 450,
      successRate: 0.98
    }),
    validateInput: vi.fn().mockImplementation((_workflow: string, input: Record<string, unknown>): Promise<ValidationResult> => {
      const missing: { field: string; type: string; description?: string }[] = [];
      const invalid: { field: string; error: string; received?: unknown }[] = [];

      // Simulate validation for order-processing
      if (!input.orderId) {
        missing.push({ field: 'orderId', type: 'string', description: 'The order identifier' });
      }
      if (!input.customerId) {
        missing.push({ field: 'customerId', type: 'string', description: 'Customer ID' });
      }

      const isValid = missing.length === 0 && invalid.length === 0;
      let suggestedPrompt: string | undefined;

      if (!isValid) {
        const missingFields = missing.map(m => `${m.field} (${m.type})`).join(', ');
        suggestedPrompt = `Please provide the following required inputs: ${missingFields}`;
      }

      return Promise.resolve({
        valid: isValid,
        missingInputs: missing,
        invalidInputs: invalid,
        suggestedPrompt
      });
    }),
    executeWorkflow: vi.fn().mockResolvedValue({
      executionId: 'exec-e2e-123',
      status: 'completed',
      output: { status: 'processed', invoiceId: 'INV-789' },
      taskResults: [
        { taskId: 'fetch-order', status: 'completed', durationMs: 50, output: { orderId: 'ORD-123' } },
        { taskId: 'validate-payment', status: 'completed', durationMs: 100, output: { valid: true } },
        { taskId: 'process-fulfillment', status: 'completed', durationMs: 200, output: { shipped: true } }
      ],
      durationMs: 350
    } as ExecutionResult),
    ...overrides
  };
}

describe('E2E: Full Discovery to Execution Flow', () => {
  let client: ConsumerGatewayClient;

  beforeEach(() => {
    client = createE2EMockClient();
  });

  it('should discover workflow by intent', async () => {
    // Step 1: Search for workflows by natural language query
    const searchResult = await searchWorkflows(client, {
      query: 'process an order',
      autoExecute: true
    });

    // Should find order-processing with high confidence
    expect(searchResult.matches.length).toBeGreaterThan(0);
    expect(searchResult.bestMatch).toBeDefined();
    expect(searchResult.bestMatch?.workflow).toBe('order-processing');
    expect(searchResult.bestMatch?.confidence).toBeGreaterThanOrEqual(0.8);
  });

  it('should get details and understand schema', async () => {
    // Step 2: Get full workflow details
    const details = await getWorkflowDetails(client, { name: 'order-processing' });

    // Should have complete schema information
    expect(details.name).toBe('order-processing');
    expect(details.description).toContain('orders');
    expect(details.inputSchema).toBeDefined();
    expect(details.inputSchema.orderId).toBeDefined();
    expect(details.inputSchema.orderId.required).toBe(true);
    expect(details.inputSchema.customerId.required).toBe(true);
    expect(details.examples.length).toBeGreaterThan(0);
    expect(details.tasks.length).toBe(3);
  });

  it('should execute with valid input', async () => {
    // Step 3: Execute workflow with all required inputs
    const result = await executeWorkflow(client, {
      workflow: 'order-processing',
      input: { orderId: 'ORD-123', customerId: 'CUST-456' }
    });

    // Should succeed
    expect(result.success).toBe(true);
    if (result.success && !('executionPlan' in result)) {
      expect(result.executionId).toBe('exec-e2e-123');
      expect(result.output).toEqual({ status: 'processed', invoiceId: 'INV-789' });
      expect(result.taskResults).toHaveLength(3);
      expect(result.durationMs).toBe(350);
    }
  });

  it('should handle validation error gracefully', async () => {
    // Step 3 (error path): Execute with missing input
    const result = await executeWorkflow(client, {
      workflow: 'order-processing',
      input: { orderId: 'ORD-123' } // Missing customerId
    });

    // Should return validation error
    expect(result.success).toBe(false);
    if (!result.success && result.errorType === 'validation') {
      expect(result.missingInputs.some(m => m.field === 'customerId')).toBe(true);
      expect(result.suggestedPrompt).toBeDefined();
    }
  });

  it('should autoExecute mode work end-to-end with context extraction', async () => {
    // Full autoExecute flow
    const searchResult = await searchWorkflows(client, {
      query: 'get user profile for user 3',
      autoExecute: true,
      context: { userId: '3' }
    });

    // Should extract userId from context
    expect(searchResult.bestMatch?.workflow).toBe('user-profile');
    expect(searchResult.bestMatch?.extractedInputs).toEqual({ userId: '3' });
    expect(searchResult.bestMatch?.canAutoExecute).toBe(true);
    expect(searchResult.bestMatch?.missingInputs).toEqual([]);
  });
});

describe('E2E: Resources Integration', () => {
  let client: ConsumerGatewayClient;

  beforeEach(() => {
    client = createE2EMockClient();
  });

  it('should list all workflow resources', async () => {
    const resources = await listWorkflowResources(client);

    // Should have 4 resources (2 workflows x 2 each: main + schema)
    expect(resources.length).toBe(4);
    expect(resources.some(r => r.uri === 'workflow://order-processing')).toBe(true);
    expect(resources.some(r => r.uri === 'workflow://order-processing/schema')).toBe(true);
    expect(resources.some(r => r.uri === 'workflow://user-profile')).toBe(true);
    expect(resources.some(r => r.uri === 'workflow://user-profile/schema')).toBe(true);
  });

  it('should get workflow resource content', async () => {
    const resource = await getWorkflowResource(client, 'order-processing');

    expect(resource.uri).toBe('workflow://order-processing');
    expect(resource.mimeType).toBe('application/json');

    const content = JSON.parse(resource.text);
    expect(content.name).toBe('order-processing');
    expect(content.categories).toContain('orders');
  });

  it('should get workflow schema resource', async () => {
    const resource = await getWorkflowSchemaResource(client, 'order-processing');

    expect(resource.uri).toBe('workflow://order-processing/schema');

    const schema = JSON.parse(resource.text);
    expect(schema.$schema).toBe('http://json-schema.org/draft-07/schema#');
    expect(schema.properties.orderId).toBeDefined();
    expect(schema.required).toContain('orderId');
  });
});

describe('E2E: Prompts Integration', () => {
  let client: ConsumerGatewayClient;

  beforeEach(() => {
    client = createE2EMockClient();
  });

  it('should generate discovery prompt with workflow context', async () => {
    const prompt = await getDiscoverWorkflowPrompt(client, {
      intent: 'I need to process an order'
    });

    expect(prompt.description).toContain('discover');
    expect(prompt.messages.length).toBeGreaterThan(0);

    const content = prompt.messages[0].content;
    expect(content).toContain('order-processing');
    expect(content).toContain('user-profile');
    expect(content).toContain('process an order');
  });

  it('should generate execution prompt with schema details', async () => {
    const prompt = await getExecuteWorkflowPrompt(client, {
      workflow: 'order-processing',
      partialInput: { orderId: 'ORD-999' }
    });

    expect(prompt.description.toLowerCase()).toContain('execut');
    expect(prompt.messages.length).toBeGreaterThan(0);

    const content = prompt.messages[0].content;
    expect(content).toContain('order-processing');
    expect(content).toContain('orderId');
    expect(content).toContain('customerId');
    expect(content).toContain('ORD-999'); // Partial input included
  });

  it('should generate troubleshoot prompt with error context', async () => {
    const prompt = await getTroubleshootExecutionPrompt(client, {
      executionId: 'exec-failed-123',
      workflowName: 'order-processing',
      error: 'Payment gateway timeout on task validate-payment'
    });

    expect(prompt.description).toContain('troubleshoot');
    expect(prompt.messages.length).toBeGreaterThan(0);

    const content = prompt.messages[0].content;
    expect(content).toContain('exec-failed-123');
    expect(content).toContain('Payment gateway timeout');
    expect(content).toContain('order-processing');
    expect(content).toContain('validate-payment');
  });
});
