/**
 * Test Command Tests (Dry-run execution)
 * TDD: RED phase - tests written before implementation
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  testWorkflow,
  TestResult,
  TestOptions
} from '../../src/commands/test.js';
import * as loaders from '../../src/loaders.js';
import { GatewayClient } from '../../src/services/gateway-client.js';
import type { WorkflowDefinition, TaskDefinition } from '../../src/loaders.js';

// Mock modules
vi.mock('../../src/loaders.js');
vi.mock('../../src/services/gateway-client.js');

describe('Test Command (Dry-run)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const sampleWorkflow: WorkflowDefinition = {
    apiVersion: 'workflow.example.com/v1',
    kind: 'Workflow',
    metadata: { name: 'test-workflow', namespace: 'default' },
    spec: {
      tasks: [
        { id: 'fetch-user', taskRef: 'get-user', input: { id: '{{input.userId}}' } },
        {
          id: 'fetch-orders',
          taskRef: 'get-orders',
          dependsOn: ['fetch-user'],
          input: { userId: '{{tasks.fetch-user.output.id}}' }
        }
      ],
      input: {
        type: 'object',
        properties: { userId: { type: 'string' } }
      },
      output: {
        user: '{{tasks.fetch-user.output}}',
        orders: '{{tasks.fetch-orders.output}}'
      }
    }
  };

  const sampleTasks: TaskDefinition[] = [
    {
      apiVersion: 'workflow.example.com/v1',
      kind: 'WorkflowTask',
      metadata: { name: 'get-user', namespace: 'default' },
      spec: { type: 'http', request: { url: 'http://localhost/api/users/{{input.id}}', method: 'GET' } }
    },
    {
      apiVersion: 'workflow.example.com/v1',
      kind: 'WorkflowTask',
      metadata: { name: 'get-orders', namespace: 'default' },
      spec: { type: 'http', request: { url: 'http://localhost/api/orders?userId={{input.userId}}', method: 'GET' } }
    }
  ];

  describe('testWorkflow', () => {
    it('should validate workflow in local mode by default', async () => {
      vi.mocked(loaders.loadWorkflow).mockResolvedValue(sampleWorkflow);
      vi.mocked(loaders.loadTasksFromDirectory).mockResolvedValue(sampleTasks);

      const result = await testWorkflow('/path/to/workflow.yaml', {
        input: { userId: '123' },
        tasksPath: '/path/to/tasks'
      });

      expect(result.valid).toBe(true);
      expect(result.mode).toBe('local');
    });

    it('should dry-run via Gateway in remote mode', async () => {
      vi.mocked(loaders.loadWorkflow).mockResolvedValue(sampleWorkflow);

      const mockClient = {
        dryRunWorkflow: vi.fn().mockResolvedValue({
          valid: true,
          executionPlan: {
            groups: [
              { tasks: ['fetch-user'], parallel: false },
              { tasks: ['fetch-orders'], parallel: false }
            ]
          }
        })
      };
      vi.mocked(GatewayClient).mockImplementation(() => mockClient as any);

      const result = await testWorkflow('/path/to/workflow.yaml', {
        input: { userId: '123' },
        remote: true,
        gatewayUrl: 'http://localhost:5001'
      });

      expect(result.valid).toBe(true);
      expect(result.mode).toBe('remote');
      expect(mockClient.dryRunWorkflow).toHaveBeenCalledWith(
        'test-workflow',
        { userId: '123' },
        undefined
      );
    });

    it('should return execution plan', async () => {
      vi.mocked(loaders.loadWorkflow).mockResolvedValue(sampleWorkflow);
      vi.mocked(loaders.loadTasksFromDirectory).mockResolvedValue(sampleTasks);

      const result = await testWorkflow('/path/to/workflow.yaml', {
        input: { userId: '123' },
        tasksPath: '/path/to/tasks'
      });

      expect(result.executionPlan).toBeDefined();
      expect(result.executionPlan?.groups).toHaveLength(2);
      expect(result.executionPlan?.groups[0].tasks).toContain('fetch-user');
    });

    it('should resolve template expressions', async () => {
      vi.mocked(loaders.loadWorkflow).mockResolvedValue(sampleWorkflow);
      vi.mocked(loaders.loadTasksFromDirectory).mockResolvedValue(sampleTasks);

      const result = await testWorkflow('/path/to/workflow.yaml', {
        input: { userId: '456' },
        tasksPath: '/path/to/tasks'
      });

      expect(result.resolvedTemplates).toBeDefined();
      expect(result.resolvedTemplates?.['fetch-user.input.id']).toBe('456');
    });

    it('should return validation errors', async () => {
      const invalidWorkflow: WorkflowDefinition = {
        ...sampleWorkflow,
        spec: {
          ...sampleWorkflow.spec,
          tasks: [
            ...sampleWorkflow.spec.tasks,
            { id: 'invalid-task', taskRef: 'nonexistent-task', input: {} }
          ]
        }
      };

      vi.mocked(loaders.loadWorkflow).mockResolvedValue(invalidWorkflow);
      vi.mocked(loaders.loadTasksFromDirectory).mockResolvedValue(sampleTasks);

      const result = await testWorkflow('/path/to/workflow.yaml', {
        input: {},
        tasksPath: '/path/to/tasks'
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors?.length).toBeGreaterThan(0);
    });

    it('should detect circular dependencies', async () => {
      const circularWorkflow: WorkflowDefinition = {
        ...sampleWorkflow,
        spec: {
          ...sampleWorkflow.spec,
          tasks: [
            { id: 'task-a', taskRef: 'get-user', dependsOn: ['task-b'], input: {} },
            { id: 'task-b', taskRef: 'get-orders', dependsOn: ['task-a'], input: {} }
          ]
        }
      };

      vi.mocked(loaders.loadWorkflow).mockResolvedValue(circularWorkflow);
      vi.mocked(loaders.loadTasksFromDirectory).mockResolvedValue(sampleTasks);

      const result = await testWorkflow('/path/to/workflow.yaml', {
        input: {},
        tasksPath: '/path/to/tasks'
      });

      expect(result.valid).toBe(false);
      expect(result.errors?.some(e => e.includes('circular') || e.includes('cycle'))).toBe(true);
    });

    it('should handle workflow file not found', async () => {
      vi.mocked(loaders.loadWorkflow).mockRejectedValue(new Error('ENOENT: no such file'));

      const result = await testWorkflow('/nonexistent.yaml', {
        input: {},
        tasksPath: '/path/to/tasks'
      });

      expect(result.valid).toBe(false);
      expect(result.error).toContain('no such file');
    });

    it('should return warnings for potential issues', async () => {
      vi.mocked(loaders.loadWorkflow).mockResolvedValue(sampleWorkflow);
      vi.mocked(loaders.loadTasksFromDirectory).mockResolvedValue(sampleTasks);

      const result = await testWorkflow('/path/to/workflow.yaml', {
        input: { userId: '123', extraField: 'unused' },
        tasksPath: '/path/to/tasks'
      });

      // Warnings for extra input fields not used by workflow
      expect(result.warnings).toBeDefined();
    });

    it('should identify parallel task groups', async () => {
      const parallelWorkflow: WorkflowDefinition = {
        ...sampleWorkflow,
        spec: {
          ...sampleWorkflow.spec,
          tasks: [
            { id: 'task-a', taskRef: 'get-user', input: {} },
            { id: 'task-b', taskRef: 'get-orders', input: {} },
            { id: 'task-c', taskRef: 'process', dependsOn: ['task-a', 'task-b'], input: {} }
          ]
        }
      };

      vi.mocked(loaders.loadWorkflow).mockResolvedValue(parallelWorkflow);
      vi.mocked(loaders.loadTasksFromDirectory).mockResolvedValue(sampleTasks);

      const result = await testWorkflow('/path/to/workflow.yaml', {
        input: {},
        tasksPath: '/path/to/tasks'
      });

      expect(result.executionPlan?.groups[0].parallel).toBe(true);
      expect(result.executionPlan?.groups[0].tasks).toContain('task-a');
      expect(result.executionPlan?.groups[0].tasks).toContain('task-b');
    });

    it('should parse JSON input string', async () => {
      vi.mocked(loaders.loadWorkflow).mockResolvedValue(sampleWorkflow);
      vi.mocked(loaders.loadTasksFromDirectory).mockResolvedValue(sampleTasks);

      const result = await testWorkflow('/path/to/workflow.yaml', {
        inputJson: '{"userId": "789"}',
        tasksPath: '/path/to/tasks'
      });

      expect(result.valid).toBe(true);
      expect(result.resolvedTemplates?.['fetch-user.input.id']).toBe('789');
    });

    it('should handle invalid JSON input', async () => {
      vi.mocked(loaders.loadWorkflow).mockResolvedValue(sampleWorkflow);

      const result = await testWorkflow('/path/to/workflow.yaml', {
        inputJson: 'invalid json',
        tasksPath: '/path/to/tasks'
      });

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid JSON');
    });

    it('should use namespace from options', async () => {
      vi.mocked(loaders.loadWorkflow).mockResolvedValue(sampleWorkflow);

      const mockClient = {
        dryRunWorkflow: vi.fn().mockResolvedValue({
          valid: true,
          executionPlan: { groups: [] }
        })
      };
      vi.mocked(GatewayClient).mockImplementation(() => mockClient as any);

      await testWorkflow('/path/to/workflow.yaml', {
        input: {},
        remote: true,
        gatewayUrl: 'http://localhost:5001',
        namespace: 'production'
      });

      expect(mockClient.dryRunWorkflow).toHaveBeenCalledWith(
        'test-workflow',
        {},
        'production'
      );
    });

    it('should show estimated execution time', async () => {
      vi.mocked(loaders.loadWorkflow).mockResolvedValue(sampleWorkflow);
      vi.mocked(loaders.loadTasksFromDirectory).mockResolvedValue(sampleTasks);

      const result = await testWorkflow('/path/to/workflow.yaml', {
        input: { userId: '123' },
        tasksPath: '/path/to/tasks'
      });

      expect(result.estimatedDuration).toBeDefined();
      expect(typeof result.estimatedDuration).toBe('number');
    });
  });

  describe('TestResult', () => {
    it('should have correct structure for valid workflow', () => {
      const result: TestResult = {
        valid: true,
        mode: 'local',
        workflowName: 'test-workflow',
        executionPlan: {
          groups: [
            { tasks: ['fetch-user'], parallel: false },
            { tasks: ['fetch-orders'], parallel: false }
          ]
        },
        resolvedTemplates: {
          'fetch-user.input.id': '123'
        },
        estimatedDuration: 500
      };

      expect(result.valid).toBe(true);
      expect(result.executionPlan?.groups).toHaveLength(2);
    });

    it('should have correct structure for invalid workflow', () => {
      const result: TestResult = {
        valid: false,
        mode: 'local',
        workflowName: 'test-workflow',
        errors: ['Missing task reference: nonexistent-task'],
        warnings: ['Unused input field: extraField']
      };

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
    });
  });

  describe('TestOptions', () => {
    it('should have correct structure', () => {
      const options: TestOptions = {
        input: { key: 'value' },
        inputJson: '{"key":"value"}',
        remote: true,
        gatewayUrl: 'http://localhost:5001',
        namespace: 'default',
        tasksPath: '/path/to/tasks'
      };

      expect(options.remote).toBe(true);
    });
  });
});
