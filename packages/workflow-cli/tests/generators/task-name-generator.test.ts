/**
 * Task Name Generator Tests
 * TDD: RED phase - write failing tests first
 */

import { describe, it, expect } from 'vitest';
import { generateTaskName, sanitizeForK8s } from '../../src/generators/task-name-generator.js';
import type { ParsedEndpoint } from '../../src/openapi-parser.js';

describe('task-name-generator', () => {
  describe('generateTaskName', () => {
    it('should use operationId when available', () => {
      const endpoint: ParsedEndpoint = {
        path: '/users/{id}',
        method: 'get',
        operationId: 'getUserById',
        summary: 'Get user by ID',
        tags: ['users'],
        parameters: [],
        responses: []
      };

      const result = generateTaskName(endpoint);
      expect(result).toBe('getuserbyid');
    });

    it('should apply prefix when specified', () => {
      const endpoint: ParsedEndpoint = {
        path: '/pets',
        method: 'get',
        operationId: 'listPets',
        summary: 'List pets',
        tags: ['pets'],
        parameters: [],
        responses: []
      };

      const result = generateTaskName(endpoint, 'api');
      expect(result).toBe('api-listpets');
    });

    it('should handle operationId with special characters', () => {
      const endpoint: ParsedEndpoint = {
        path: '/users',
        method: 'post',
        operationId: 'create_new_user',
        summary: 'Create user',
        tags: [],
        parameters: [],
        responses: []
      };

      const result = generateTaskName(endpoint);
      expect(result).toBe('create-new-user');
    });

    it('should prefix with task- when operationId starts with number', () => {
      const endpoint: ParsedEndpoint = {
        path: '/v2/items',
        method: 'get',
        operationId: '2ndVersionItems',
        summary: 'Get items',
        tags: [],
        parameters: [],
        responses: []
      };

      const result = generateTaskName(endpoint);
      expect(result).toBe('task-2ndversionitems');
    });
  });

  describe('sanitizeForK8s', () => {
    it('should convert to lowercase and replace special chars with hyphens', () => {
      expect(sanitizeForK8s('GetUserById')).toBe('getuserbyid');
      expect(sanitizeForK8s('create_new_user')).toBe('create-new-user');
      expect(sanitizeForK8s('user.profile.update')).toBe('user-profile-update');
    });

    it('should remove consecutive hyphens', () => {
      expect(sanitizeForK8s('get--user---by----id')).toBe('get-user-by-id');
    });

    it('should remove leading and trailing hyphens', () => {
      expect(sanitizeForK8s('-getUserById-')).toBe('getuserbyid');
      expect(sanitizeForK8s('---test---')).toBe('test');
    });

    it('should truncate to 63 characters (K8s name limit)', () => {
      const longName = 'a'.repeat(100);
      const result = sanitizeForK8s(longName);
      expect(result.length).toBeLessThanOrEqual(63);
    });

    it('should not leave trailing hyphen after truncation', () => {
      // Create a name that would end with hyphen after truncation
      const name = 'a'.repeat(62) + '-b';
      const result = sanitizeForK8s(name);
      expect(result.endsWith('-')).toBe(false);
    });
  });
});
