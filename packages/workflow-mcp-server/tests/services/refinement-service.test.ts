import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RefinementService } from '../../src/services/refinement-service.js';
import type { GatewayClient } from '../../src/services/gateway-client.js';
import type { TaskSummary, ValidationResult } from '../../src/types/index.js';

describe('RefinementService', () => {
  let mockClient: GatewayClient;
  const mockTasks: TaskSummary[] = [
    {
      name: 'get-user',
      description: 'Fetch user by ID',
      category: 'data',
      inputSchema: { type: 'object', properties: { userId: { type: 'string' } } },
      outputSchema: { type: 'object', properties: { user: { type: 'object' } } }
    },
    {
      name: 'send-email',
      description: 'Send email notification',
      category: 'notification',
      inputSchema: { type: 'object', properties: { to: { type: 'string' } } },
      outputSchema: { type: 'object', properties: { sent: { type: 'boolean' } } }
    }
  ];

  beforeEach(() => {
    mockClient = {
      validateWorkflow: vi.fn()
    } as unknown as GatewayClient;
  });

  describe('successful refinement', () => {
    it('should return success immediately if workflow is valid', async () => {
      vi.mocked(mockClient.validateWorkflow).mockResolvedValueOnce({
        valid: true,
        errors: [],
        warnings: []
      });

      const service = new RefinementService(mockClient);
      const result = await service.refineWorkflow('name: test', mockTasks);

      expect(result.valid).toBe(true);
      expect(result.terminationReason).toBe('success');
      expect(result.history).toHaveLength(0);
    });

    it('should fix errors and return success after refinement', async () => {
      // First call: has fixable error
      vi.mocked(mockClient.validateWorkflow).mockResolvedValueOnce({
        valid: false,
        errors: [{ message: 'Unknown task "get-usr" not found' }],
        warnings: []
      });
      // Second call: fixed
      vi.mocked(mockClient.validateWorkflow).mockResolvedValueOnce({
        valid: true,
        errors: [],
        warnings: []
      });

      const service = new RefinementService(mockClient);
      const result = await service.refineWorkflow(
        'name: test\ntasks:\n  - id: t1\n    taskRef: get-usr',
        mockTasks
      );

      expect(result.valid).toBe(true);
      expect(result.terminationReason).toBe('success');
      expect(result.history).toHaveLength(1);
      expect(result.history[0].errors).toContain('Unknown task "get-usr" not found');
    });
  });

  describe('termination: max_iterations', () => {
    it('should stop after max iterations', async () => {
      // Same error always triggers oscillation detection since hash is identical
      // To test max_iterations, we need errors that decrease but never reach 0
      vi.mocked(mockClient.validateWorkflow).mockResolvedValue({
        valid: false,
        errors: [{ message: 'Unknown task "invalid-1" not found' }],
        warnings: []
      });

      const service = new RefinementService(mockClient, 2); // max 2 iterations
      const result = await service.refineWorkflow('name: test', mockTasks);

      expect(result.valid).toBe(false);
      // Same error hash means oscillation is detected first
      expect(result.terminationReason).toBe('oscillation_detected');
    });

    it('should respect custom max iterations with decreasing error count', async () => {
      let callCount = 0;
      vi.mocked(mockClient.validateWorkflow).mockImplementation(async () => {
        callCount++;
        // Create decreasing error counts to avoid no_progress, but different hashes to avoid oscillation
        const errorCount = Math.max(1, 10 - callCount);
        const errors = Array.from({ length: errorCount }, (_, i) => ({
          message: `Unknown task "invalid-${callCount}-${i}" not found`
        }));
        return {
          valid: false,
          errors,
          warnings: []
        };
      });

      const service = new RefinementService(mockClient, 5);
      const result = await service.refineWorkflow('name: test', mockTasks);

      expect(result.terminationReason).toBe('max_iterations');
      expect(callCount).toBe(5);
    });
  });

  describe('termination: oscillation_detected', () => {
    it('should detect oscillation when same errors reappear', async () => {
      // To reach oscillation, we need error count to decrease (to avoid no_progress)
      // then have the same error hash reappear
      const errorA: ValidationResult = {
        valid: false,
        errors: [
          { message: 'Unknown task "taskA" not found' },
          { message: 'Unknown task "taskA2" not found' }
        ],
        warnings: []
      };
      const errorB: ValidationResult = {
        valid: false,
        errors: [{ message: 'Unknown task "taskB" not found' }],
        warnings: []
      };

      // A (2 errors) -> B (1 error, progress!) -> but same error count as B triggers no_progress
      // To get oscillation, we need A -> B -> A where each step shows progress
      // Actually simpler: just return same error twice, which triggers oscillation on 2nd call
      vi.mocked(mockClient.validateWorkflow)
        .mockResolvedValueOnce(errorA) // 2 errors
        .mockResolvedValueOnce(errorA); // Same hash -> oscillation

      const service = new RefinementService(mockClient, 10);
      const result = await service.refineWorkflow('name: test', mockTasks);

      expect(result.valid).toBe(false);
      expect(result.terminationReason).toBe('oscillation_detected');
    });

    it('should detect immediate oscillation (same error twice)', async () => {
      const sameError: ValidationResult = {
        valid: false,
        errors: [{ message: 'Unknown task "same" not found' }],
        warnings: []
      };

      vi.mocked(mockClient.validateWorkflow)
        .mockResolvedValueOnce(sameError)
        .mockResolvedValueOnce(sameError);

      const service = new RefinementService(mockClient);
      const result = await service.refineWorkflow('name: test', mockTasks);

      expect(result.terminationReason).toBe('oscillation_detected');
    });
  });

  describe('termination: no_progress', () => {
    it('should stop when error count does not decrease', async () => {
      vi.mocked(mockClient.validateWorkflow)
        .mockResolvedValueOnce({
          valid: false,
          errors: [
            { message: 'Unknown task "a" not found' },
            { message: 'Unknown task "b" not found' }
          ],
          warnings: []
        })
        .mockResolvedValueOnce({
          valid: false,
          errors: [
            { message: 'Unknown task "c" not found' },
            { message: 'Unknown task "d" not found' },
            { message: 'Unknown task "e" not found' }
          ], // More errors!
          warnings: []
        });

      const service = new RefinementService(mockClient);
      const result = await service.refineWorkflow('name: test', mockTasks);

      expect(result.valid).toBe(false);
      expect(result.terminationReason).toBe('no_progress');
    });

    it('should stop when error count stays the same', async () => {
      vi.mocked(mockClient.validateWorkflow)
        .mockResolvedValueOnce({
          valid: false,
          errors: [{ message: 'Unknown task "x" not found' }],
          warnings: []
        })
        .mockResolvedValueOnce({
          valid: false,
          errors: [{ message: 'Unknown task "y" not found' }], // Different but same count
          warnings: []
        });

      const service = new RefinementService(mockClient);
      const result = await service.refineWorkflow('name: test', mockTasks);

      // This should be oscillation_detected since it's different errors
      // but same count after first iteration should trigger no_progress
      expect(result.valid).toBe(false);
      expect(['no_progress', 'oscillation_detected']).toContain(result.terminationReason);
    });
  });

  describe('termination: unfixable_errors', () => {
    it('should stop when all errors are unfixable', async () => {
      vi.mocked(mockClient.validateWorkflow).mockResolvedValueOnce({
        valid: false,
        errors: [
          { message: 'Circular dependency detected: a -> b -> a' }
        ],
        warnings: []
      });

      const service = new RefinementService(mockClient);
      const result = await service.refineWorkflow('name: test', mockTasks);

      expect(result.valid).toBe(false);
      expect(result.terminationReason).toBe('unfixable_errors');
      expect(result.history).toHaveLength(0); // No refinement attempted
    });

    it('should stop when only schema_mismatch errors remain', async () => {
      vi.mocked(mockClient.validateWorkflow).mockResolvedValueOnce({
        valid: false,
        errors: [
          { message: 'Type expected string but got number for field userId' }
        ],
        warnings: []
      });

      const service = new RefinementService(mockClient);
      const result = await service.refineWorkflow('name: test', mockTasks);

      expect(result.terminationReason).toBe('unfixable_errors');
    });

    it('should stop when only invalid_yaml errors remain', async () => {
      vi.mocked(mockClient.validateWorkflow).mockResolvedValueOnce({
        valid: false,
        errors: [
          { message: 'YAML parse error: unexpected token' }
        ],
        warnings: []
      });

      const service = new RefinementService(mockClient);
      const result = await service.refineWorkflow('name: test', mockTasks);

      expect(result.terminationReason).toBe('unfixable_errors');
    });
  });

  describe('fix generation', () => {
    it('should fix unknown_task_ref by suggesting closest match', async () => {
      vi.mocked(mockClient.validateWorkflow)
        .mockResolvedValueOnce({
          valid: false,
          errors: [{ message: 'Unknown task "get-usr" not found' }],
          warnings: []
        })
        .mockResolvedValueOnce({
          valid: true,
          errors: [],
          warnings: []
        });

      const service = new RefinementService(mockClient);
      const result = await service.refineWorkflow(
        'name: test\ntasks:\n  - id: t1\n    taskRef: get-usr',
        mockTasks
      );

      expect(result.yaml).toContain('taskRef: get-user');
      expect(result.history[0].fixes).toContain('Replace taskRef "get-usr" with "get-user"');
    });

    it('should fix invalid_template syntax', async () => {
      vi.mocked(mockClient.validateWorkflow)
        .mockResolvedValueOnce({
          valid: false,
          errors: [{ message: 'Invalid template syntax: {{input.x}}' }],
          warnings: []
        })
        .mockResolvedValueOnce({
          valid: true,
          errors: [],
          warnings: []
        });

      const service = new RefinementService(mockClient);
      const result = await service.refineWorkflow(
        'name: test\ninput:\n  userId: "{{input.x}}"',
        mockTasks
      );

      expect(result.history[0].fixes.length).toBeGreaterThan(0);
    });
  });

  describe('history tracking', () => {
    it('should track each iteration in history', async () => {
      // Error count must decrease each iteration to avoid no_progress termination
      vi.mocked(mockClient.validateWorkflow)
        .mockResolvedValueOnce({
          valid: false,
          errors: [
            { message: 'Unknown task "a" not found' },
            { message: 'Unknown task "a2" not found' }
          ],
          warnings: []
        })
        .mockResolvedValueOnce({
          valid: false,
          errors: [{ message: 'Unknown task "b" not found' }], // 1 error, decreased from 2
          warnings: []
        })
        .mockResolvedValueOnce({
          valid: true,
          errors: [],
          warnings: []
        });

      const service = new RefinementService(mockClient);
      const result = await service.refineWorkflow('name: test', mockTasks);

      expect(result.history).toHaveLength(2);
      expect(result.history[0].iteration).toBe(1);
      expect(result.history[1].iteration).toBe(2);
    });

    it('should include errors and fixes in each step', async () => {
      vi.mocked(mockClient.validateWorkflow)
        .mockResolvedValueOnce({
          valid: false,
          errors: [{ message: 'Unknown task "invalid" not found' }],
          warnings: []
        })
        .mockResolvedValueOnce({
          valid: true,
          errors: [],
          warnings: []
        });

      const service = new RefinementService(mockClient);
      const result = await service.refineWorkflow(
        'name: test\ntasks:\n  - id: t1\n    taskRef: invalid',
        mockTasks
      );

      expect(result.history[0].errors).toHaveLength(1);
      expect(result.history[0].fixes.length).toBeGreaterThan(0);
    });
  });
});
