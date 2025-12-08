/**
 * HTTP Config Generator
 * Generates HTTP request configuration from OpenAPI endpoints
 */

import type { ParsedEndpoint } from '../openapi-parser.js';

export interface HttpConfig {
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers: Record<string, string>;
  body?: string;
}

/**
 * Build URL with template syntax for path parameters.
 * Replaces {param} with {{input.param}} for workflow template resolution.
 *
 * @param baseUrl - The base URL of the API
 * @param path - The endpoint path with optional path parameters
 * @returns The full URL with template syntax
 */
export function buildUrlWithTemplates(baseUrl: string, path: string): string {
  // Normalize base URL - remove trailing slash if present
  const normalizedBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;

  // Replace {param} with {{input.param}} template syntax
  const templatedPath = path.replace(/\{([^}]+)\}/g, '{{input.$1}}');

  return `${normalizedBase}${templatedPath}`;
}

/**
 * Build default headers for the HTTP request.
 * Includes Accept header by default, Content-Type for request bodies,
 * and templates for header parameters.
 *
 * @param endpoint - The parsed OpenAPI endpoint
 * @returns Record of header names to values/templates
 */
export function buildHeaders(endpoint: ParsedEndpoint): Record<string, string> {
  const headers: Record<string, string> = {
    'Accept': 'application/json'
  };

  // Add Content-Type if there's a request body
  if (endpoint.requestBody) {
    headers['Content-Type'] = endpoint.requestBody.contentType || 'application/json';
  }

  // Add header parameters as templates
  const headerParams = endpoint.parameters.filter(p => p.in === 'header');
  for (const param of headerParams) {
    headers[param.name] = `{{input.${param.name}}}`;
  }

  return headers;
}

/**
 * Generate complete HTTP configuration for an endpoint.
 *
 * @param endpoint - The parsed OpenAPI endpoint
 * @param baseUrl - The base URL of the API
 * @returns Complete HTTP configuration object
 */
export function generateHttpConfig(endpoint: ParsedEndpoint, baseUrl: string): HttpConfig {
  const config: HttpConfig = {
    url: buildUrlWithTemplates(baseUrl, endpoint.path),
    method: endpoint.method.toUpperCase() as HttpConfig['method'],
    headers: buildHeaders(endpoint)
  };

  // Add body template if there's a request body
  if (endpoint.requestBody) {
    config.body = '{{input.body | toJson}}';
  }

  return config;
}
