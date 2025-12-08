/**
 * Migration Generator Tests
 * TDD: RED phase - write failing tests first
 */

import { describe, it, expect } from 'vitest';
import {
  generateMigration,
  generateTransforms,
  type MigrationSpec
} from '../../src/versioning/migration-generator.js';
import type { ChangeResult } from '../../src/versioning/change-detector.js';

describe('migration-generator', () => {
  describe('generateTransforms', () => {
    it('should generate transform for added required field', () => {
      const changeResult: ChangeResult = {
        hasChanges: true,
        changes: [{
          field: 'inputSchema',
          type: 'modified',
          breaking: true,
          reason: 'Added required fields: email',
          oldValue: {
            type: 'object',
            properties: { userId: { type: 'string' } },
            required: ['userId']
          },
          newValue: {
            type: 'object',
            properties: {
              userId: { type: 'string' },
              email: { type: 'string' }
            },
            required: ['userId', 'email']
          }
        }]
      };

      const transforms = generateTransforms(changeResult);

      expect(transforms).toHaveLength(1);
      expect(transforms[0]).toEqual({
        field: 'email',
        suggestion: 'Add mapping for new required field: email',
        example: 'email: "{{workflow.input.email}}"'
      });
    });

    it('should generate transform for removed output field', () => {
      const changeResult: ChangeResult = {
        hasChanges: true,
        changes: [{
          field: 'outputSchema',
          type: 'modified',
          breaking: true,
          reason: 'Removed output fields: name',
          oldValue: {
            type: 'object',
            properties: { id: { type: 'string' }, name: { type: 'string' } }
          },
          newValue: {
            type: 'object',
            properties: { id: { type: 'string' } }
          }
        }]
      };

      const transforms = generateTransforms(changeResult);

      expect(transforms).toHaveLength(1);
      expect(transforms[0]).toEqual({
        field: 'name',
        suggestion: 'Field "name" removed from output - update dependent workflows',
        example: 'Consider alternative source or remove dependency'
      });
    });
  });

  describe('generateMigration', () => {
    it('should generate migration CRD spec', () => {
      const migration = generateMigration(
        'get-user',
        'get-user-v2',
        [{
          field: 'email',
          suggestion: 'Add mapping for email',
          example: 'email: "{{input.email}}"'
        }]
      );

      expect(migration.apiVersion).toBe('workflow.io/v1');
      expect(migration.kind).toBe('TaskMigration');
      expect(migration.metadata.name).toBe('get-user-to-get-user-v2');
      expect(migration.spec.from).toBe('get-user');
      expect(migration.spec.to).toBe('get-user-v2');
      expect(migration.spec.transforms).toHaveLength(1);
    });

    it('should set migration status to draft', () => {
      const migration = generateMigration('old-task', 'new-task', []);

      expect(migration.spec.status).toBe('draft');
    });
  });
});
