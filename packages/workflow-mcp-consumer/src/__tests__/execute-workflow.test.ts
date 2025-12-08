/**
 * Tests for execute_workflow MCP tool
 * Stage 15.3: MCP Execution Tool
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { executeWorkflow } from '../tools/execute-workflow.js';
import type { ConsumerGatewayClient, ExecutionResult, ValidationInputResult } from '../services/consumer-gateway-client.js';
import type { GatewayWorkflowResponse } from '../types.js';

// Mock gateway client
function createMockClient(overrides?: Partial<ConsumerGatewayClient>): ConsumerGatewayClient {
  return {
    listWorkflows: vi.fn().mockResolvedValue([]),
    getWorkflow: vi.fn().mockResolvedValue({
      name: 'test-workflow',
      description: 'Test workflow',
      tasks: [
        { id: 'task1', taskRef: 'get-data' },
        { id: 'task2', taskRef: 'process', dependsOn: ['task1'] }
      ]
    } as GatewayWorkflowResponse),
    getWorkflowStats: vi.fn().mockResolvedValue(null),
    validateInput: vi.fn().mockResolvedValue({
      valid: true,
      missingInputs: [],
      invalidInputs: []
    } as ValidationInputResult),
    executeWorkflow: vi.fn().mockResolvedValue({
      executionId: 'exec-123',
      status: 'completed',
      output: { result: 'success' },
      taskResults: [
        { taskId: 'task1', status: 'completed', durationMs: 100 },
        { taskId: 'task2', status: 'completed', durationMs: 150 }
      ],
      durationMs: 250
    } as ExecutionResult),
    ...overrides
  };
}

describe('execute_workflow tool', () => {
  let mockClient: ConsumerGatewayClient;

  beforeEach(() => {
    mockClient = createMockClient();
  });

  describe('successful execution', () => {
    it('should return success with execution details for valid input', async () => {
      const result = await executeWorkflow(mockClient, {
        workflow: 'test-workflow',
        input: { orderId: '123' }
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.executionId).toBe('exec-123');
        expect(result.output).toEqual({ result: 'success' });
        expect(result.durationMs).toBe(250);
      }
    });

    it('should return task results from execution', async () => {
      const result = await executeWorkflow(mockClient, {
        workflow: 'test-workflow',
        input: { orderId: '123' }
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.taskResults).toHaveLength(2);
        expect(result.taskResults[0]).toEqual({
          taskId: 'task1',
          status: 'completed',
          durationMs: 100
        });
      }
    });

    it('should call gateway with correct workflow and input', async () => {
      await executeWorkflow(mockClient, {
        workflow: 'order-processing',
        input: { orderId: '456', customerId: 'cust-789' }
      });

      expect(mockClient.executeWorkflow).toHaveBeenCalledWith(
        'order-processing',
        { orderId: '456', customerId: 'cust-789' }
      );
    });
  });

  describe('validation errors', () => {
    it('should return validation error for missing required inputs', async () => {
      mockClient = createMockClient({
        validateInput: vi.fn().mockResolvedValue({
          valid: false,
          missingInputs: [
            { field: 'orderId', type: 'string', description: 'The order identifier' }
          ],
          invalidInputs: [],
          suggestedPrompt: 'Please provide the order ID'
        } as ValidationInputResult)
      });

      const result = await executeWorkflow(mockClient, {
        workflow: 'order-processing',
        input: {}
      });

      expect(result.success).toBe(false);
      if (!result.success && result.errorType === 'validation') {
        expect(result.missingInputs).toHaveLength(1);
        expect(result.missingInputs[0].field).toBe('orderId');
        expect(result.suggestedPrompt).toBe('Please provide the order ID');
      }
    });

    it('should return validation error for invalid input types', async () => {
      mockClient = createMockClient({
        validateInput: vi.fn().mockResolvedValue({
          valid: false,
          missingInputs: [],
          invalidInputs: [
            { field: 'amount', error: 'Must be a positive number', received: -10 }
          ],
          suggestedPrompt: 'Please provide a valid amount'
        } as ValidationInputResult)
      });

      const result = await executeWorkflow(mockClient, {
        workflow: 'payment-processing',
        input: { amount: -10 }
      });

      expect(result.success).toBe(false);
      if (!result.success && result.errorType === 'validation') {
        expect(result.invalidInputs).toHaveLength(1);
        expect(result.invalidInputs[0].field).toBe('amount');
        expect(result.invalidInputs[0].received).toBe(-10);
      }
    });

    it('should include suggestedPrompt in validation error', async () => {
      mockClient = createMockClient({
        validateInput: vi.fn().mockResolvedValue({
          valid: false,
          missingInputs: [
            { field: 'userId', type: 'string' }
          ],
          invalidInputs: [],
          suggestedPrompt: 'Please provide the user ID (string format)'
        } as ValidationInputResult)
      });

      const result = await executeWorkflow(mockClient, {
        workflow: 'user-profile',
        input: {}
      });

      expect(result.success).toBe(false);
      if (!result.success && result.errorType === 'validation') {
        expect(result.suggestedPrompt).toBe('Please provide the user ID (string format)');
      }
    });
  });

  describe('execution errors', () => {
    it('should return execution error with failed task info', async () => {
      mockClient = createMockClient({
        executeWorkflow: vi.fn().mockResolvedValue({
          executionId: 'exec-fail-123',
          status: 'failed',
          output: {},
          taskResults: [
            { taskId: 'task1', status: 'completed', durationMs: 100, output: { data: 'partial' } },
            { taskId: 'task2', status: 'failed', durationMs: 50, error: 'Connection timeout' }
          ],
          durationMs: 150
        } as ExecutionResult)
      });

      const result = await executeWorkflow(mockClient, {
        workflow: 'order-processing',
        input: { orderId: '123' }
      });

      expect(result.success).toBe(false);
      if (!result.success && result.errorType === 'execution') {
        expect(result.failedTask).toBe('task2');
        expect(result.errorMessage).toBe('Connection timeout');
      }
    });

    it('should include partial output from completed tasks', async () => {
      mockClient = createMockClient({
        executeWorkflow: vi.fn().mockResolvedValue({
          executionId: 'exec-fail-456',
          status: 'failed',
          output: { task1Result: 'data' },
          taskResults: [
            { taskId: 'task1', status: 'completed', durationMs: 100, output: { task1Result: 'data' } },
            { taskId: 'task2', status: 'failed', durationMs: 25, error: 'API error' }
          ],
          durationMs: 125
        } as ExecutionResult)
      });

      const result = await executeWorkflow(mockClient, {
        workflow: 'data-pipeline',
        input: { source: 'db' }
      });

      expect(result.success).toBe(false);
      if (!result.success && result.errorType === 'execution') {
        expect(result.partialOutput).toEqual({ task1Result: 'data' });
      }
    });
  });

  describe('dry run mode', () => {
    it('should return execution plan without executing when dryRun is true', async () => {
      mockClient = createMockClient({
        getWorkflow: vi.fn().mockResolvedValue({
          name: 'test-workflow',
          description: 'Test workflow',
          tasks: [
            { id: 'task1', taskRef: 'get-data' },
            { id: 'task2', taskRef: 'process', dependsOn: ['task1'] },
            { id: 'task3', taskRef: 'notify', dependsOn: ['task2'] }
          ]
        } as GatewayWorkflowResponse),
        getWorkflowStats: vi.fn().mockResolvedValue({
          workflowName: 'test-workflow',
          totalExecutions: 100,
          avgDurationMs: 500,
          successRate: 0.95
        })
      });

      const result = await executeWorkflow(mockClient, {
        workflow: 'test-workflow',
        input: { data: 'test' },
        dryRun: true
      });

      expect(result.success).toBe(true);
      if (result.success && 'executionPlan' in result) {
        expect(result.executionPlan.workflow).toBe('test-workflow');
        expect(result.executionPlan.taskCount).toBe(3);
        expect(result.executionPlan.estimatedDurationMs).toBe(500);
      }

      // Should NOT call executeWorkflow
      expect(mockClient.executeWorkflow).not.toHaveBeenCalled();
    });

    it('should detect parallel groups in dry run', async () => {
      mockClient = createMockClient({
        getWorkflow: vi.fn().mockResolvedValue({
          name: 'parallel-workflow',
          description: 'Workflow with parallel tasks',
          tasks: [
            { id: 'fetch', taskRef: 'get-data' },
            { id: 'process-a', taskRef: 'process', dependsOn: ['fetch'] },
            { id: 'process-b', taskRef: 'process', dependsOn: ['fetch'] },
            { id: 'aggregate', taskRef: 'combine', dependsOn: ['process-a', 'process-b'] }
          ]
        } as GatewayWorkflowResponse)
      });

      const result = await executeWorkflow(mockClient, {
        workflow: 'parallel-workflow',
        input: {},
        dryRun: true
      });

      expect(result.success).toBe(true);
      if (result.success && 'executionPlan' in result) {
        // Should have 3 groups: [fetch], [process-a, process-b], [aggregate]
        expect(result.executionPlan.parallelGroups).toHaveLength(3);
        expect(result.executionPlan.parallelGroups[1]).toContain('process-a');
        expect(result.executionPlan.parallelGroups[1]).toContain('process-b');
      }
    });
  });

  describe('workflow not found', () => {
    it('should return execution error when workflow does not exist', async () => {
      mockClient = createMockClient({
        validateInput: vi.fn().mockRejectedValue(new Error('Workflow not found: unknown-workflow'))
      });

      const result = await executeWorkflow(mockClient, {
        workflow: 'unknown-workflow',
        input: {}
      });

      expect(result.success).toBe(false);
      if (!result.success && result.errorType === 'execution') {
        expect(result.errorMessage).toContain('Workflow not found');
      }
    });
  });

  describe('edge cases', () => {
    it('should handle circular dependencies in dry run gracefully', async () => {
      // Tasks with circular dependency (task1 depends on task2, task2 depends on task1)
      mockClient = createMockClient({
        getWorkflow: vi.fn().mockResolvedValue({
          name: 'circular-workflow',
          description: 'Workflow with circular dependency',
          tasks: [
            { id: 'task1', taskRef: 'do-something', dependsOn: ['task2'] },
            { id: 'task2', taskRef: 'do-other', dependsOn: ['task1'] }
          ]
        } as GatewayWorkflowResponse)
      });

      const result = await executeWorkflow(mockClient, {
        workflow: 'circular-workflow',
        input: {},
        dryRun: true
      });

      // Should still return a result even with circular deps
      expect(result.success).toBe(true);
      if (result.success && 'executionPlan' in result) {
        expect(result.executionPlan.taskCount).toBe(2);
        // Both tasks should end up in the same group (last group)
        expect(result.executionPlan.parallelGroups.flat()).toContain('task1');
        expect(result.executionPlan.parallelGroups.flat()).toContain('task2');
      }
    });

    it('should handle empty task output in partial results', async () => {
      mockClient = createMockClient({
        executeWorkflow: vi.fn().mockResolvedValue({
          executionId: 'exec-empty-output',
          status: 'failed',
          output: {},
          taskResults: [
            { taskId: 'task1', status: 'completed', durationMs: 100 },
            { taskId: 'task2', status: 'failed', durationMs: 25, error: 'Error occurred' }
          ],
          durationMs: 125
        } as ExecutionResult)
      });

      const result = await executeWorkflow(mockClient, {
        workflow: 'test-workflow',
        input: { data: 'test' }
      });

      expect(result.success).toBe(false);
      if (!result.success && result.errorType === 'execution') {
        // partialOutput should be undefined when no outputs exist
        expect(result.partialOutput).toBeUndefined();
      }
    });

    it('should handle non-Error exceptions', async () => {
      mockClient = createMockClient({
        validateInput: vi.fn().mockRejectedValue('string error')
      });

      const result = await executeWorkflow(mockClient, {
        workflow: 'test-workflow',
        input: {}
      });

      expect(result.success).toBe(false);
      if (!result.success && result.errorType === 'execution') {
        expect(result.errorMessage).toBe('Unknown error');
      }
    });
  });
});
