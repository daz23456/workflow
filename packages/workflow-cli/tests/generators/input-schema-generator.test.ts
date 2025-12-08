/**
 * Input Schema Generator Tests
 * TDD: RED phase - write failing tests first
 */

import { describe, it, expect } from 'vitest';
import { buildInputSchema, extractPathParams } from '../../src/generators/input-schema-generator.js';
import type { ParsedEndpoint } from '../../src/openapi-parser.js';

describe('input-schema-generator', () => {
  describe('buildInputSchema', () => {
    it('should include path parameters as required properties', () => {
      const endpoint: ParsedEndpoint = {
        path: '/users/{userId}',
        method: 'get',
        operationId: 'getUser',
        summary: 'Get user',
        tags: [],
        parameters: [
          {
            name: 'userId',
            in: 'path',
            required: true,
            schema: { type: 'string' },
            description: 'The user ID'
          }
        ],
        responses: []
      };

      const schema = buildInputSchema(endpoint);
      expect(schema.type).toBe('object');
      expect(schema.properties?.userId).toBeDefined();
      expect(schema.properties?.userId?.type).toBe('string');
      expect(schema.required).toContain('userId');
    });

    it('should include query parameters with optional ones not in required', () => {
      const endpoint: ParsedEndpoint = {
        path: '/users',
        method: 'get',
        operationId: 'listUsers',
        summary: 'List users',
        tags: [],
        parameters: [
          {
            name: 'limit',
            in: 'query',
            required: false,
            schema: { type: 'integer' },
            description: 'Max results'
          },
          {
            name: 'filter',
            in: 'query',
            required: true,
            schema: { type: 'string' },
            description: 'Filter query'
          }
        ],
        responses: []
      };

      const schema = buildInputSchema(endpoint);
      expect(schema.properties?.limit).toBeDefined();
      expect(schema.properties?.filter).toBeDefined();
      expect(schema.required).not.toContain('limit');
      expect(schema.required).toContain('filter');
    });

    it('should include header parameters', () => {
      const endpoint: ParsedEndpoint = {
        path: '/secure',
        method: 'get',
        operationId: 'secureEndpoint',
        summary: 'Secure endpoint',
        tags: [],
        parameters: [
          {
            name: 'X-API-Key',
            in: 'header',
            required: true,
            schema: { type: 'string' },
            description: 'API key header'
          }
        ],
        responses: []
      };

      const schema = buildInputSchema(endpoint);
      expect(schema.properties?.['X-API-Key']).toBeDefined();
      expect(schema.required).toContain('X-API-Key');
    });

    it('should include request body as body property', () => {
      const endpoint: ParsedEndpoint = {
        path: '/users',
        method: 'post',
        operationId: 'createUser',
        summary: 'Create user',
        tags: [],
        parameters: [],
        requestBody: {
          required: true,
          contentType: 'application/json',
          description: 'User data',
          schema: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              email: { type: 'string' }
            }
          }
        },
        responses: []
      };

      const schema = buildInputSchema(endpoint);
      expect(schema.properties?.body).toBeDefined();
      expect(schema.properties?.body?.type).toBe('object');
      expect(schema.required).toContain('body');
    });

    it('should handle endpoint with no parameters', () => {
      const endpoint: ParsedEndpoint = {
        path: '/health',
        method: 'get',
        operationId: 'healthCheck',
        summary: 'Health check',
        tags: [],
        parameters: [],
        responses: []
      };

      const schema = buildInputSchema(endpoint);
      expect(schema.type).toBe('object');
      expect(schema.properties).toEqual({});
      expect(schema.required).toBeUndefined();
    });
  });

  describe('extractPathParams', () => {
    it('should extract path parameter names from URL pattern', () => {
      const params = extractPathParams('/users/{userId}/posts/{postId}');
      expect(params).toEqual(['userId', 'postId']);
    });

    it('should return empty array for paths without parameters', () => {
      const params = extractPathParams('/users/all');
      expect(params).toEqual([]);
    });

    it('should handle single parameter', () => {
      const params = extractPathParams('/users/{id}');
      expect(params).toEqual(['id']);
    });
  });
});
