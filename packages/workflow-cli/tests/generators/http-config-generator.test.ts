/**
 * HTTP Config Generator Tests
 * TDD: RED phase - write failing tests first
 */

import { describe, it, expect } from 'vitest';
import {
  generateHttpConfig,
  buildUrlWithTemplates,
  buildHeaders
} from '../../src/generators/http-config-generator.js';
import type { ParsedEndpoint } from '../../src/openapi-parser.js';

describe('http-config-generator', () => {
  describe('buildUrlWithTemplates', () => {
    it('should replace path parameters with template syntax', () => {
      const url = buildUrlWithTemplates('https://api.example.com', '/users/{userId}');
      expect(url).toBe('https://api.example.com/users/{{input.userId}}');
    });

    it('should handle multiple path parameters', () => {
      const url = buildUrlWithTemplates('https://api.example.com', '/users/{userId}/posts/{postId}');
      expect(url).toBe('https://api.example.com/users/{{input.userId}}/posts/{{input.postId}}');
    });

    it('should handle paths without parameters', () => {
      const url = buildUrlWithTemplates('https://api.example.com', '/users');
      expect(url).toBe('https://api.example.com/users');
    });

    it('should handle base URL without trailing slash', () => {
      const url = buildUrlWithTemplates('https://api.example.com/', '/users');
      expect(url).toBe('https://api.example.com/users');
    });
  });

  describe('buildHeaders', () => {
    it('should include Accept header by default', () => {
      const endpoint: ParsedEndpoint = {
        path: '/users',
        method: 'get',
        operationId: 'listUsers',
        summary: 'List users',
        tags: [],
        parameters: [],
        responses: []
      };

      const headers = buildHeaders(endpoint);
      expect(headers['Accept']).toBe('application/json');
    });

    it('should include Content-Type for request body', () => {
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
          schema: { type: 'object' }
        },
        responses: []
      };

      const headers = buildHeaders(endpoint);
      expect(headers['Content-Type']).toBe('application/json');
    });

    it('should add header parameters as templates', () => {
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
            schema: { type: 'string' }
          }
        ],
        responses: []
      };

      const headers = buildHeaders(endpoint);
      expect(headers['X-API-Key']).toBe('{{input.X-API-Key}}');
    });
  });

  describe('generateHttpConfig', () => {
    it('should generate complete HTTP config for GET endpoint', () => {
      const endpoint: ParsedEndpoint = {
        path: '/users/{id}',
        method: 'get',
        operationId: 'getUser',
        summary: 'Get user',
        tags: [],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } }
        ],
        responses: []
      };

      const config = generateHttpConfig(endpoint, 'https://api.example.com');
      expect(config.url).toBe('https://api.example.com/users/{{input.id}}');
      expect(config.method).toBe('GET');
      expect(config.headers['Accept']).toBe('application/json');
    });

    it('should generate HTTP config with body template for POST', () => {
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
          schema: { type: 'object' }
        },
        responses: []
      };

      const config = generateHttpConfig(endpoint, 'https://api.example.com');
      expect(config.method).toBe('POST');
      expect(config.body).toBe('{{input.body | toJson}}');
      expect(config.headers['Content-Type']).toBe('application/json');
    });
  });
});
