import { describe, it, expect, beforeEach, vi } from 'vitest';
import { validateWorkflow } from '../../src/tools/validate-workflow.js';
import { GatewayClient } from '../../src/services/gateway-client.js';
import type { ValidateWorkflowParams, ValidationResult } from '../../src/types/index.js';

vi.mock('../../src/services/gateway-client.js');

describe('validateWorkflow tool', () => {
  const mockClient = {
    validateWorkflow: vi.fn(),
    listTasks: vi.fn()
  };

  const validYaml = `name: test-workflow
input:
  type: object
  properties:
    userId:
      type: string
output:
  result: "{{ tasks.fetch-user.output.user }}"
tasks:
  - id: fetch-user
    taskRef: get-user
    input:
      userId: "{{ input.userId }}"`;

  beforeEach(() => {
    vi.resetAllMocks();
    mockClient.listTasks.mockResolvedValue([
      { name: 'get-user', description: 'Get user' }
    ]);
  });

  describe('valid workflow', () => {
    it('should validate a correct workflow', async () => {
      mockClient.validateWorkflow.mockResolvedValueOnce({
        valid: true,
        errors: [],
        warnings: []
      });

      const result = await validateWorkflow(
        mockClient as unknown as GatewayClient,
        { yaml: validYaml }
      );

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('schema errors', () => {
    it('should catch schema validation errors', async () => {
      mockClient.validateWorkflow.mockResolvedValueOnce({
        valid: false,
        errors: [
          { message: 'Missing required field "name"', code: 'SCHEMA_ERROR' }
        ],
        warnings: []
      });

      const result = await validateWorkflow(
        mockClient as unknown as GatewayClient,
        { yaml: 'tasks: []' }
      );

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain('Missing required');
    });
  });

  describe('template syntax errors', () => {
    it('should catch invalid template syntax', async () => {
      const invalidYaml = `name: test
tasks:
  - id: t1
    taskRef: get-user
    input:
      userId: "{{ invalid template"`;

      mockClient.validateWorkflow.mockResolvedValueOnce({
        valid: false,
        errors: [
          { message: 'Invalid template syntax: {{ invalid template', code: 'TEMPLATE_ERROR' }
        ],
        warnings: []
      });

      const result = await validateWorkflow(
        mockClient as unknown as GatewayClient,
        { yaml: invalidYaml }
      );

      expect(result.valid).toBe(false);
      expect(result.errors[0].message).toContain('template');
    });
  });

  describe('circular dependency errors', () => {
    it('should catch circular dependencies', async () => {
      const circularYaml = `name: circular
tasks:
  - id: a
    taskRef: get-user
    dependsOn: [b]
  - id: b
    taskRef: get-user
    dependsOn: [a]`;

      mockClient.validateWorkflow.mockResolvedValueOnce({
        valid: false,
        errors: [
          { message: 'Circular dependency detected: a → b → a', code: 'CIRCULAR_DEP' }
        ],
        warnings: []
      });

      const result = await validateWorkflow(
        mockClient as unknown as GatewayClient,
        { yaml: circularYaml }
      );

      expect(result.valid).toBe(false);
      expect(result.errors[0].message).toContain('Circular');
    });
  });

  describe('unknown task reference', () => {
    it('should catch unknown task references', async () => {
      const unknownTaskYaml = `name: test
tasks:
  - id: t1
    taskRef: nonexistent-task`;

      mockClient.validateWorkflow.mockResolvedValueOnce({
        valid: false,
        errors: [
          { message: 'Unknown task reference: "nonexistent-task"', code: 'UNKNOWN_TASK' }
        ],
        warnings: []
      });

      const result = await validateWorkflow(
        mockClient as unknown as GatewayClient,
        { yaml: unknownTaskYaml }
      );

      expect(result.valid).toBe(false);
      expect(result.errors[0].message).toContain('nonexistent-task');
    });
  });

  describe('fix suggestions', () => {
    it('should provide fix suggestions when enabled', async () => {
      mockClient.validateWorkflow.mockResolvedValueOnce({
        valid: false,
        errors: [
          { message: 'Unknown task reference: "bad-task"', code: 'UNKNOWN_TASK' }
        ],
        warnings: []
      });

      const result = await validateWorkflow(
        mockClient as unknown as GatewayClient,
        { yaml: 'tasks: []', suggestFixes: true }
      );

      expect(result.errors[0].suggestion).toBeTruthy();
    });

    it('should skip suggestions when disabled', async () => {
      mockClient.validateWorkflow.mockResolvedValueOnce({
        valid: false,
        errors: [
          { message: 'Unknown task reference: "bad-task"', code: 'UNKNOWN_TASK' }
        ],
        warnings: []
      });

      const result = await validateWorkflow(
        mockClient as unknown as GatewayClient,
        { yaml: 'tasks: []', suggestFixes: false }
      );

      expect(result.errors[0].suggestion).toBeUndefined();
    });
  });

  describe('warnings', () => {
    it('should handle warnings separately from errors', async () => {
      mockClient.validateWorkflow.mockResolvedValueOnce({
        valid: true,
        errors: [],
        warnings: [
          { message: 'Task "t1" has no outputs used' }
        ]
      });

      const result = await validateWorkflow(
        mockClient as unknown as GatewayClient,
        { yaml: validYaml }
      );

      expect(result.valid).toBe(true);
      expect(result.warnings).toHaveLength(1);
    });
  });

  describe('malformed YAML', () => {
    it('should handle malformed YAML', async () => {
      mockClient.validateWorkflow.mockResolvedValueOnce({
        valid: false,
        errors: [
          { message: 'YAML parse error: unexpected token', code: 'YAML_ERROR' }
        ],
        warnings: []
      });

      const result = await validateWorkflow(
        mockClient as unknown as GatewayClient,
        { yaml: 'not: valid: yaml: here' }
      );

      expect(result.valid).toBe(false);
      expect(result.errors[0].message).toContain('YAML');
    });
  });

  describe('API errors', () => {
    it('should handle API errors during validation', async () => {
      mockClient.validateWorkflow.mockRejectedValueOnce(new Error('API error'));

      await expect(
        validateWorkflow(mockClient as unknown as GatewayClient, { yaml: validYaml })
      ).rejects.toThrow('API error');
    });
  });
});
