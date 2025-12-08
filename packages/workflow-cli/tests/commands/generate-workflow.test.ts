/**
 * Generate Workflow Command Tests
 * TDD: RED phase - write failing tests first
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  generateWorkflowCommand,
  type GenerateWorkflowOptions
} from '../../src/commands/generate-workflow.js';
import type { TaskDefinition } from '../../src/workflow-generator/dependency-analyzer.js';

// Mock fs
vi.mock('fs', () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
  mkdirSync: vi.fn()
}));

// Mock YAML
vi.mock('yaml', () => ({
  parse: vi.fn(),
  stringify: vi.fn((obj) => `# Generated Workflow\n${JSON.stringify(obj, null, 2)}`)
}));

import * as fs from 'fs';

describe('generate-workflow command', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockTasks: TaskDefinition[] = [
    {
      name: 'get-user',
      inputSchema: {
        type: 'object',
        properties: { userId: { type: 'string' } },
        required: ['userId']
      },
      outputSchema: {
        type: 'object',
        properties: { id: { type: 'string' }, email: { type: 'string' } }
      }
    },
    {
      name: 'send-email',
      inputSchema: {
        type: 'object',
        properties: { to: { type: 'string' } },
        required: ['to']
      },
      outputSchema: {
        type: 'object',
        properties: { sent: { type: 'boolean' } }
      }
    }
  ];

  describe('generateWorkflowCommand', () => {
    it('should generate workflow from compatible tasks', async () => {
      const options: GenerateWorkflowOptions = {
        tasks: mockTasks,
        workflowName: 'user-notification',
        outputPath: './output'
      };

      const result = await generateWorkflowCommand(options);

      expect(result.success).toBe(true);
      expect(result.workflow).toBeDefined();
      expect(result.workflow?.metadata.name).toBe('user-notification');
    });

    it('should find compatible task chains automatically', async () => {
      const options: GenerateWorkflowOptions = {
        tasks: mockTasks,
        workflowName: 'auto-workflow',
        outputPath: './output',
        autoChain: true
      };

      const result = await generateWorkflowCommand(options);

      expect(result.success).toBe(true);
      expect(result.chains).toBeDefined();
      expect(result.chains!.length).toBeGreaterThan(0);
    });

    it('should write workflow to file when outputPath provided', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);

      const options: GenerateWorkflowOptions = {
        tasks: mockTasks,
        workflowName: 'test-workflow',
        outputPath: './workflows',
        write: true
      };

      const result = await generateWorkflowCommand(options);

      expect(result.success).toBe(true);
      expect(fs.writeFileSync).toHaveBeenCalled();
    });

    it('should return error when no compatible chains found', async () => {
      const incompatibleTasks: TaskDefinition[] = [
        {
          name: 'task-a',
          inputSchema: { type: 'object', properties: { x: { type: 'string' } }, required: ['x'] },
          outputSchema: { type: 'object', properties: { y: { type: 'number' } } }
        },
        {
          name: 'task-b',
          inputSchema: { type: 'object', properties: { z: { type: 'boolean' } }, required: ['z'] },
          outputSchema: { type: 'object', properties: { w: { type: 'string' } } }
        }
      ];

      const options: GenerateWorkflowOptions = {
        tasks: incompatibleTasks,
        workflowName: 'impossible-workflow',
        autoChain: true
      };

      const result = await generateWorkflowCommand(options);

      expect(result.success).toBe(false);
      expect(result.error).toContain('No compatible task chains found');
    });
  });
});
