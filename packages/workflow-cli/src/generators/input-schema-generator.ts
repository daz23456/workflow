/**
 * Input Schema Generator
 * Builds input schemas from OpenAPI endpoint parameters and request bodies
 */

import type { ParsedEndpoint } from '../openapi-parser.js';
import type { JsonSchema } from '../types.js';

/**
 * Extract path parameter names from a URL pattern.
 * @param path - URL pattern like "/users/{userId}/posts/{postId}"
 * @returns Array of parameter names
 */
export function extractPathParams(path: string): string[] {
  const matches = path.match(/\{([^}]+)\}/g);
  if (!matches) {
    return [];
  }
  return matches.map(m => m.slice(1, -1));
}

/**
 * Build input schema from endpoint parameters and request body.
 * Combines path, query, header parameters and request body into a single schema.
 *
 * @param endpoint - The parsed OpenAPI endpoint
 * @returns JSON Schema for the task input
 */
export function buildInputSchema(endpoint: ParsedEndpoint): JsonSchema {
  const properties: Record<string, JsonSchema> = {};
  const required: string[] = [];

  // Add path parameters (always required)
  for (const param of endpoint.parameters.filter(p => p.in === 'path')) {
    properties[param.name] = {
      ...param.schema,
      description: param.description || `Path parameter: ${param.name}`
    };
    required.push(param.name);
  }

  // Add query parameters
  for (const param of endpoint.parameters.filter(p => p.in === 'query')) {
    properties[param.name] = {
      ...param.schema,
      description: param.description || `Query parameter: ${param.name}`
    };
    if (param.required) {
      required.push(param.name);
    }
  }

  // Add header parameters
  for (const param of endpoint.parameters.filter(p => p.in === 'header')) {
    properties[param.name] = {
      ...param.schema,
      description: param.description || `Header: ${param.name}`
    };
    if (param.required) {
      required.push(param.name);
    }
  }

  // Add request body
  if (endpoint.requestBody) {
    properties['body'] = {
      ...endpoint.requestBody.schema,
      description: endpoint.requestBody.description || 'Request body'
    };
    if (endpoint.requestBody.required) {
      required.push('body');
    }
  }

  return {
    type: 'object',
    properties,
    required: required.length > 0 ? required : undefined
  };
}
