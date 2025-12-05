import { describe, it, expect, vi, beforeEach } from 'vitest';
import { dryRunWorkflow } from '../../src/tools/dry-run-workflow.js';
import { GatewayClient } from '../../src/services/gateway-client.js';

describe('dry_run_workflow', () => {
  let mockClient: GatewayClient;

  beforeEach(() => {
    mockClient = {
      dryRunWorkflow: vi.fn()
    } as unknown as GatewayClient;
  });

  it('should dry-run a valid workflow', async () => {
    const mockResult = {
      valid: true,
      executionPlan: {
        tasks: [
          { id: 'task-1', taskRef: 'get-user', resolvedInput: { userId: '123' }, dependencies: [] }
        ],
        parallelGroups: [['task-1']]
      },
      errors: []
    };

    vi.mocked(mockClient.dryRunWorkflow).mockResolvedValueOnce(mockResult);

    const result = await dryRunWorkflow(mockClient, {
      yaml: 'name: test\ntasks:\n  - id: task-1\n    taskRef: get-user',
      sampleInput: { userId: '123' }
    });

    expect(result.valid).toBe(true);
    expect(result.executionPlan.tasks).toHaveLength(1);
    expect(result.executionPlan.tasks[0].resolvedInput).toEqual({ userId: '123' });
  });

  it('should resolve templates with sample input', async () => {
    const mockResult = {
      valid: true,
      executionPlan: {
        tasks: [
          {
            id: 'task-1',
            taskRef: 'get-user',
            resolvedInput: { userId: 'user-42', name: 'John' },
            dependencies: []
          },
          {
            id: 'task-2',
            taskRef: 'send-email',
            resolvedInput: { to: 'john@example.com', message: 'Hello John' },
            dependencies: ['task-1']
          }
        ],
        parallelGroups: [['task-1'], ['task-2']]
      },
      errors: []
    };

    vi.mocked(mockClient.dryRunWorkflow).mockResolvedValueOnce(mockResult);

    const result = await dryRunWorkflow(mockClient, {
      yaml: 'name: test\ntasks: ...',
      sampleInput: { userId: 'user-42', name: 'John' }
    });

    expect(result.executionPlan.tasks[0].resolvedInput).toHaveProperty('userId', 'user-42');
    expect(result.executionPlan.tasks[1].resolvedInput).toHaveProperty('to', 'john@example.com');
  });

  it('should show parallel execution groups', async () => {
    const mockResult = {
      valid: true,
      executionPlan: {
        tasks: [
          { id: 'fetch-user', taskRef: 'get-user', resolvedInput: {}, dependencies: [] },
          { id: 'fetch-orders', taskRef: 'get-orders', resolvedInput: {}, dependencies: [] },
          { id: 'combine', taskRef: 'merge-data', resolvedInput: {}, dependencies: ['fetch-user', 'fetch-orders'] }
        ],
        parallelGroups: [['fetch-user', 'fetch-orders'], ['combine']]
      },
      errors: []
    };

    vi.mocked(mockClient.dryRunWorkflow).mockResolvedValueOnce(mockResult);

    const result = await dryRunWorkflow(mockClient, {
      yaml: 'name: parallel-workflow\ntasks: ...',
      sampleInput: {}
    });

    expect(result.executionPlan.parallelGroups).toHaveLength(2);
    expect(result.executionPlan.parallelGroups[0]).toContain('fetch-user');
    expect(result.executionPlan.parallelGroups[0]).toContain('fetch-orders');
    expect(result.executionPlan.parallelGroups[1]).toContain('combine');
  });

  it('should handle invalid sample input', async () => {
    const mockResult = {
      valid: false,
      executionPlan: { tasks: [], parallelGroups: [] },
      errors: [{ message: 'Template resolution failed: input.missingField is undefined' }]
    };

    vi.mocked(mockClient.dryRunWorkflow).mockResolvedValueOnce(mockResult);

    const result = await dryRunWorkflow(mockClient, {
      yaml: 'name: test\ntasks: ...',
      sampleInput: { wrongField: 'value' }
    });

    expect(result.valid).toBe(false);
    expect(result.errors[0].message).toContain('Template resolution failed');
  });

  it('should handle validation errors', async () => {
    const mockResult = {
      valid: false,
      executionPlan: { tasks: [], parallelGroups: [] },
      errors: [
        { message: 'Unknown task reference: invalid-task' },
        { message: 'Circular dependency detected' }
      ]
    };

    vi.mocked(mockClient.dryRunWorkflow).mockResolvedValueOnce(mockResult);

    const result = await dryRunWorkflow(mockClient, {
      yaml: 'name: test\ntasks: ...',
      sampleInput: {}
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(2);
  });

  it('should return error for empty YAML', async () => {
    const result = await dryRunWorkflow(mockClient, {
      yaml: '',
      sampleInput: {}
    });

    expect(result.valid).toBe(false);
    expect(result.errors[0].message).toBe('Workflow YAML is required');
    expect(mockClient.dryRunWorkflow).not.toHaveBeenCalled();
  });

  it('should handle API errors gracefully', async () => {
    vi.mocked(mockClient.dryRunWorkflow).mockRejectedValueOnce(new Error('Connection timeout'));

    const result = await dryRunWorkflow(mockClient, {
      yaml: 'name: test\ntasks: ...',
      sampleInput: {}
    });

    expect(result.valid).toBe(false);
    expect(result.errors[0].message).toBe('Connection timeout');
  });
});
