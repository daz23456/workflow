/**
 * Explain Command Tests
 * TDD: RED phase - tests written before implementation
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  explainWorkflow,
  ExplainResult,
  ExecutionGroup,
  TaskExplanation
} from '../../src/commands/explain.js';
import * as loaders from '../../src/loaders.js';
import type { WorkflowDefinition, TaskDefinition } from '../../src/loaders.js';

// Mock loaders module
vi.mock('../../src/loaders.js');

describe('Explain Command', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const simpleWorkflow: WorkflowDefinition = {
    apiVersion: 'workflow.example.com/v1',
    kind: 'Workflow',
    metadata: {
      name: 'simple-workflow',
      namespace: 'default'
    },
    spec: {
      tasks: [
        {
          id: 'task-1',
          taskRef: 'get-user',
          input: { id: '{{input.userId}}' }
        }
      ],
      input: {
        type: 'object',
        properties: {
          userId: { type: 'string' }
        }
      },
      output: {
        result: '{{tasks.task-1.output}}'
      }
    }
  };

  const parallelWorkflow: WorkflowDefinition = {
    apiVersion: 'workflow.example.com/v1',
    kind: 'Workflow',
    metadata: {
      name: 'parallel-workflow',
      namespace: 'default'
    },
    spec: {
      tasks: [
        {
          id: 'fetch-user',
          taskRef: 'get-user',
          input: { id: '{{input.userId}}' }
        },
        {
          id: 'fetch-inventory',
          taskRef: 'get-inventory',
          input: { id: '{{input.productId}}' }
        },
        {
          id: 'process-order',
          taskRef: 'process',
          dependsOn: ['fetch-user', 'fetch-inventory'],
          input: {
            user: '{{tasks.fetch-user.output}}',
            inventory: '{{tasks.fetch-inventory.output}}'
          }
        }
      ],
      input: {
        type: 'object',
        properties: {
          userId: { type: 'string' },
          productId: { type: 'string' }
        }
      },
      output: {
        result: '{{tasks.process-order.output}}'
      }
    }
  };

  const sequentialWorkflow: WorkflowDefinition = {
    apiVersion: 'workflow.example.com/v1',
    kind: 'Workflow',
    metadata: {
      name: 'sequential-workflow',
      namespace: 'default'
    },
    spec: {
      tasks: [
        {
          id: 'step-1',
          taskRef: 'task-a'
        },
        {
          id: 'step-2',
          taskRef: 'task-b',
          dependsOn: ['step-1']
        },
        {
          id: 'step-3',
          taskRef: 'task-c',
          dependsOn: ['step-2']
        }
      ],
      output: {
        result: '{{tasks.step-3.output}}'
      }
    }
  };

  const sampleTask: TaskDefinition = {
    apiVersion: 'workflow.example.com/v1',
    kind: 'WorkflowTask',
    metadata: {
      name: 'get-user',
      namespace: 'default'
    },
    spec: {
      type: 'http',
      request: {
        url: 'http://localhost:5100/api/users/{{input.id}}',
        method: 'GET'
      }
    }
  };

  describe('explainWorkflow', () => {
    it('should return workflow name and namespace', async () => {
      vi.mocked(loaders.loadWorkflow).mockResolvedValue(simpleWorkflow);
      vi.mocked(loaders.loadTasksFromDirectory).mockResolvedValue([sampleTask]);

      const result = await explainWorkflow('/path/to/workflow.yaml', {
        tasksPath: '/path/to/tasks'
      });

      expect(result.workflowName).toBe('simple-workflow');
      expect(result.namespace).toBe('default');
    });

    it('should return total task count', async () => {
      vi.mocked(loaders.loadWorkflow).mockResolvedValue(parallelWorkflow);
      vi.mocked(loaders.loadTasksFromDirectory).mockResolvedValue([sampleTask]);

      const result = await explainWorkflow('/path/to/workflow.yaml', {
        tasksPath: '/path/to/tasks'
      });

      expect(result.totalTasks).toBe(3);
    });

    it('should identify parallel execution groups', async () => {
      vi.mocked(loaders.loadWorkflow).mockResolvedValue(parallelWorkflow);
      vi.mocked(loaders.loadTasksFromDirectory).mockResolvedValue([sampleTask]);

      const result = await explainWorkflow('/path/to/workflow.yaml', {
        tasksPath: '/path/to/tasks'
      });

      expect(result.groups).toBeDefined();
      expect(result.groups.length).toBe(2);

      // First group should contain parallel tasks
      const firstGroup = result.groups[0];
      expect(firstGroup.tasks).toContain('fetch-user');
      expect(firstGroup.tasks).toContain('fetch-inventory');
      expect(firstGroup.parallel).toBe(true);

      // Second group depends on first
      const secondGroup = result.groups[1];
      expect(secondGroup.tasks).toContain('process-order');
      expect(secondGroup.dependsOn).toContain(0); // Depends on group 0
    });

    it('should identify sequential execution groups', async () => {
      vi.mocked(loaders.loadWorkflow).mockResolvedValue(sequentialWorkflow);
      vi.mocked(loaders.loadTasksFromDirectory).mockResolvedValue([sampleTask]);

      const result = await explainWorkflow('/path/to/workflow.yaml', {
        tasksPath: '/path/to/tasks'
      });

      expect(result.groups.length).toBe(3);

      // Each group should have single task
      expect(result.groups[0].tasks).toHaveLength(1);
      expect(result.groups[1].tasks).toHaveLength(1);
      expect(result.groups[2].tasks).toHaveLength(1);

      // Sequential means each group is not parallel
      expect(result.groups[0].parallel).toBe(false);
      expect(result.groups[1].parallel).toBe(false);
      expect(result.groups[2].parallel).toBe(false);
    });

    it('should provide task explanations with dependencies', async () => {
      vi.mocked(loaders.loadWorkflow).mockResolvedValue(parallelWorkflow);
      vi.mocked(loaders.loadTasksFromDirectory).mockResolvedValue([sampleTask]);

      const result = await explainWorkflow('/path/to/workflow.yaml', {
        tasksPath: '/path/to/tasks'
      });

      expect(result.tasks).toBeDefined();

      const processTask = result.tasks.find(t => t.id === 'process-order');
      expect(processTask?.dependsOn).toContain('fetch-user');
      expect(processTask?.dependsOn).toContain('fetch-inventory');
      expect(processTask?.taskRef).toBe('process');
    });

    it('should identify tasks with no dependencies', async () => {
      vi.mocked(loaders.loadWorkflow).mockResolvedValue(parallelWorkflow);
      vi.mocked(loaders.loadTasksFromDirectory).mockResolvedValue([sampleTask]);

      const result = await explainWorkflow('/path/to/workflow.yaml', {
        tasksPath: '/path/to/tasks'
      });

      const fetchUserTask = result.tasks.find(t => t.id === 'fetch-user');
      expect(fetchUserTask?.dependsOn).toHaveLength(0);

      const fetchInventoryTask = result.tasks.find(t => t.id === 'fetch-inventory');
      expect(fetchInventoryTask?.dependsOn).toHaveLength(0);
    });

    it('should include input template references', async () => {
      vi.mocked(loaders.loadWorkflow).mockResolvedValue(parallelWorkflow);
      vi.mocked(loaders.loadTasksFromDirectory).mockResolvedValue([sampleTask]);

      const result = await explainWorkflow('/path/to/workflow.yaml', {
        tasksPath: '/path/to/tasks'
      });

      const fetchUserTask = result.tasks.find(t => t.id === 'fetch-user');
      expect(fetchUserTask?.inputRefs).toContain('input.userId');
    });

    it('should include task output references', async () => {
      vi.mocked(loaders.loadWorkflow).mockResolvedValue(parallelWorkflow);
      vi.mocked(loaders.loadTasksFromDirectory).mockResolvedValue([sampleTask]);

      const result = await explainWorkflow('/path/to/workflow.yaml', {
        tasksPath: '/path/to/tasks'
      });

      const processTask = result.tasks.find(t => t.id === 'process-order');
      expect(processTask?.inputRefs).toContain('tasks.fetch-user.output');
      expect(processTask?.inputRefs).toContain('tasks.fetch-inventory.output');
    });

    it('should handle workflow file not found', async () => {
      vi.mocked(loaders.loadWorkflow).mockRejectedValue(new Error('ENOENT: no such file'));

      const result = await explainWorkflow('/nonexistent.yaml', {
        tasksPath: '/path/to/tasks'
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('no such file');
    });

    it('should work without tasks path', async () => {
      vi.mocked(loaders.loadWorkflow).mockResolvedValue(simpleWorkflow);

      const result = await explainWorkflow('/path/to/workflow.yaml');

      expect(result.success).toBe(true);
      expect(result.workflowName).toBe('simple-workflow');
    });

    it('should calculate max parallel width', async () => {
      vi.mocked(loaders.loadWorkflow).mockResolvedValue(parallelWorkflow);
      vi.mocked(loaders.loadTasksFromDirectory).mockResolvedValue([sampleTask]);

      const result = await explainWorkflow('/path/to/workflow.yaml', {
        tasksPath: '/path/to/tasks'
      });

      expect(result.maxParallelWidth).toBe(2); // fetch-user and fetch-inventory
    });

    it('should calculate execution depth', async () => {
      vi.mocked(loaders.loadWorkflow).mockResolvedValue(sequentialWorkflow);
      vi.mocked(loaders.loadTasksFromDirectory).mockResolvedValue([sampleTask]);

      const result = await explainWorkflow('/path/to/workflow.yaml', {
        tasksPath: '/path/to/tasks'
      });

      expect(result.executionDepth).toBe(3); // 3 sequential steps
    });

    it('should include workflow description if available', async () => {
      const workflowWithDescription: WorkflowDefinition = {
        ...simpleWorkflow,
        spec: {
          ...simpleWorkflow.spec,
          description: 'A test workflow for demonstration'
        }
      };

      vi.mocked(loaders.loadWorkflow).mockResolvedValue(workflowWithDescription);
      vi.mocked(loaders.loadTasksFromDirectory).mockResolvedValue([sampleTask]);

      const result = await explainWorkflow('/path/to/workflow.yaml', {
        tasksPath: '/path/to/tasks'
      });

      expect(result.description).toBe('A test workflow for demonstration');
    });

    it('should identify critical path tasks', async () => {
      vi.mocked(loaders.loadWorkflow).mockResolvedValue(sequentialWorkflow);
      vi.mocked(loaders.loadTasksFromDirectory).mockResolvedValue([sampleTask]);

      const result = await explainWorkflow('/path/to/workflow.yaml', {
        tasksPath: '/path/to/tasks'
      });

      // All tasks in sequential workflow are on critical path
      expect(result.criticalPath).toContain('step-1');
      expect(result.criticalPath).toContain('step-2');
      expect(result.criticalPath).toContain('step-3');
    });
  });

  describe('ExplainResult', () => {
    it('should have correct structure for success', () => {
      const result: ExplainResult = {
        success: true,
        workflowName: 'test-workflow',
        namespace: 'default',
        totalTasks: 3,
        groups: [
          { groupIndex: 0, tasks: ['task-1', 'task-2'], parallel: true, dependsOn: [] }
        ],
        tasks: [
          { id: 'task-1', taskRef: 'get-data', dependsOn: [], inputRefs: [] }
        ],
        maxParallelWidth: 2,
        executionDepth: 2,
        criticalPath: ['task-1', 'task-3']
      };

      expect(result.success).toBe(true);
      expect(result.workflowName).toBe('test-workflow');
      expect(result.totalTasks).toBe(3);
    });

    it('should have correct structure for failure', () => {
      const result: ExplainResult = {
        success: false,
        error: 'Workflow file not found',
        workflowName: '',
        namespace: '',
        totalTasks: 0,
        groups: [],
        tasks: [],
        maxParallelWidth: 0,
        executionDepth: 0,
        criticalPath: []
      };

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('ExecutionGroup', () => {
    it('should have correct structure', () => {
      const group: ExecutionGroup = {
        groupIndex: 0,
        tasks: ['fetch-user', 'fetch-inventory'],
        parallel: true,
        dependsOn: []
      };

      expect(group.groupIndex).toBe(0);
      expect(group.tasks).toHaveLength(2);
      expect(group.parallel).toBe(true);
      expect(group.dependsOn).toHaveLength(0);
    });

    it('should support dependencies on other groups', () => {
      const group: ExecutionGroup = {
        groupIndex: 1,
        tasks: ['process-order'],
        parallel: false,
        dependsOn: [0]
      };

      expect(group.dependsOn).toContain(0);
    });
  });

  describe('TaskExplanation', () => {
    it('should have correct structure', () => {
      const task: TaskExplanation = {
        id: 'fetch-user',
        taskRef: 'get-user',
        dependsOn: [],
        inputRefs: ['input.userId']
      };

      expect(task.id).toBe('fetch-user');
      expect(task.taskRef).toBe('get-user');
      expect(task.dependsOn).toHaveLength(0);
      expect(task.inputRefs).toContain('input.userId');
    });

    it('should support multiple dependencies', () => {
      const task: TaskExplanation = {
        id: 'final-task',
        taskRef: 'aggregate',
        dependsOn: ['task-1', 'task-2', 'task-3'],
        inputRefs: ['tasks.task-1.output', 'tasks.task-2.output']
      };

      expect(task.dependsOn).toHaveLength(3);
      expect(task.inputRefs).toHaveLength(2);
    });
  });
});
