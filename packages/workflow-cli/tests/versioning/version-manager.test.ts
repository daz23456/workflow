/**
 * Version Manager Tests
 * TDD: RED phase - write failing tests first
 */

import { describe, it, expect } from 'vitest';
import {
  incrementVersion,
  generateVersionLabels,
  parseVersion,
  type VersionInfo
} from '../../src/versioning/version-manager.js';

describe('version-manager', () => {
  describe('parseVersion', () => {
    it('should parse version from task name', () => {
      const result = parseVersion('get-user-v2');

      expect(result).toEqual({
        baseName: 'get-user',
        version: 2
      });
    });

    it('should handle task names without version', () => {
      const result = parseVersion('get-user');

      expect(result).toEqual({
        baseName: 'get-user',
        version: 1
      });
    });

    it('should handle complex task names with version', () => {
      const result = parseVersion('user-profile-v10');

      expect(result).toEqual({
        baseName: 'user-profile',
        version: 10
      });
    });
  });

  describe('incrementVersion', () => {
    it('should increment version for breaking change', () => {
      const newName = incrementVersion('get-user', true);
      expect(newName).toBe('get-user-v2');
    });

    it('should increment existing version', () => {
      const newName = incrementVersion('get-user-v2', true);
      expect(newName).toBe('get-user-v3');
    });

    it('should not increment for non-breaking change', () => {
      const newName = incrementVersion('get-user', false);
      expect(newName).toBe('get-user');
    });
  });

  describe('generateVersionLabels', () => {
    it('should generate labels for versioned task', () => {
      const labels = generateVersionLabels('get-user-v2', 'abc123');

      expect(labels['workflow.io/content-hash']).toBe('abc123');
      expect(labels['workflow.io/version']).toBe('2');
      expect(labels['workflow.io/base-name']).toBe('get-user');
    });

    it('should include replaces label when specified', () => {
      const labels = generateVersionLabels('get-user-v2', 'abc123', 'get-user');

      expect(labels['workflow.io/replaces']).toBe('get-user');
    });

    it('should mark as deprecated when specified', () => {
      const labels = generateVersionLabels('get-user', 'abc123', undefined, true);

      expect(labels['workflow.io/deprecated']).toBe('true');
    });
  });
});
