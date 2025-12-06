/**
 * Workflow and Task Loader Tests
 * TDD: RED phase - tests written before implementation
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  loadWorkflow,
  loadTasks,
  loadTasksFromDirectory,
  WorkflowDefinition,
  TaskDefinition
} from '../src/loaders.js';
import * as fs from 'fs/promises';

// Mock fs module
vi.mock('fs/promises');

describe('Loaders', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('loadWorkflow', () => {
    it('should load a workflow from YAML file', async () => {
      const workflowYaml = `
apiVersion: workflow.example.com/v1
kind: Workflow
metadata:
  name: test-workflow
  namespace: default
spec:
  input:
    type: object
    properties:
      userId:
        type: string
  tasks:
    - id: fetch-user
      taskRef: get-user
      input:
        id: "{{input.userId}}"
  output:
    user: "{{tasks.fetch-user.output}}"
`;
      vi.mocked(fs.readFile).mockResolvedValue(workflowYaml);

      const workflow = await loadWorkflow('/path/to/workflow.yaml');

      expect(workflow.metadata.name).toBe('test-workflow');
      expect(workflow.metadata.namespace).toBe('default');
      expect(workflow.spec.tasks).toHaveLength(1);
      expect(workflow.spec.tasks[0].id).toBe('fetch-user');
    });

    it('should throw on non-existent file', async () => {
      vi.mocked(fs.readFile).mockRejectedValue(new Error('ENOENT: no such file'));

      await expect(loadWorkflow('/nonexistent.yaml')).rejects.toThrow();
    });

    it('should throw on invalid YAML', async () => {
      vi.mocked(fs.readFile).mockResolvedValue('{{ invalid yaml');

      await expect(loadWorkflow('/path/to/invalid.yaml')).rejects.toThrow();
    });

    it('should throw if file is not a Workflow resource', async () => {
      const taskYaml = `
apiVersion: workflow.example.com/v1
kind: WorkflowTask
metadata:
  name: not-a-workflow
`;
      vi.mocked(fs.readFile).mockResolvedValue(taskYaml);

      await expect(loadWorkflow('/path/to/task.yaml')).rejects.toThrow(/expected kind: Workflow/i);
    });

    it('should parse workflow with multiple tasks', async () => {
      const workflowYaml = `
apiVersion: workflow.example.com/v1
kind: Workflow
metadata:
  name: multi-task-workflow
  namespace: default
spec:
  tasks:
    - id: task-a
      taskRef: get-user
    - id: task-b
      taskRef: get-orders
      dependsOn:
        - task-a
    - id: task-c
      taskRef: send-notification
      dependsOn:
        - task-b
`;
      vi.mocked(fs.readFile).mockResolvedValue(workflowYaml);

      const workflow = await loadWorkflow('/path/to/workflow.yaml');

      expect(workflow.spec.tasks).toHaveLength(3);
      expect(workflow.spec.tasks[1].dependsOn).toContain('task-a');
    });

    it('should parse workflow with timeout and retries', async () => {
      const workflowYaml = `
apiVersion: workflow.example.com/v1
kind: Workflow
metadata:
  name: workflow-with-timeout
  namespace: default
spec:
  timeout: 30s
  tasks:
    - id: fetch-data
      taskRef: api-call
      timeout: 10s
      retry:
        maxAttempts: 3
        backoffMs: 1000
`;
      vi.mocked(fs.readFile).mockResolvedValue(workflowYaml);

      const workflow = await loadWorkflow('/path/to/workflow.yaml');

      expect(workflow.spec.timeout).toBe('30s');
      expect(workflow.spec.tasks[0].timeout).toBe('10s');
      expect(workflow.spec.tasks[0].retry?.maxAttempts).toBe(3);
    });

    it('should handle workflow input and output schemas', async () => {
      const workflowYaml = `
apiVersion: workflow.example.com/v1
kind: Workflow
metadata:
  name: schema-workflow
  namespace: default
spec:
  input:
    type: object
    properties:
      userId:
        type: string
    required:
      - userId
  tasks:
    - id: fetch-user
      taskRef: get-user
  output:
    user: "{{tasks.fetch-user.output}}"
`;
      vi.mocked(fs.readFile).mockResolvedValue(workflowYaml);

      const workflow = await loadWorkflow('/path/to/workflow.yaml');

      expect(workflow.spec.input?.type).toBe('object');
      expect(workflow.spec.input?.properties?.userId).toBeDefined();
      expect(workflow.spec.input?.required).toContain('userId');
      expect(workflow.spec.output?.user).toBe('{{tasks.fetch-user.output}}');
    });
  });

  describe('loadTasks', () => {
    it('should load a single task from YAML file', async () => {
      const taskYaml = `
apiVersion: workflow.example.com/v1
kind: WorkflowTask
metadata:
  name: get-user
  namespace: test
spec:
  type: http
  request:
    url: http://localhost:5100/api/users/{{input.id}}
    method: GET
`;
      vi.mocked(fs.readFile).mockResolvedValue(taskYaml);

      const tasks = await loadTasks('/path/to/task.yaml');

      expect(tasks).toHaveLength(1);
      expect(tasks[0].metadata.name).toBe('get-user');
      expect(tasks[0].spec.type).toBe('http');
    });

    it('should load multiple tasks from multi-document YAML', async () => {
      const multiTaskYaml = `
apiVersion: workflow.example.com/v1
kind: WorkflowTask
metadata:
  name: task-one
  namespace: test
spec:
  type: http
---
apiVersion: workflow.example.com/v1
kind: WorkflowTask
metadata:
  name: task-two
  namespace: test
spec:
  type: http
`;
      vi.mocked(fs.readFile).mockResolvedValue(multiTaskYaml);

      const tasks = await loadTasks('/path/to/tasks.yaml');

      expect(tasks).toHaveLength(2);
      expect(tasks[0].metadata.name).toBe('task-one');
      expect(tasks[1].metadata.name).toBe('task-two');
    });

    it('should throw on non-existent file', async () => {
      vi.mocked(fs.readFile).mockRejectedValue(new Error('ENOENT'));

      await expect(loadTasks('/nonexistent.yaml')).rejects.toThrow();
    });

    it('should parse task with input/output schemas', async () => {
      const taskYaml = `
apiVersion: workflow.example.com/v1
kind: WorkflowTask
metadata:
  name: process-payment
  namespace: test
spec:
  type: http
  request:
    url: http://localhost/api/payments
    method: POST
  inputSchema:
    type: object
    properties:
      amount:
        type: number
    required:
      - amount
  outputSchema:
    type: object
    properties:
      transactionId:
        type: string
`;
      vi.mocked(fs.readFile).mockResolvedValue(taskYaml);

      const tasks = await loadTasks('/path/to/task.yaml');

      expect(tasks[0].spec.inputSchema?.properties?.amount).toBeDefined();
      expect(tasks[0].spec.outputSchema?.properties?.transactionId).toBeDefined();
    });
  });

  describe('loadTasksFromDirectory', () => {
    it('should load all YAML files from directory', async () => {
      // Mock readdir to return list of files
      vi.mocked(fs.readdir).mockResolvedValue([
        { name: 'task-a.yaml', isFile: () => true, isDirectory: () => false } as any,
        { name: 'task-b.yaml', isFile: () => true, isDirectory: () => false } as any,
        { name: 'readme.md', isFile: () => true, isDirectory: () => false } as any,
        { name: 'subdir', isFile: () => false, isDirectory: () => true } as any
      ]);

      // Mock readFile to return task content
      vi.mocked(fs.readFile).mockImplementation(async (path) => {
        const pathStr = path.toString();
        if (pathStr.includes('task-a')) {
          return `
apiVersion: workflow.example.com/v1
kind: WorkflowTask
metadata:
  name: task-a
  namespace: test
spec:
  type: http
`;
        }
        if (pathStr.includes('task-b')) {
          return `
apiVersion: workflow.example.com/v1
kind: WorkflowTask
metadata:
  name: task-b
  namespace: test
spec:
  type: http
`;
        }
        throw new Error('Unknown file');
      });

      const tasks = await loadTasksFromDirectory('/path/to/tasks');

      expect(tasks).toHaveLength(2);
      expect(tasks.map(t => t.metadata.name)).toContain('task-a');
      expect(tasks.map(t => t.metadata.name)).toContain('task-b');
    });

    it('should handle empty directory', async () => {
      vi.mocked(fs.readdir).mockResolvedValue([]);

      const tasks = await loadTasksFromDirectory('/empty/dir');

      expect(tasks).toHaveLength(0);
    });

    it('should support .yml extension', async () => {
      vi.mocked(fs.readdir).mockResolvedValue([
        { name: 'task.yml', isFile: () => true, isDirectory: () => false } as any
      ]);

      vi.mocked(fs.readFile).mockResolvedValue(`
apiVersion: workflow.example.com/v1
kind: WorkflowTask
metadata:
  name: yml-task
  namespace: test
spec:
  type: http
`);

      const tasks = await loadTasksFromDirectory('/path/to/tasks');

      expect(tasks).toHaveLength(1);
      expect(tasks[0].metadata.name).toBe('yml-task');
    });

    it('should throw on non-existent directory', async () => {
      vi.mocked(fs.readdir).mockRejectedValue(new Error('ENOENT'));

      await expect(loadTasksFromDirectory('/nonexistent')).rejects.toThrow();
    });

    it('should filter by namespace when specified', async () => {
      vi.mocked(fs.readdir).mockResolvedValue([
        { name: 'task-prod.yaml', isFile: () => true, isDirectory: () => false } as any,
        { name: 'task-test.yaml', isFile: () => true, isDirectory: () => false } as any
      ]);

      vi.mocked(fs.readFile).mockImplementation(async (path) => {
        const pathStr = path.toString();
        if (pathStr.includes('task-prod')) {
          return `
apiVersion: workflow.example.com/v1
kind: WorkflowTask
metadata:
  name: prod-task
  namespace: production
spec:
  type: http
`;
        }
        return `
apiVersion: workflow.example.com/v1
kind: WorkflowTask
metadata:
  name: test-task
  namespace: test
spec:
  type: http
`;
      });

      const tasks = await loadTasksFromDirectory('/path/to/tasks', { namespace: 'test' });

      expect(tasks).toHaveLength(1);
      expect(tasks[0].metadata.name).toBe('test-task');
    });
  });

  describe('Type definitions', () => {
    it('should have WorkflowDefinition with required fields', () => {
      const workflow: WorkflowDefinition = {
        apiVersion: 'workflow.example.com/v1',
        kind: 'Workflow',
        metadata: {
          name: 'test',
          namespace: 'default'
        },
        spec: {
          tasks: []
        }
      };

      expect(workflow.apiVersion).toBeDefined();
      expect(workflow.kind).toBe('Workflow');
      expect(workflow.metadata.name).toBe('test');
    });

    it('should have TaskDefinition with required fields', () => {
      const task: TaskDefinition = {
        apiVersion: 'workflow.example.com/v1',
        kind: 'WorkflowTask',
        metadata: {
          name: 'test-task',
          namespace: 'default'
        },
        spec: {
          type: 'http'
        }
      };

      expect(task.apiVersion).toBeDefined();
      expect(task.kind).toBe('WorkflowTask');
      expect(task.spec.type).toBe('http');
    });
  });
});
