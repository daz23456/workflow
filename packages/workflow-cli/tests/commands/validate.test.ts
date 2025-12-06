/**
 * Validate Command Tests
 * TDD: RED phase - tests written before implementation
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { validateWorkflow, ValidationResult, ValidationCheck } from '../../src/commands/validate.js';
import * as loaders from '../../src/loaders.js';
import type { WorkflowDefinition, TaskDefinition } from '../../src/loaders.js';

// Mock loaders module
vi.mock('../../src/loaders.js');

describe('Validate Command', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('validateWorkflow', () => {
    const validWorkflow: WorkflowDefinition = {
      apiVersion: 'workflow.example.com/v1',
      kind: 'Workflow',
      metadata: {
        name: 'test-workflow',
        namespace: 'default'
      },
      spec: {
        tasks: [
          {
            id: 'fetch-user',
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
          user: '{{tasks.fetch-user.output}}'
        }
      }
    };

    const validTask: TaskDefinition = {
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

    it('should return valid result for valid workflow', async () => {
      vi.mocked(loaders.loadWorkflow).mockResolvedValue(validWorkflow);
      vi.mocked(loaders.loadTasksFromDirectory).mockResolvedValue([validTask]);

      const result = await validateWorkflow('/path/to/workflow.yaml', {
        tasksPath: '/path/to/tasks'
      });

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return checks array with results', async () => {
      vi.mocked(loaders.loadWorkflow).mockResolvedValue(validWorkflow);
      vi.mocked(loaders.loadTasksFromDirectory).mockResolvedValue([validTask]);

      const result = await validateWorkflow('/path/to/workflow.yaml', {
        tasksPath: '/path/to/tasks'
      });

      expect(result.checks).toBeDefined();
      expect(result.checks.length).toBeGreaterThan(0);

      // Should have standard checks
      const checkNames = result.checks.map(c => c.name);
      expect(checkNames).toContain('schema');
      expect(checkNames).toContain('task-references');
      expect(checkNames).toContain('template-expressions');
      expect(checkNames).toContain('circular-dependencies');
    });

    it('should detect missing task references', async () => {
      const workflowWithMissingTask: WorkflowDefinition = {
        ...validWorkflow,
        spec: {
          ...validWorkflow.spec,
          tasks: [
            {
              id: 'fetch-user',
              taskRef: 'nonexistent-task'
            }
          ]
        }
      };

      vi.mocked(loaders.loadWorkflow).mockResolvedValue(workflowWithMissingTask);
      vi.mocked(loaders.loadTasksFromDirectory).mockResolvedValue([validTask]);

      const result = await validateWorkflow('/path/to/workflow.yaml', {
        tasksPath: '/path/to/tasks'
      });

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('nonexistent-task'))).toBe(true);

      const taskRefCheck = result.checks.find(c => c.name === 'task-references');
      expect(taskRefCheck?.passed).toBe(false);
    });

    it('should detect invalid template expressions', async () => {
      const workflowWithInvalidTemplate: WorkflowDefinition = {
        ...validWorkflow,
        spec: {
          ...validWorkflow.spec,
          tasks: [
            {
              id: 'fetch-user',
              taskRef: 'get-user',
              input: { id: '{{invalid.path.here}}' }
            }
          ]
        }
      };

      vi.mocked(loaders.loadWorkflow).mockResolvedValue(workflowWithInvalidTemplate);
      vi.mocked(loaders.loadTasksFromDirectory).mockResolvedValue([validTask]);

      const result = await validateWorkflow('/path/to/workflow.yaml', {
        tasksPath: '/path/to/tasks'
      });

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('invalid.path'))).toBe(true);

      const templateCheck = result.checks.find(c => c.name === 'template-expressions');
      expect(templateCheck?.passed).toBe(false);
    });

    it('should detect circular dependencies', async () => {
      const workflowWithCircular: WorkflowDefinition = {
        ...validWorkflow,
        spec: {
          ...validWorkflow.spec,
          tasks: [
            {
              id: 'task-a',
              taskRef: 'get-user',
              dependsOn: ['task-b']
            },
            {
              id: 'task-b',
              taskRef: 'get-user',
              dependsOn: ['task-a']
            }
          ]
        }
      };

      vi.mocked(loaders.loadWorkflow).mockResolvedValue(workflowWithCircular);
      vi.mocked(loaders.loadTasksFromDirectory).mockResolvedValue([validTask]);

      const result = await validateWorkflow('/path/to/workflow.yaml', {
        tasksPath: '/path/to/tasks'
      });

      expect(result.valid).toBe(false);

      const circularCheck = result.checks.find(c => c.name === 'circular-dependencies');
      expect(circularCheck?.passed).toBe(false);
    });

    it('should detect missing dependsOn references', async () => {
      const workflowWithBadDependency: WorkflowDefinition = {
        ...validWorkflow,
        spec: {
          ...validWorkflow.spec,
          tasks: [
            {
              id: 'task-a',
              taskRef: 'get-user',
              dependsOn: ['nonexistent-task']
            }
          ]
        }
      };

      vi.mocked(loaders.loadWorkflow).mockResolvedValue(workflowWithBadDependency);
      vi.mocked(loaders.loadTasksFromDirectory).mockResolvedValue([validTask]);

      const result = await validateWorkflow('/path/to/workflow.yaml', {
        tasksPath: '/path/to/tasks'
      });

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('nonexistent-task'))).toBe(true);
    });

    it('should validate workflow schema structure', async () => {
      const workflowWithBadSchema: WorkflowDefinition = {
        apiVersion: 'workflow.example.com/v1',
        kind: 'Workflow',
        metadata: {
          name: '',  // Invalid: empty name
          namespace: 'default'
        },
        spec: {
          tasks: []  // Invalid: no tasks
        }
      };

      vi.mocked(loaders.loadWorkflow).mockResolvedValue(workflowWithBadSchema);
      vi.mocked(loaders.loadTasksFromDirectory).mockResolvedValue([]);

      const result = await validateWorkflow('/path/to/workflow.yaml', {
        tasksPath: '/path/to/tasks'
      });

      expect(result.valid).toBe(false);

      const schemaCheck = result.checks.find(c => c.name === 'schema');
      expect(schemaCheck?.passed).toBe(false);
    });

    it('should handle file not found', async () => {
      vi.mocked(loaders.loadWorkflow).mockRejectedValue(new Error('ENOENT: no such file'));

      const result = await validateWorkflow('/nonexistent.yaml', {
        tasksPath: '/path/to/tasks'
      });

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('no such file') || e.includes('not found'))).toBe(true);
    });

    it('should include workflow name in result', async () => {
      vi.mocked(loaders.loadWorkflow).mockResolvedValue(validWorkflow);
      vi.mocked(loaders.loadTasksFromDirectory).mockResolvedValue([validTask]);

      const result = await validateWorkflow('/path/to/workflow.yaml', {
        tasksPath: '/path/to/tasks'
      });

      expect(result.workflowName).toBe('test-workflow');
    });

    it('should validate output template references', async () => {
      const workflowWithBadOutput: WorkflowDefinition = {
        ...validWorkflow,
        spec: {
          ...validWorkflow.spec,
          output: {
            user: '{{tasks.nonexistent-task.output}}'
          }
        }
      };

      vi.mocked(loaders.loadWorkflow).mockResolvedValue(workflowWithBadOutput);
      vi.mocked(loaders.loadTasksFromDirectory).mockResolvedValue([validTask]);

      const result = await validateWorkflow('/path/to/workflow.yaml', {
        tasksPath: '/path/to/tasks'
      });

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('nonexistent-task'))).toBe(true);
    });

    it('should skip task reference validation when no tasks path provided', async () => {
      vi.mocked(loaders.loadWorkflow).mockResolvedValue(validWorkflow);

      const result = await validateWorkflow('/path/to/workflow.yaml');

      // Should still validate other things, but skip task references
      const taskRefCheck = result.checks.find(c => c.name === 'task-references');
      expect(taskRefCheck?.skipped).toBe(true);
    });

    it('should validate multiple tasks in sequence', async () => {
      const multiTaskWorkflow: WorkflowDefinition = {
        ...validWorkflow,
        spec: {
          ...validWorkflow.spec,
          tasks: [
            {
              id: 'task-1',
              taskRef: 'get-user'
            },
            {
              id: 'task-2',
              taskRef: 'get-orders',
              dependsOn: ['task-1']
            },
            {
              id: 'task-3',
              taskRef: 'send-email',
              dependsOn: ['task-2']
            }
          ],
          output: {
            result: '{{tasks.task-3.output}}'
          }
        }
      };

      const tasks: TaskDefinition[] = [
        { ...validTask, metadata: { name: 'get-user', namespace: 'default' } },
        { ...validTask, metadata: { name: 'get-orders', namespace: 'default' } },
        { ...validTask, metadata: { name: 'send-email', namespace: 'default' } }
      ];

      vi.mocked(loaders.loadWorkflow).mockResolvedValue(multiTaskWorkflow);
      vi.mocked(loaders.loadTasksFromDirectory).mockResolvedValue(tasks);

      const result = await validateWorkflow('/path/to/workflow.yaml', {
        tasksPath: '/path/to/tasks'
      });

      expect(result.valid).toBe(true);
    });

    it('should detect duplicate task IDs', async () => {
      const workflowWithDuplicates: WorkflowDefinition = {
        ...validWorkflow,
        spec: {
          ...validWorkflow.spec,
          tasks: [
            {
              id: 'same-id',
              taskRef: 'get-user'
            },
            {
              id: 'same-id',
              taskRef: 'get-orders'
            }
          ]
        }
      };

      vi.mocked(loaders.loadWorkflow).mockResolvedValue(workflowWithDuplicates);
      vi.mocked(loaders.loadTasksFromDirectory).mockResolvedValue([validTask]);

      const result = await validateWorkflow('/path/to/workflow.yaml', {
        tasksPath: '/path/to/tasks'
      });

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('duplicate') || e.includes('same-id'))).toBe(true);
    });
  });

  describe('ValidationResult', () => {
    it('should have correct structure', () => {
      const result: ValidationResult = {
        valid: true,
        workflowName: 'test',
        errors: [],
        warnings: [],
        checks: [
          { name: 'schema', passed: true, skipped: false }
        ]
      };

      expect(result.valid).toBe(true);
      expect(result.workflowName).toBe('test');
      expect(result.errors).toEqual([]);
      expect(result.warnings).toEqual([]);
      expect(result.checks).toHaveLength(1);
    });
  });

  describe('ValidationCheck', () => {
    it('should have correct structure for passed check', () => {
      const check: ValidationCheck = {
        name: 'schema',
        passed: true,
        skipped: false,
        message: 'Schema is valid'
      };

      expect(check.name).toBe('schema');
      expect(check.passed).toBe(true);
      expect(check.skipped).toBe(false);
      expect(check.message).toBe('Schema is valid');
    });

    it('should have correct structure for failed check', () => {
      const check: ValidationCheck = {
        name: 'task-references',
        passed: false,
        skipped: false,
        message: 'Task "foo" not found',
        errors: ['Task "foo" not found']
      };

      expect(check.passed).toBe(false);
      expect(check.errors).toContain('Task "foo" not found');
    });

    it('should have correct structure for skipped check', () => {
      const check: ValidationCheck = {
        name: 'task-references',
        passed: false,
        skipped: true,
        message: 'No tasks path provided'
      };

      expect(check.skipped).toBe(true);
    });
  });
});
