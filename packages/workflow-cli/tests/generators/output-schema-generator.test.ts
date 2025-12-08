/**
 * Output Schema Generator Tests
 * TDD: RED phase - write failing tests first
 */

import { describe, it, expect } from 'vitest';
import { buildOutputSchema, findSuccessResponse } from '../../src/generators/output-schema-generator.js';
import type { ParsedEndpoint, ParsedResponse } from '../../src/openapi-parser.js';

describe('output-schema-generator', () => {
  describe('buildOutputSchema', () => {
    it('should use 200 response schema when available', () => {
      const endpoint: ParsedEndpoint = {
        path: '/users/{id}',
        method: 'get',
        operationId: 'getUser',
        summary: 'Get user',
        tags: [],
        parameters: [],
        responses: [
          {
            statusCode: '200',
            description: 'Successful response',
            schema: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                name: { type: 'string' }
              }
            }
          }
        ]
      };

      const schema = buildOutputSchema(endpoint);
      expect(schema.type).toBe('object');
      expect(schema.properties?.id).toBeDefined();
      expect(schema.properties?.name).toBeDefined();
    });

    it('should use 201 response for POST endpoints', () => {
      const endpoint: ParsedEndpoint = {
        path: '/users',
        method: 'post',
        operationId: 'createUser',
        summary: 'Create user',
        tags: [],
        parameters: [],
        responses: [
          {
            statusCode: '201',
            description: 'Created',
            schema: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                createdAt: { type: 'string' }
              }
            }
          }
        ]
      };

      const schema = buildOutputSchema(endpoint);
      expect(schema.type).toBe('object');
      expect(schema.properties?.id).toBeDefined();
      expect(schema.properties?.createdAt).toBeDefined();
    });

    it('should fallback to default response when no success codes', () => {
      const endpoint: ParsedEndpoint = {
        path: '/legacy',
        method: 'get',
        operationId: 'legacyEndpoint',
        summary: 'Legacy endpoint',
        tags: [],
        parameters: [],
        responses: [
          {
            statusCode: 'default',
            description: 'Default response',
            schema: {
              type: 'object',
              properties: {
                data: { type: 'string' }
              }
            }
          }
        ]
      };

      const schema = buildOutputSchema(endpoint);
      expect(schema.properties?.data).toBeDefined();
    });

    it('should return generic schema when no response defined', () => {
      const endpoint: ParsedEndpoint = {
        path: '/void',
        method: 'delete',
        operationId: 'deleteItem',
        summary: 'Delete item',
        tags: [],
        parameters: [],
        responses: []
      };

      const schema = buildOutputSchema(endpoint);
      expect(schema.type).toBe('object');
      expect(schema.description).toContain('Response');
    });
  });

  describe('findSuccessResponse', () => {
    it('should prioritize 200 over other status codes', () => {
      const responses: ParsedResponse[] = [
        { statusCode: '400', description: 'Bad request' },
        { statusCode: '200', description: 'OK', schema: { type: 'object' } },
        { statusCode: '201', description: 'Created', schema: { type: 'string' } }
      ];

      const result = findSuccessResponse(responses);
      expect(result?.statusCode).toBe('200');
    });

    it('should use 201 when 200 is not available', () => {
      const responses: ParsedResponse[] = [
        { statusCode: '400', description: 'Bad request' },
        { statusCode: '201', description: 'Created', schema: { type: 'object' } }
      ];

      const result = findSuccessResponse(responses);
      expect(result?.statusCode).toBe('201');
    });

    it('should fallback to default when no 2xx codes', () => {
      const responses: ParsedResponse[] = [
        { statusCode: '400', description: 'Bad request' },
        { statusCode: 'default', description: 'Default', schema: { type: 'object' } }
      ];

      const result = findSuccessResponse(responses);
      expect(result?.statusCode).toBe('default');
    });

    it('should return undefined when no valid response found', () => {
      const responses: ParsedResponse[] = [
        { statusCode: '400', description: 'Bad request' },
        { statusCode: '500', description: 'Server error' }
      ];

      const result = findSuccessResponse(responses);
      expect(result).toBeUndefined();
    });
  });
});
