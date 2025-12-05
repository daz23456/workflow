import { describe, it, expect } from 'vitest';
import { generateTasksFromSpec, writeTasksToFiles } from '../src/crd-generator.js';
import type { ParsedSpec, ParsedEndpoint } from '../src/openapi-parser.js';

const createMockEndpoint = (overrides: Partial<ParsedEndpoint> = {}): ParsedEndpoint => ({
  operationId: 'testOperation',
  path: '/api/test',
  method: 'GET',
  summary: 'Test endpoint',
  tags: [],
  parameters: [],
  responses: [
    {
      statusCode: '200',
      contentType: 'application/json',
      schema: { type: 'object', properties: { result: { type: 'string' } } }
    }
  ],
  security: [],
  ...overrides
});

const createMockSpec = (endpoints: ParsedEndpoint[] = [createMockEndpoint()]): ParsedSpec => ({
  title: 'Test API',
  version: '1.0.0',
  baseUrl: 'http://localhost:5100',
  endpoints,
  schemas: {}
});

describe('CRD Generator', () => {
  describe('generateTasksFromSpec', () => {
    it('should generate a task for each endpoint', () => {
      const spec = createMockSpec([
        createMockEndpoint({ operationId: 'op1', path: '/api/one' }),
        createMockEndpoint({ operationId: 'op2', path: '/api/two' })
      ]);

      const tasks = generateTasksFromSpec(spec, {
        baseUrl: 'http://localhost:5100',
        namespace: 'test'
      });

      expect(tasks.length).toBe(2);
    });

    it('should generate valid WorkflowTask CRD structure', () => {
      const spec = createMockSpec([
        createMockEndpoint({ operationId: 'getString', path: '/api/string' })
      ]);

      const tasks = generateTasksFromSpec(spec, {
        baseUrl: 'http://localhost:5100',
        namespace: 'test'
      });

      const task = tasks[0];
      expect(task.resource.apiVersion).toBe('workflow.example.com/v1');
      expect(task.resource.kind).toBe('WorkflowTask');
      expect(task.resource.metadata.name).toBe('getstring');
      expect(task.resource.metadata.namespace).toBe('test');
      expect(task.resource.spec.type).toBe('http');
    });

    it('should set correct HTTP method', () => {
      const spec = createMockSpec([
        createMockEndpoint({ operationId: 'postData', method: 'POST' })
      ]);

      const tasks = generateTasksFromSpec(spec, {
        baseUrl: 'http://localhost:5100',
        namespace: 'default'
      });

      expect(tasks[0].resource.spec.request?.method).toBe('POST');
    });

    it('should convert path parameters to template syntax', () => {
      const spec = createMockSpec([
        createMockEndpoint({
          operationId: 'getUserById',
          path: '/api/users/{id}',
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string' } }
          ]
        })
      ]);

      const tasks = generateTasksFromSpec(spec, {
        baseUrl: 'http://localhost:5100',
        namespace: 'default'
      });

      expect(tasks[0].resource.spec.request?.url).toBe('http://localhost:5100/api/users/{{input.id}}');
    });

    it('should include path parameters in input schema', () => {
      const spec = createMockSpec([
        createMockEndpoint({
          operationId: 'getUserById',
          path: '/api/users/{id}',
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string' } }
          ]
        })
      ]);

      const tasks = generateTasksFromSpec(spec, {
        baseUrl: 'http://localhost:5100',
        namespace: 'default'
      });

      const inputSchema = tasks[0].resource.spec.inputSchema;
      expect(inputSchema?.properties?.id).toBeDefined();
      expect(inputSchema?.required).toContain('id');
    });

    it('should add body to input schema for POST requests', () => {
      const spec = createMockSpec([
        createMockEndpoint({
          operationId: 'createUser',
          method: 'POST',
          requestBody: {
            required: true,
            contentType: 'application/json',
            schema: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                email: { type: 'string' }
              }
            }
          }
        })
      ]);

      const tasks = generateTasksFromSpec(spec, {
        baseUrl: 'http://localhost:5100',
        namespace: 'default'
      });

      const inputSchema = tasks[0].resource.spec.inputSchema;
      expect(inputSchema?.properties?.body).toBeDefined();
      expect(inputSchema?.required).toContain('body');
    });

    it('should set Content-Type header for POST requests', () => {
      const spec = createMockSpec([
        createMockEndpoint({
          operationId: 'createUser',
          method: 'POST',
          requestBody: {
            required: true,
            contentType: 'application/json',
            schema: { type: 'object' }
          }
        })
      ]);

      const tasks = generateTasksFromSpec(spec, {
        baseUrl: 'http://localhost:5100',
        namespace: 'default'
      });

      expect(tasks[0].resource.spec.request?.headers?.['Content-Type']).toBe('application/json');
    });

    it('should extract output schema from 200 response', () => {
      const spec = createMockSpec([
        createMockEndpoint({
          operationId: 'getUser',
          responses: [
            {
              statusCode: '200',
              contentType: 'application/json',
              schema: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  name: { type: 'string' }
                }
              }
            }
          ]
        })
      ]);

      const tasks = generateTasksFromSpec(spec, {
        baseUrl: 'http://localhost:5100',
        namespace: 'default'
      });

      const outputSchema = tasks[0].resource.spec.outputSchema;
      expect(outputSchema?.properties?.id).toEqual({ type: 'string' });
      expect(outputSchema?.properties?.name).toEqual({ type: 'string' });
    });

    it('should filter by tags when specified', () => {
      const spec = createMockSpec([
        createMockEndpoint({ operationId: 'op1', tags: ['users'] }),
        createMockEndpoint({ operationId: 'op2', tags: ['payments'] }),
        createMockEndpoint({ operationId: 'op3', tags: ['users', 'admin'] })
      ]);

      const tasks = generateTasksFromSpec(spec, {
        baseUrl: 'http://localhost:5100',
        namespace: 'default',
        tags: ['users']
      });

      expect(tasks.length).toBe(2);
      expect(tasks.map(t => t.operationId)).toContain('op1');
      expect(tasks.map(t => t.operationId)).toContain('op3');
    });

    it('should exclude by tags when specified', () => {
      const spec = createMockSpec([
        createMockEndpoint({ operationId: 'op1', tags: ['users'] }),
        createMockEndpoint({ operationId: 'op2', tags: ['internal'] }),
        createMockEndpoint({ operationId: 'op3', tags: ['payments'] })
      ]);

      const tasks = generateTasksFromSpec(spec, {
        baseUrl: 'http://localhost:5100',
        namespace: 'default',
        excludeTags: ['internal']
      });

      expect(tasks.length).toBe(2);
      expect(tasks.map(t => t.operationId)).not.toContain('op2');
    });

    it('should add prefix to task names when specified', () => {
      const spec = createMockSpec([
        createMockEndpoint({ operationId: 'getString' })
      ]);

      const tasks = generateTasksFromSpec(spec, {
        baseUrl: 'http://localhost:5100',
        namespace: 'default',
        prefix: 'test-api'
      });

      expect(tasks[0].resource.metadata.name).toBe('test-api-getstring');
    });

    it('should add labels and annotations', () => {
      const spec = createMockSpec([
        createMockEndpoint({ operationId: 'getString', path: '/api/string' })
      ]);

      const tasks = generateTasksFromSpec(spec, {
        baseUrl: 'http://localhost:5100',
        namespace: 'default'
      });

      expect(tasks[0].resource.metadata.labels?.['workflow.io/generated-from']).toBe('openapi');
      expect(tasks[0].resource.metadata.labels?.['workflow.io/operation-id']).toBe('getString');
      expect(tasks[0].resource.metadata.annotations?.['workflow.io/source-path']).toBe('/api/string');
    });

    it('should set default timeout and retry policy', () => {
      const spec = createMockSpec([createMockEndpoint()]);

      const tasks = generateTasksFromSpec(spec, {
        baseUrl: 'http://localhost:5100',
        namespace: 'default'
      });

      expect(tasks[0].resource.spec.timeout).toBe('30s');
      expect(tasks[0].resource.spec.retry?.maxAttempts).toBe(3);
      expect(tasks[0].resource.spec.retry?.backoffMs).toBe(1000);
    });

    it('should generate valid YAML output', () => {
      const spec = createMockSpec([
        createMockEndpoint({ operationId: 'getString' })
      ]);

      const tasks = generateTasksFromSpec(spec, {
        baseUrl: 'http://localhost:5100',
        namespace: 'default'
      });

      expect(tasks[0].yaml).toContain('apiVersion: workflow.example.com/v1');
      expect(tasks[0].yaml).toContain('kind: WorkflowTask');
      expect(tasks[0].yaml).toContain('name: getstring');
    });

    it('should truncate task names longer than 63 characters', () => {
      const spec = createMockSpec([
        createMockEndpoint({
          operationId: 'thisIsAReallyLongOperationIdThatExceedsTheKubernetesNameLimitOfSixtyThreeCharacters'
        })
      ]);

      const tasks = generateTasksFromSpec(spec, {
        baseUrl: 'http://localhost:5100',
        namespace: 'default'
      });

      expect(tasks[0].resource.metadata.name.length).toBeLessThanOrEqual(63);
    });

    it('should prefix task names starting with numbers', () => {
      const spec = createMockSpec([
        createMockEndpoint({ operationId: '123-operation' })
      ]);

      const tasks = generateTasksFromSpec(spec, {
        baseUrl: 'http://localhost:5100',
        namespace: 'default'
      });

      expect(tasks[0].resource.metadata.name).toMatch(/^[a-z]/);
    });

    it('should handle query parameters in input schema', () => {
      const spec = createMockSpec([
        createMockEndpoint({
          operationId: 'searchItems',
          parameters: [
            { name: 'query', in: 'query', required: true, schema: { type: 'string' } },
            { name: 'limit', in: 'query', required: false, schema: { type: 'integer' } }
          ]
        })
      ]);

      const tasks = generateTasksFromSpec(spec, {
        baseUrl: 'http://localhost:5100',
        namespace: 'default'
      });

      const inputSchema = tasks[0].resource.spec.inputSchema;
      expect(inputSchema?.properties?.query).toBeDefined();
      expect(inputSchema?.properties?.limit).toBeDefined();
      expect(inputSchema?.required).toContain('query');
      expect(inputSchema?.required).not.toContain('limit');
    });

    it('should handle header parameters in input schema and headers', () => {
      const spec = createMockSpec([
        createMockEndpoint({
          operationId: 'secureEndpoint',
          parameters: [
            { name: 'X-API-Key', in: 'header', required: true, schema: { type: 'string' } },
            { name: 'X-Request-ID', in: 'header', required: false, schema: { type: 'string' } }
          ]
        })
      ]);

      const tasks = generateTasksFromSpec(spec, {
        baseUrl: 'http://localhost:5100',
        namespace: 'default'
      });

      const inputSchema = tasks[0].resource.spec.inputSchema;
      expect(inputSchema?.properties?.['X-API-Key']).toBeDefined();
      expect(inputSchema?.required).toContain('X-API-Key');

      const headers = tasks[0].resource.spec.request?.headers;
      expect(headers?.['X-API-Key']).toBe('{{input.X-API-Key}}');
      expect(headers?.['X-Request-ID']).toBe('{{input.X-Request-ID}}');
    });

    it('should use description from endpoint', () => {
      const spec = createMockSpec([
        createMockEndpoint({
          operationId: 'getUser',
          summary: 'Get user by ID',
          description: 'Detailed description here'
        })
      ]);

      const tasks = generateTasksFromSpec(spec, {
        baseUrl: 'http://localhost:5100',
        namespace: 'default'
      });

      expect(tasks[0].resource.spec.description).toBe('Get user by ID');
    });

    it('should use method and path for description when no summary', () => {
      const spec = createMockSpec([
        createMockEndpoint({
          operationId: 'getUser',
          summary: undefined,
          description: undefined,
          path: '/api/users',
          method: 'GET'
        })
      ]);

      const tasks = generateTasksFromSpec(spec, {
        baseUrl: 'http://localhost:5100',
        namespace: 'default'
      });

      expect(tasks[0].resource.spec.description).toBe('GET /api/users');
    });

    it('should handle endpoint with no 200 response', () => {
      const spec = createMockSpec([
        createMockEndpoint({
          operationId: 'deleteItem',
          responses: [
            { statusCode: '204', description: 'No Content' }
          ]
        })
      ]);

      const tasks = generateTasksFromSpec(spec, {
        baseUrl: 'http://localhost:5100',
        namespace: 'default'
      });

      // Should use default response if no success response
      expect(tasks[0].resource.spec.outputSchema).toBeDefined();
    });

    it('should use 201 response when 200 is not available', () => {
      const spec = createMockSpec([
        createMockEndpoint({
          operationId: 'createItem',
          responses: [
            {
              statusCode: '201',
              contentType: 'application/json',
              schema: { type: 'object', properties: { id: { type: 'string' } } }
            }
          ]
        })
      ]);

      const tasks = generateTasksFromSpec(spec, {
        baseUrl: 'http://localhost:5100',
        namespace: 'default'
      });

      expect(tasks[0].resource.spec.outputSchema?.properties?.id).toBeDefined();
    });

    it('should include method and path in GeneratedTask', () => {
      const spec = createMockSpec([
        createMockEndpoint({
          operationId: 'testOp',
          method: 'POST',
          path: '/api/test'
        })
      ]);

      const tasks = generateTasksFromSpec(spec, {
        baseUrl: 'http://localhost:5100',
        namespace: 'default'
      });

      expect(tasks[0].method).toBe('POST');
      expect(tasks[0].path).toBe('/api/test');
    });
  });

  describe('writeTasksToFiles', () => {
    it('should be a function', () => {
      expect(typeof writeTasksToFiles).toBe('function');
    });
  });
});
