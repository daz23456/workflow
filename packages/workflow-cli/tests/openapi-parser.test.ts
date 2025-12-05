import { describe, it, expect, vi, beforeEach } from 'vitest';
import { parseOpenApiSpec } from '../src/openapi-parser.js';

// Sample OpenAPI 3.0 spec for testing
const sampleOpenApiSpec = {
  openapi: '3.0.0',
  info: {
    title: 'Test API',
    version: '1.0.0'
  },
  servers: [
    { url: 'http://localhost:5100' }
  ],
  paths: {
    '/api/primitives/string': {
      get: {
        operationId: 'getString',
        summary: 'Get a string value',
        tags: ['primitives'],
        responses: {
          '200': {
            description: 'Success',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    value: { type: 'string' }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/api/users/{id}': {
      get: {
        operationId: 'getUserById',
        summary: 'Get user by ID',
        tags: ['users'],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
            description: 'User ID'
          }
        ],
        responses: {
          '200': {
            description: 'Success',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    name: { type: 'string' },
                    email: { type: 'string' }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/api/payments/process': {
      post: {
        operationId: 'processPayment',
        summary: 'Process a payment',
        tags: ['payments'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  userId: { type: 'string' },
                  amount: { type: 'number' },
                  orderId: { type: 'string' }
                },
                required: ['userId', 'amount', 'orderId']
              }
            }
          }
        },
        responses: {
          '200': {
            description: 'Payment processed',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    transactionId: { type: 'string' },
                    status: { type: 'string' }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
};

describe('OpenAPI Parser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('parseOpenApiSpec', () => {
    it('should parse spec from URL', async () => {
      // Mock fetch
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(sampleOpenApiSpec)
      });

      const result = await parseOpenApiSpec('http://localhost:5100/swagger/v1/swagger.json');

      expect(result.title).toBe('Test API');
      expect(result.version).toBe('1.0.0');
      expect(result.baseUrl).toBe('http://localhost:5100');
      expect(result.endpoints.length).toBe(3);
    });

    it('should throw error on failed fetch', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found'
      });

      await expect(parseOpenApiSpec('http://localhost:5100/swagger.json'))
        .rejects.toThrow('Failed to fetch OpenAPI spec: 404 Not Found');
    });

    it('should extract base URL from servers', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(sampleOpenApiSpec)
      });

      const result = await parseOpenApiSpec('http://test.com/spec.json');

      expect(result.baseUrl).toBe('http://localhost:5100');
    });

    it('should extract all endpoints from paths', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(sampleOpenApiSpec)
      });

      const result = await parseOpenApiSpec('http://test.com/spec.json');

      expect(result.endpoints.length).toBe(3);

      const getStringEndpoint = result.endpoints.find(e => e.operationId === 'getString');
      expect(getStringEndpoint).toBeDefined();
      expect(getStringEndpoint?.method).toBe('GET');
      expect(getStringEndpoint?.path).toBe('/api/primitives/string');

      const getUserEndpoint = result.endpoints.find(e => e.operationId === 'getUserById');
      expect(getUserEndpoint).toBeDefined();
      expect(getUserEndpoint?.method).toBe('GET');
      expect(getUserEndpoint?.path).toBe('/api/users/{id}');

      const processPaymentEndpoint = result.endpoints.find(e => e.operationId === 'processPayment');
      expect(processPaymentEndpoint).toBeDefined();
      expect(processPaymentEndpoint?.method).toBe('POST');
    });

    it('should extract path parameters', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(sampleOpenApiSpec)
      });

      const result = await parseOpenApiSpec('http://test.com/spec.json');

      const getUserEndpoint = result.endpoints.find(e => e.operationId === 'getUserById');
      expect(getUserEndpoint?.parameters.length).toBe(1);
      expect(getUserEndpoint?.parameters[0].name).toBe('id');
      expect(getUserEndpoint?.parameters[0].in).toBe('path');
      expect(getUserEndpoint?.parameters[0].required).toBe(true);
    });

    it('should extract request body', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(sampleOpenApiSpec)
      });

      const result = await parseOpenApiSpec('http://test.com/spec.json');

      const processPaymentEndpoint = result.endpoints.find(e => e.operationId === 'processPayment');
      expect(processPaymentEndpoint?.requestBody).toBeDefined();
      expect(processPaymentEndpoint?.requestBody?.required).toBe(true);
      expect(processPaymentEndpoint?.requestBody?.contentType).toBe('application/json');
      expect(processPaymentEndpoint?.requestBody?.schema.properties).toBeDefined();
    });

    it('should extract response schema', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(sampleOpenApiSpec)
      });

      const result = await parseOpenApiSpec('http://test.com/spec.json');

      const getStringEndpoint = result.endpoints.find(e => e.operationId === 'getString');
      const successResponse = getStringEndpoint?.responses.find(r => r.statusCode === '200');
      expect(successResponse?.schema?.properties?.value).toEqual({ type: 'string' });
    });

    it('should extract tags', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(sampleOpenApiSpec)
      });

      const result = await parseOpenApiSpec('http://test.com/spec.json');

      const getStringEndpoint = result.endpoints.find(e => e.operationId === 'getString');
      expect(getStringEndpoint?.tags).toContain('primitives');

      const processPaymentEndpoint = result.endpoints.find(e => e.operationId === 'processPayment');
      expect(processPaymentEndpoint?.tags).toContain('payments');
    });

    it('should generate operationId if not provided', async () => {
      const specWithoutOperationId = {
        ...sampleOpenApiSpec,
        paths: {
          '/api/test/endpoint': {
            get: {
              responses: { '200': { description: 'OK' } }
            }
          }
        }
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(specWithoutOperationId)
      });

      const result = await parseOpenApiSpec('http://test.com/spec.json');

      expect(result.endpoints[0].operationId).toBe('get-api-test-endpoint');
    });

    it('should use default base URL when servers not specified', async () => {
      const specWithoutServers = {
        openapi: '3.0.0',
        info: { title: 'Test', version: '1.0.0' },
        paths: {}
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(specWithoutServers)
      });

      const result = await parseOpenApiSpec('http://test.com/spec.json');

      expect(result.baseUrl).toBe('http://localhost');
    });

    it('should handle endpoints without tags', async () => {
      const specWithoutTags = {
        openapi: '3.0.0',
        info: { title: 'Test', version: '1.0.0' },
        servers: [{ url: 'http://localhost' }],
        paths: {
          '/api/test': {
            get: {
              operationId: 'test',
              responses: { '200': { description: 'OK' } }
            }
          }
        }
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(specWithoutTags)
      });

      const result = await parseOpenApiSpec('http://test.com/spec.json');

      expect(result.endpoints[0].tags).toEqual([]);
    });

    it('should handle query parameters', async () => {
      const specWithQuery = {
        openapi: '3.0.0',
        info: { title: 'Test', version: '1.0.0' },
        servers: [{ url: 'http://localhost' }],
        paths: {
          '/api/search': {
            get: {
              operationId: 'search',
              parameters: [
                { name: 'q', in: 'query', required: true, schema: { type: 'string' } },
                { name: 'limit', in: 'query', required: false, schema: { type: 'integer' } }
              ],
              responses: { '200': { description: 'OK' } }
            }
          }
        }
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(specWithQuery)
      });

      const result = await parseOpenApiSpec('http://test.com/spec.json');

      const endpoint = result.endpoints[0];
      expect(endpoint.parameters.length).toBe(2);
      expect(endpoint.parameters.find(p => p.name === 'q')?.required).toBe(true);
      expect(endpoint.parameters.find(p => p.name === 'limit')?.required).toBe(false);
    });

    it('should handle header parameters', async () => {
      const specWithHeaders = {
        openapi: '3.0.0',
        info: { title: 'Test', version: '1.0.0' },
        servers: [{ url: 'http://localhost' }],
        paths: {
          '/api/secure': {
            get: {
              operationId: 'secure',
              parameters: [
                { name: 'X-API-Key', in: 'header', required: true, schema: { type: 'string' } }
              ],
              responses: { '200': { description: 'OK' } }
            }
          }
        }
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(specWithHeaders)
      });

      const result = await parseOpenApiSpec('http://test.com/spec.json');

      const endpoint = result.endpoints[0];
      expect(endpoint.parameters.find(p => p.in === 'header')).toBeDefined();
    });

    it('should handle response without content', async () => {
      const specWithNoContent = {
        openapi: '3.0.0',
        info: { title: 'Test', version: '1.0.0' },
        servers: [{ url: 'http://localhost' }],
        paths: {
          '/api/delete': {
            delete: {
              operationId: 'deleteItem',
              responses: { '204': { description: 'No Content' } }
            }
          }
        }
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(specWithNoContent)
      });

      const result = await parseOpenApiSpec('http://test.com/spec.json');

      const response = result.endpoints[0].responses[0];
      expect(response.schema).toBeUndefined();
    });

    it('should handle array schemas', async () => {
      const specWithArray = {
        openapi: '3.0.0',
        info: { title: 'Test', version: '1.0.0' },
        servers: [{ url: 'http://localhost' }],
        paths: {
          '/api/items': {
            get: {
              operationId: 'getItems',
              responses: {
                '200': {
                  description: 'OK',
                  content: {
                    'application/json': {
                      schema: {
                        type: 'array',
                        items: { type: 'string' }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(specWithArray)
      });

      const result = await parseOpenApiSpec('http://test.com/spec.json');

      const response = result.endpoints[0].responses[0];
      expect(response.schema?.type).toBe('array');
      expect(response.schema?.items).toEqual({ type: 'string' });
    });

    it('should handle security requirements', async () => {
      const specWithSecurity = {
        openapi: '3.0.0',
        info: { title: 'Test', version: '1.0.0' },
        servers: [{ url: 'http://localhost' }],
        paths: {
          '/api/secure': {
            get: {
              operationId: 'secureEndpoint',
              security: [{ bearerAuth: [] }],
              responses: { '200': { description: 'OK' } }
            }
          }
        }
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(specWithSecurity)
      });

      const result = await parseOpenApiSpec('http://test.com/spec.json');

      expect(result.endpoints[0].security).toContain('bearerAuth');
    });

    it('should handle PUT and PATCH methods', async () => {
      const specWithMethods = {
        openapi: '3.0.0',
        info: { title: 'Test', version: '1.0.0' },
        servers: [{ url: 'http://localhost' }],
        paths: {
          '/api/resource': {
            put: { operationId: 'putResource', responses: { '200': { description: 'OK' } } },
            patch: { operationId: 'patchResource', responses: { '200': { description: 'OK' } } }
          }
        }
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(specWithMethods)
      });

      const result = await parseOpenApiSpec('http://test.com/spec.json');

      expect(result.endpoints.find(e => e.method === 'PUT')).toBeDefined();
      expect(result.endpoints.find(e => e.method === 'PATCH')).toBeDefined();
    });

    it('should handle schema with additionalProperties', async () => {
      const specWithAdditionalProps = {
        openapi: '3.0.0',
        info: { title: 'Test', version: '1.0.0' },
        servers: [{ url: 'http://localhost' }],
        paths: {
          '/api/metadata': {
            get: {
              operationId: 'getMetadata',
              responses: {
                '200': {
                  description: 'OK',
                  content: {
                    'application/json': {
                      schema: {
                        type: 'object',
                        additionalProperties: { type: 'string' }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(specWithAdditionalProps)
      });

      const result = await parseOpenApiSpec('http://test.com/spec.json');

      const schema = result.endpoints[0].responses[0].schema;
      expect(schema?.additionalProperties).toEqual({ type: 'string' });
    });

    it('should handle schema with boolean additionalProperties', async () => {
      const specWithBoolAdditionalProps = {
        openapi: '3.0.0',
        info: { title: 'Test', version: '1.0.0' },
        servers: [{ url: 'http://localhost' }],
        paths: {
          '/api/strict': {
            get: {
              operationId: 'getStrict',
              responses: {
                '200': {
                  description: 'OK',
                  content: {
                    'application/json': {
                      schema: {
                        type: 'object',
                        additionalProperties: false
                      }
                    }
                  }
                }
              }
            }
          }
        }
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(specWithBoolAdditionalProps)
      });

      const result = await parseOpenApiSpec('http://test.com/spec.json');

      const schema = result.endpoints[0].responses[0].schema;
      expect(schema?.additionalProperties).toBe(false);
    });

    it('should handle empty paths', async () => {
      const specWithEmptyPaths = {
        openapi: '3.0.0',
        info: { title: 'Test', version: '1.0.0' },
        servers: [{ url: 'http://localhost' }],
        paths: {}
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(specWithEmptyPaths)
      });

      const result = await parseOpenApiSpec('http://test.com/spec.json');

      expect(result.endpoints).toEqual([]);
    });
  });
});
