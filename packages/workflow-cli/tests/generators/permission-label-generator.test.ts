/**
 * Permission Label Generator Tests
 * TDD: RED phase - write failing tests first
 */

import { describe, it, expect } from 'vitest';
import { generatePermissionLabels, generateSecurityLabels } from '../../src/generators/permission-label-generator.js';
import type { ParsedEndpoint, SecurityScheme } from '../../src/openapi-parser.js';

describe('permission-label-generator', () => {
  describe('generatePermissionLabels', () => {
    it('should generate labels from endpoint tags', () => {
      const endpoint: ParsedEndpoint = {
        path: '/users/{id}',
        method: 'get',
        operationId: 'getUser',
        summary: 'Get user',
        tags: ['users', 'admin'],
        parameters: [],
        responses: []
      };

      const labels = generatePermissionLabels(endpoint);
      expect(labels['workflow.io/tags']).toBe('users,admin');
    });

    it('should generate operation label from method and path', () => {
      const endpoint: ParsedEndpoint = {
        path: '/users/{id}',
        method: 'delete',
        operationId: 'deleteUser',
        summary: 'Delete user',
        tags: [],
        parameters: [],
        responses: []
      };

      const labels = generatePermissionLabels(endpoint);
      expect(labels['workflow.io/operation']).toBe('delete');
      expect(labels['workflow.io/resource']).toBe('users');
    });

    it('should handle empty tags', () => {
      const endpoint: ParsedEndpoint = {
        path: '/health',
        method: 'get',
        operationId: 'healthCheck',
        summary: 'Health check',
        tags: [],
        parameters: [],
        responses: []
      };

      const labels = generatePermissionLabels(endpoint);
      expect(labels['workflow.io/tags']).toBeUndefined();
    });
  });

  describe('generateSecurityLabels', () => {
    it('should generate labels for API key security', () => {
      const schemes: SecurityScheme[] = [
        {
          type: 'apiKey',
          name: 'X-API-Key',
          in: 'header'
        }
      ];

      const labels = generateSecurityLabels(schemes);
      expect(labels['workflow.io/auth-type']).toBe('apiKey');
      expect(labels['workflow.io/auth-header']).toBe('X-API-Key');
    });

    it('should generate labels for OAuth2 security', () => {
      const schemes: SecurityScheme[] = [
        {
          type: 'oauth2',
          flows: {
            authorizationCode: {
              authorizationUrl: 'https://auth.example.com/authorize',
              tokenUrl: 'https://auth.example.com/token',
              scopes: { 'read:users': 'Read users', 'write:users': 'Write users' }
            }
          }
        }
      ];

      const labels = generateSecurityLabels(schemes);
      expect(labels['workflow.io/auth-type']).toBe('oauth2');
      expect(labels['workflow.io/auth-scopes']).toBe('read:users,write:users');
    });

    it('should generate labels for Bearer token security', () => {
      const schemes: SecurityScheme[] = [
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      ];

      const labels = generateSecurityLabels(schemes);
      expect(labels['workflow.io/auth-type']).toBe('bearer');
      expect(labels['workflow.io/auth-format']).toBe('JWT');
    });

    it('should handle empty security schemes', () => {
      const labels = generateSecurityLabels([]);
      expect(labels['workflow.io/auth-type']).toBeUndefined();
    });
  });
});
