/**
 * Init Command Tests
 * TDD: RED phase - tests written before implementation
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  initWorkflow,
  getAvailableTemplates,
  InitResult,
  WorkflowTemplate
} from '../../src/commands/init.js';
import * as fs from 'fs/promises';

// Mock fs module
vi.mock('fs/promises');

describe('Init Command', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fs.mkdir).mockResolvedValue(undefined);
    vi.mocked(fs.writeFile).mockResolvedValue(undefined);
    vi.mocked(fs.access).mockRejectedValue(new Error('ENOENT'));
  });

  describe('getAvailableTemplates', () => {
    it('should return list of available templates', () => {
      const templates = getAvailableTemplates();

      expect(templates.length).toBeGreaterThan(0);
      expect(templates.some(t => t.id === 'api-composition')).toBe(true);
    });

    it('should include template metadata', () => {
      const templates = getAvailableTemplates();
      const apiTemplate = templates.find(t => t.id === 'api-composition');

      expect(apiTemplate?.name).toBeDefined();
      expect(apiTemplate?.description).toBeDefined();
    });

    it('should include basic template', () => {
      const templates = getAvailableTemplates();

      expect(templates.some(t => t.id === 'basic')).toBe(true);
    });
  });

  describe('initWorkflow', () => {
    it('should create workflow directory', async () => {
      const result = await initWorkflow('my-workflow', {
        outputPath: '/projects',
        template: 'basic'
      });

      expect(fs.mkdir).toHaveBeenCalledWith('/projects/my-workflow', { recursive: true });
      expect(result.success).toBe(true);
    });

    it('should create workflow.yaml file', async () => {
      await initWorkflow('my-workflow', {
        outputPath: '/projects',
        template: 'basic'
      });

      expect(fs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('workflow.yaml'),
        expect.stringContaining('apiVersion'),
        'utf-8'
      );
    });

    it('should create tasks directory', async () => {
      await initWorkflow('my-workflow', {
        outputPath: '/projects',
        template: 'basic'
      });

      expect(fs.mkdir).toHaveBeenCalledWith(
        expect.stringContaining('tasks'),
        { recursive: true }
      );
    });

    it('should create .workflowrc config file', async () => {
      await initWorkflow('my-workflow', {
        outputPath: '/projects',
        template: 'basic'
      });

      expect(fs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('.workflowrc'),
        expect.any(String),
        'utf-8'
      );
    });

    it('should use workflow name in generated YAML', async () => {
      await initWorkflow('order-processor', {
        outputPath: '/projects',
        template: 'basic'
      });

      expect(fs.writeFile).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('order-processor'),
        'utf-8'
      );
    });

    it('should return created files list', async () => {
      const result = await initWorkflow('my-workflow', {
        outputPath: '/projects',
        template: 'basic'
      });

      expect(result.createdFiles).toContain('workflow.yaml');
      expect(result.createdFiles).toContain('.workflowrc');
      expect(result.createdFiles.some(f => f.includes('tasks'))).toBe(true);
    });

    it('should fail if directory already exists', async () => {
      vi.mocked(fs.access).mockResolvedValue(undefined);

      const result = await initWorkflow('existing-workflow', {
        outputPath: '/projects',
        template: 'basic'
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('exists');
    });

    it('should use api-composition template correctly', async () => {
      await initWorkflow('api-workflow', {
        outputPath: '/projects',
        template: 'api-composition'
      });

      expect(fs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('workflow.yaml'),
        expect.stringContaining('tasks'),
        'utf-8'
      );
    });

    it('should default to basic template', async () => {
      const result = await initWorkflow('my-workflow', {
        outputPath: '/projects'
      });

      expect(result.success).toBe(true);
      expect(result.template).toBe('basic');
    });

    it('should fail on invalid template', async () => {
      const result = await initWorkflow('my-workflow', {
        outputPath: '/projects',
        template: 'nonexistent-template'
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('template');
    });

    it('should use current directory if outputPath not specified', async () => {
      await initWorkflow('my-workflow', {});

      expect(fs.mkdir).toHaveBeenCalledWith(
        expect.stringContaining('my-workflow'),
        { recursive: true }
      );
    });

    it('should handle file write errors', async () => {
      vi.mocked(fs.writeFile).mockRejectedValue(new Error('Permission denied'));

      const result = await initWorkflow('my-workflow', {
        outputPath: '/projects',
        template: 'basic'
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('InitResult', () => {
    it('should have correct structure for success', () => {
      const result: InitResult = {
        success: true,
        workflowPath: '/projects/my-workflow',
        template: 'basic',
        createdFiles: ['workflow.yaml', '.workflowrc']
      };

      expect(result.success).toBe(true);
      expect(result.workflowPath).toBeDefined();
      expect(result.createdFiles).toHaveLength(2);
    });

    it('should have correct structure for failure', () => {
      const result: InitResult = {
        success: false,
        error: 'Directory already exists'
      };

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('WorkflowTemplate', () => {
    it('should have correct structure', () => {
      const template: WorkflowTemplate = {
        id: 'basic',
        name: 'Basic Workflow',
        description: 'A simple workflow template'
      };

      expect(template.id).toBe('basic');
      expect(template.name).toBeDefined();
      expect(template.description).toBeDefined();
    });
  });
});
