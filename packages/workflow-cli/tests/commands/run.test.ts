/**
 * Run Command Tests
 * TDD: RED phase - tests written before implementation
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  runWorkflow,
  RunResult,
  RunOptions
} from '../../src/commands/run.js';
import * as loaders from '../../src/loaders.js';
import { GatewayClient } from '../../src/services/gateway-client.js';
import { MockExecutor } from '../../src/services/mock-executor.js';
import type { WorkflowDefinition, TaskDefinition } from '../../src/loaders.js';

// Mock modules
vi.mock('../../src/loaders.js');
vi.mock('../../src/services/gateway-client.js');
vi.mock('../../src/services/mock-executor.js');

describe('Run Command', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const sampleWorkflow: WorkflowDefinition = {
    apiVersion: 'workflow.example.com/v1',
    kind: 'Workflow',
    metadata: { name: 'test-workflow', namespace: 'default' },
    spec: {
      tasks: [
        { id: 'task-1', taskRef: 'get-user', input: { id: '{{input.userId}}' } }
      ],
      input: {
        type: 'object',
        properties: { userId: { type: 'string' } }
      },
      output: { result: '{{tasks.task-1.output}}' }
    }
  };

  const sampleTasks: TaskDefinition[] = [
    {
      apiVersion: 'workflow.example.com/v1',
      kind: 'WorkflowTask',
      metadata: { name: 'get-user', namespace: 'default' },
      spec: { type: 'http', request: { url: 'http://localhost/api/users/{{input.id}}', method: 'GET' } }
    }
  ];

  describe('runWorkflow', () => {
    it('should run workflow in mock mode by default', async () => {
      vi.mocked(loaders.loadWorkflow).mockResolvedValue(sampleWorkflow);
      vi.mocked(loaders.loadTasksFromDirectory).mockResolvedValue(sampleTasks);

      const mockExecutor = {
        setDefaultResponse: vi.fn(),
        execute: vi.fn().mockResolvedValue({
          executionId: 'mock-123',
          status: 'completed',
          output: { result: { id: '1' } },
          duration: 100,
          taskResults: []
        })
      };
      vi.mocked(MockExecutor).mockImplementation(() => mockExecutor as any);

      const result = await runWorkflow('/path/to/workflow.yaml', {
        input: { userId: '123' },
        tasksPath: '/path/to/tasks'
      });

      expect(result.success).toBe(true);
      expect(result.mode).toBe('mock');
      expect(mockExecutor.execute).toHaveBeenCalled();
    });

    it('should run workflow via Gateway in remote mode', async () => {
      vi.mocked(loaders.loadWorkflow).mockResolvedValue(sampleWorkflow);

      const mockClient = {
        executeWorkflow: vi.fn().mockResolvedValue({
          executionId: 'exec-456',
          status: 'completed',
          output: { result: { id: '1' } },
          duration: 200
        })
      };
      vi.mocked(GatewayClient).mockImplementation(() => mockClient as any);

      const result = await runWorkflow('/path/to/workflow.yaml', {
        input: { userId: '123' },
        remote: true,
        gatewayUrl: 'http://localhost:5001'
      });

      expect(result.success).toBe(true);
      expect(result.mode).toBe('remote');
      expect(mockClient.executeWorkflow).toHaveBeenCalledWith(
        'test-workflow',
        { userId: '123' },
        undefined
      );
    });

    it('should return execution ID', async () => {
      vi.mocked(loaders.loadWorkflow).mockResolvedValue(sampleWorkflow);
      vi.mocked(loaders.loadTasksFromDirectory).mockResolvedValue(sampleTasks);

      const mockExecutor = {
        setDefaultResponse: vi.fn(),
        execute: vi.fn().mockResolvedValue({
          executionId: 'mock-789',
          status: 'completed',
          output: {},
          duration: 50,
          taskResults: []
        })
      };
      vi.mocked(MockExecutor).mockImplementation(() => mockExecutor as any);

      const result = await runWorkflow('/path/to/workflow.yaml', {
        input: {},
        tasksPath: '/path/to/tasks'
      });

      expect(result.executionId).toBe('mock-789');
    });

    it('should return workflow output', async () => {
      vi.mocked(loaders.loadWorkflow).mockResolvedValue(sampleWorkflow);
      vi.mocked(loaders.loadTasksFromDirectory).mockResolvedValue(sampleTasks);

      const mockExecutor = {
        setDefaultResponse: vi.fn(),
        execute: vi.fn().mockResolvedValue({
          executionId: 'mock-123',
          status: 'completed',
          output: { user: { id: '1', name: 'John' } },
          duration: 100,
          taskResults: []
        })
      };
      vi.mocked(MockExecutor).mockImplementation(() => mockExecutor as any);

      const result = await runWorkflow('/path/to/workflow.yaml', {
        input: { userId: '1' },
        tasksPath: '/path/to/tasks'
      });

      expect(result.output).toEqual({ user: { id: '1', name: 'John' } });
    });

    it('should return execution duration', async () => {
      vi.mocked(loaders.loadWorkflow).mockResolvedValue(sampleWorkflow);
      vi.mocked(loaders.loadTasksFromDirectory).mockResolvedValue(sampleTasks);

      const mockExecutor = {
        setDefaultResponse: vi.fn(),
        execute: vi.fn().mockResolvedValue({
          executionId: 'mock-123',
          status: 'completed',
          output: {},
          duration: 250,
          taskResults: []
        })
      };
      vi.mocked(MockExecutor).mockImplementation(() => mockExecutor as any);

      const result = await runWorkflow('/path/to/workflow.yaml', {
        input: {},
        tasksPath: '/path/to/tasks'
      });

      expect(result.duration).toBe(250);
    });

    it('should handle workflow file not found', async () => {
      vi.mocked(loaders.loadWorkflow).mockRejectedValue(new Error('ENOENT: no such file'));

      const result = await runWorkflow('/nonexistent.yaml', {
        input: {},
        tasksPath: '/path/to/tasks'
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('no such file');
    });

    it('should handle execution failure', async () => {
      vi.mocked(loaders.loadWorkflow).mockResolvedValue(sampleWorkflow);
      vi.mocked(loaders.loadTasksFromDirectory).mockResolvedValue(sampleTasks);

      const mockExecutor = {
        setDefaultResponse: vi.fn(),
        execute: vi.fn().mockResolvedValue({
          executionId: 'mock-fail',
          status: 'failed',
          output: {},
          duration: 50,
          taskResults: [],
          failedTask: 'task-1',
          error: 'Connection refused'
        })
      };
      vi.mocked(MockExecutor).mockImplementation(() => mockExecutor as any);

      const result = await runWorkflow('/path/to/workflow.yaml', {
        input: {},
        tasksPath: '/path/to/tasks'
      });

      expect(result.success).toBe(false);
      expect(result.failedTask).toBe('task-1');
      expect(result.error).toContain('Connection refused');
    });

    it('should include task results in verbose mode', async () => {
      vi.mocked(loaders.loadWorkflow).mockResolvedValue(sampleWorkflow);
      vi.mocked(loaders.loadTasksFromDirectory).mockResolvedValue(sampleTasks);

      const mockExecutor = {
        setDefaultResponse: vi.fn(),
        execute: vi.fn().mockResolvedValue({
          executionId: 'mock-123',
          status: 'completed',
          output: {},
          duration: 100,
          taskResults: [
            { taskId: 'task-1', status: 'completed', duration: 50 }
          ]
        })
      };
      vi.mocked(MockExecutor).mockImplementation(() => mockExecutor as any);

      const result = await runWorkflow('/path/to/workflow.yaml', {
        input: {},
        tasksPath: '/path/to/tasks',
        verbose: true
      });

      expect(result.taskResults).toBeDefined();
      expect(result.taskResults).toHaveLength(1);
    });

    it('should use namespace from options', async () => {
      vi.mocked(loaders.loadWorkflow).mockResolvedValue(sampleWorkflow);

      const mockClient = {
        executeWorkflow: vi.fn().mockResolvedValue({
          executionId: 'exec-123',
          status: 'completed',
          output: {}
        })
      };
      vi.mocked(GatewayClient).mockImplementation(() => mockClient as any);

      await runWorkflow('/path/to/workflow.yaml', {
        input: {},
        remote: true,
        gatewayUrl: 'http://localhost:5001',
        namespace: 'production'
      });

      expect(mockClient.executeWorkflow).toHaveBeenCalledWith(
        'test-workflow',
        {},
        'production'
      );
    });

    it('should parse JSON input string', async () => {
      vi.mocked(loaders.loadWorkflow).mockResolvedValue(sampleWorkflow);
      vi.mocked(loaders.loadTasksFromDirectory).mockResolvedValue(sampleTasks);

      const mockExecutor = {
        setDefaultResponse: vi.fn(),
        execute: vi.fn().mockResolvedValue({
          executionId: 'mock-123',
          status: 'completed',
          output: {},
          duration: 100,
          taskResults: []
        })
      };
      vi.mocked(MockExecutor).mockImplementation(() => mockExecutor as any);

      await runWorkflow('/path/to/workflow.yaml', {
        inputJson: '{"userId": "456"}',
        tasksPath: '/path/to/tasks'
      });

      expect(mockExecutor.execute).toHaveBeenCalledWith(
        sampleWorkflow,
        sampleTasks,
        { userId: '456' }
      );
    });

    it('should handle invalid JSON input', async () => {
      vi.mocked(loaders.loadWorkflow).mockResolvedValue(sampleWorkflow);

      const result = await runWorkflow('/path/to/workflow.yaml', {
        inputJson: 'invalid json',
        tasksPath: '/path/to/tasks'
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid JSON');
    });
  });

  describe('RunResult', () => {
    it('should have correct structure for success', () => {
      const result: RunResult = {
        success: true,
        mode: 'mock',
        workflowName: 'test-workflow',
        executionId: 'exec-123',
        status: 'completed',
        output: { data: 'test' },
        duration: 150
      };

      expect(result.success).toBe(true);
      expect(result.mode).toBe('mock');
    });

    it('should have correct structure for failure', () => {
      const result: RunResult = {
        success: false,
        mode: 'remote',
        workflowName: 'test-workflow',
        executionId: 'exec-456',
        status: 'failed',
        output: {},
        duration: 50,
        error: 'Task failed',
        failedTask: 'task-1'
      };

      expect(result.success).toBe(false);
      expect(result.failedTask).toBe('task-1');
    });
  });

  describe('RunOptions', () => {
    it('should have correct structure', () => {
      const options: RunOptions = {
        input: { key: 'value' },
        inputJson: '{"key":"value"}',
        remote: true,
        gatewayUrl: 'http://localhost:5001',
        namespace: 'default',
        tasksPath: '/path/to/tasks',
        verbose: true
      };

      expect(options.remote).toBe(true);
      expect(options.verbose).toBe(true);
    });
  });
});
