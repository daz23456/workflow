import { describe, it, expect, vi, beforeEach } from 'vitest';
import { executeWorkflow } from '../../src/tools/execute-workflow.js';
import { GatewayClient } from '../../src/services/gateway-client.js';

describe('execute_workflow', () => {
  let mockClient: GatewayClient;

  beforeEach(() => {
    mockClient = {
      executeWorkflow: vi.fn()
    } as unknown as GatewayClient;
  });

  it('should execute a valid workflow', async () => {
    const mockResult = {
      executionId: 'exec-123',
      status: 'completed' as const,
      output: { result: 'success' },
      taskResults: [
        { taskId: 'task-1', status: 'completed', duration: 100, output: { data: 'test' } }
      ],
      totalDuration: 150
    };

    vi.mocked(mockClient.executeWorkflow).mockResolvedValueOnce(mockResult);

    const result = await executeWorkflow(mockClient, {
      workflowName: 'my-workflow',
      input: { userId: '123' }
    });

    expect(result.status).toBe('completed');
    expect(result.output).toEqual({ result: 'success' });
    expect(mockClient.executeWorkflow).toHaveBeenCalledWith('my-workflow', { userId: '123' });
  });

  it('should return execution ID', async () => {
    const mockResult = {
      executionId: 'exec-456-abc',
      status: 'completed' as const,
      output: {},
      taskResults: [],
      totalDuration: 50
    };

    vi.mocked(mockClient.executeWorkflow).mockResolvedValueOnce(mockResult);

    const result = await executeWorkflow(mockClient, {
      workflowName: 'my-workflow',
      input: {}
    });

    expect(result.executionId).toBe('exec-456-abc');
  });

  it('should return task-level results', async () => {
    const mockResult = {
      executionId: 'exec-789',
      status: 'completed' as const,
      output: { final: 'data' },
      taskResults: [
        { taskId: 'fetch-user', status: 'completed', duration: 50, output: { user: { name: 'John' } } },
        { taskId: 'fetch-orders', status: 'completed', duration: 75, output: { orders: [] } },
        { taskId: 'combine', status: 'completed', duration: 20, output: { combined: true } }
      ],
      totalDuration: 145
    };

    vi.mocked(mockClient.executeWorkflow).mockResolvedValueOnce(mockResult);

    const result = await executeWorkflow(mockClient, {
      workflowName: 'complex-workflow',
      input: {}
    });

    expect(result.taskResults).toHaveLength(3);
    expect(result.taskResults[0].taskId).toBe('fetch-user');
    expect(result.taskResults[0].duration).toBe(50);
    expect(result.taskResults[1].taskId).toBe('fetch-orders');
    expect(result.totalDuration).toBe(145);
  });

  it('should handle workflow not found', async () => {
    vi.mocked(mockClient.executeWorkflow).mockRejectedValueOnce(
      new Error('Workflow not found: nonexistent-workflow')
    );

    await expect(executeWorkflow(mockClient, {
      workflowName: 'nonexistent-workflow',
      input: {}
    })).rejects.toThrow('Workflow not found: nonexistent-workflow');
  });

  it('should handle execution failure', async () => {
    const mockResult = {
      executionId: 'exec-failed',
      status: 'failed' as const,
      output: {},
      taskResults: [
        { taskId: 'task-1', status: 'completed', duration: 50 },
        { taskId: 'task-2', status: 'failed', duration: 100, error: 'Connection refused: http://external-api/endpoint' }
      ],
      totalDuration: 150
    };

    vi.mocked(mockClient.executeWorkflow).mockResolvedValueOnce(mockResult);

    const result = await executeWorkflow(mockClient, {
      workflowName: 'failing-workflow',
      input: {}
    });

    expect(result.status).toBe('failed');
    expect(result.taskResults[1].error).toBe('Connection refused: http://external-api/endpoint');
  });

  it('should handle timeout', async () => {
    vi.mocked(mockClient.executeWorkflow).mockRejectedValueOnce(
      new Error('Failed to execute workflow: 504 Gateway Timeout')
    );

    await expect(executeWorkflow(mockClient, {
      workflowName: 'slow-workflow',
      input: {}
    })).rejects.toThrow('Failed to execute workflow: 504 Gateway Timeout');
  });

  it('should require workflow name', async () => {
    await expect(executeWorkflow(mockClient, {
      workflowName: '',
      input: {}
    })).rejects.toThrow('Workflow name is required');

    expect(mockClient.executeWorkflow).not.toHaveBeenCalled();
  });

  it('should pass input correctly', async () => {
    const mockResult = {
      executionId: 'exec-input-test',
      status: 'completed' as const,
      output: {},
      taskResults: [],
      totalDuration: 10
    };

    vi.mocked(mockClient.executeWorkflow).mockResolvedValueOnce(mockResult);

    const complexInput = {
      userId: 'user-123',
      options: { verbose: true, limit: 10 },
      tags: ['important', 'urgent']
    };

    await executeWorkflow(mockClient, {
      workflowName: 'test-workflow',
      input: complexInput
    });

    expect(mockClient.executeWorkflow).toHaveBeenCalledWith('test-workflow', complexInput);
  });
});
