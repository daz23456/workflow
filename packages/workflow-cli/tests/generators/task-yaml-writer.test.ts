/**
 * Task YAML Writer Tests
 * TDD: RED phase - write failing tests first
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { serializeTaskToYaml, writeTasksToFiles } from '../../src/generators/task-yaml-writer.js';
import type { WorkflowTaskResource, GeneratedTask } from '../../src/types.js';
import * as fs from 'fs/promises';

// Mock fs/promises
vi.mock('fs/promises', () => ({
  mkdir: vi.fn().mockResolvedValue(undefined),
  writeFile: vi.fn().mockResolvedValue(undefined)
}));

describe('task-yaml-writer', () => {
  describe('serializeTaskToYaml', () => {
    it('should serialize WorkflowTaskResource to valid YAML', () => {
      const resource: WorkflowTaskResource = {
        apiVersion: 'workflow.example.com/v1',
        kind: 'WorkflowTask',
        metadata: {
          name: 'get-user',
          namespace: 'default',
          labels: {
            'workflow.io/generated-from': 'openapi'
          }
        },
        spec: {
          type: 'http',
          description: 'Get user by ID',
          request: {
            url: 'https://api.example.com/users/{{input.id}}',
            method: 'GET',
            headers: { 'Accept': 'application/json' }
          },
          inputSchema: { type: 'object' },
          outputSchema: { type: 'object' },
          timeout: '30s',
          retry: { maxAttempts: 3, backoffMs: 1000 }
        }
      };

      const yaml = serializeTaskToYaml(resource);
      expect(yaml).toContain('apiVersion: workflow.example.com/v1');
      expect(yaml).toContain('kind: WorkflowTask');
      expect(yaml).toContain('name: get-user');
      expect(yaml).toContain('type: http');
    });

    it('should use single quotes in YAML output', () => {
      const resource: WorkflowTaskResource = {
        apiVersion: 'workflow.example.com/v1',
        kind: 'WorkflowTask',
        metadata: {
          name: 'test-task',
          namespace: 'default'
        },
        spec: {
          type: 'http',
          description: 'Test',
          request: {
            url: 'https://api.example.com/test',
            method: 'GET',
            headers: {}
          },
          inputSchema: { type: 'object' },
          outputSchema: { type: 'object' },
          timeout: '30s',
          retry: { maxAttempts: 3, backoffMs: 1000 }
        }
      };

      const yaml = serializeTaskToYaml(resource);
      // YAML library uses single quotes for strings containing special chars
      expect(yaml).not.toContain('"workflow.example.com');
    });
  });

  describe('writeTasksToFiles', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    const mockTasks: GeneratedTask[] = [
      {
        name: 'get-user',
        resource: {} as WorkflowTaskResource,
        yaml: 'apiVersion: workflow.example.com/v1\nkind: WorkflowTask\nmetadata:\n  name: get-user',
        operationId: 'getUser',
        path: '/users/{id}',
        method: 'get'
      },
      {
        name: 'list-users',
        resource: {} as WorkflowTaskResource,
        yaml: 'apiVersion: workflow.example.com/v1\nkind: WorkflowTask\nmetadata:\n  name: list-users',
        operationId: 'listUsers',
        path: '/users',
        method: 'get'
      }
    ];

    it('should write each task to a separate file by default', async () => {
      await writeTasksToFiles(mockTasks, '/output');

      expect(fs.mkdir).toHaveBeenCalledWith('/output', { recursive: true });
      expect(fs.writeFile).toHaveBeenCalledTimes(2);
      expect(fs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('task-get-user.yaml'),
        mockTasks[0].yaml
      );
      expect(fs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('task-list-users.yaml'),
        mockTasks[1].yaml
      );
    });

    it('should write all tasks to single file when singleFile=true', async () => {
      await writeTasksToFiles(mockTasks, '/output', true);

      expect(fs.writeFile).toHaveBeenCalledTimes(1);
      expect(fs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('workflow-tasks.yaml'),
        expect.stringContaining('---')
      );
    });

    it('should create output directory if it does not exist', async () => {
      await writeTasksToFiles(mockTasks, '/new/output/dir');

      expect(fs.mkdir).toHaveBeenCalledWith('/new/output/dir', { recursive: true });
    });
  });
});
