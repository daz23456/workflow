/**
 * OpenAPI 3.x Parser
 * Parses OpenAPI specs and extracts endpoint information for CRD generation
 */

import type { OpenAPIV3 } from 'openapi-types';
import type { JsonSchema } from './types.js';

export interface ParsedEndpoint {
  operationId: string;
  path: string;
  method: string;
  summary?: string;
  description?: string;
  tags: string[];
  parameters: ParsedParameter[];
  requestBody?: ParsedRequestBody;
  responses: ParsedResponse[];
  security: string[];
}

export interface ParsedParameter {
  name: string;
  in: 'path' | 'query' | 'header' | 'cookie';
  required: boolean;
  schema: JsonSchema;
  description?: string;
}

export interface ParsedRequestBody {
  required: boolean;
  contentType: string;
  schema: JsonSchema;
  description?: string;
}

export interface ParsedResponse {
  statusCode: string;
  contentType?: string;
  schema?: JsonSchema;
  description?: string;
}

export interface ParsedSpec {
  title: string;
  version: string;
  baseUrl: string;
  endpoints: ParsedEndpoint[];
  schemas: Record<string, JsonSchema>;
}

/**
 * Fetch and parse an OpenAPI spec from a URL or file
 */
export async function parseOpenApiSpec(source: string): Promise<ParsedSpec> {
  let spec: OpenAPIV3.Document;

  if (source.startsWith('http://') || source.startsWith('https://')) {
    const response = await fetch(source);
    if (!response.ok) {
      throw new Error(`Failed to fetch OpenAPI spec: ${response.status} ${response.statusText}`);
    }
    spec = await response.json() as OpenAPIV3.Document;
  } else {
    const fs = await import('fs/promises');
    const content = await fs.readFile(source, 'utf-8');
    if (source.endsWith('.yaml') || source.endsWith('.yml')) {
      const yaml = await import('yaml');
      spec = yaml.parse(content) as OpenAPIV3.Document;
    } else {
      spec = JSON.parse(content) as OpenAPIV3.Document;
    }
  }

  return parseDocument(spec);
}

/**
 * Parse an OpenAPI document into our internal format
 */
function parseDocument(spec: OpenAPIV3.Document): ParsedSpec {
  const baseUrl = getBaseUrl(spec);
  const schemas = extractSchemas(spec);
  const endpoints = extractEndpoints(spec, schemas);

  return {
    title: spec.info.title,
    version: spec.info.version,
    baseUrl,
    endpoints,
    schemas
  };
}

/**
 * Extract base URL from servers or default
 */
function getBaseUrl(spec: OpenAPIV3.Document): string {
  if (spec.servers && spec.servers.length > 0) {
    return spec.servers[0].url;
  }
  return 'http://localhost';
}

/**
 * Extract all schemas from components
 */
function extractSchemas(spec: OpenAPIV3.Document): Record<string, JsonSchema> {
  const schemas: Record<string, JsonSchema> = {};

  if (spec.components?.schemas) {
    for (const [name, schema] of Object.entries(spec.components.schemas)) {
      schemas[name] = convertSchema(schema as OpenAPIV3.SchemaObject);
    }
  }

  return schemas;
}

/**
 * Extract all endpoints from paths
 */
function extractEndpoints(spec: OpenAPIV3.Document, schemas: Record<string, JsonSchema>): ParsedEndpoint[] {
  const endpoints: ParsedEndpoint[] = [];
  const methods = ['get', 'post', 'put', 'delete', 'patch'] as const;

  if (!spec.paths) return endpoints;

  for (const [path, pathItem] of Object.entries(spec.paths)) {
    if (!pathItem) continue;

    for (const method of methods) {
      const operation = pathItem[method] as OpenAPIV3.OperationObject | undefined;
      if (!operation) continue;

      const endpoint = parseOperation(path, method.toUpperCase(), operation, schemas);
      endpoints.push(endpoint);
    }
  }

  return endpoints;
}

/**
 * Parse a single operation into our format
 */
function parseOperation(
  path: string,
  method: string,
  operation: OpenAPIV3.OperationObject,
  _schemas: Record<string, JsonSchema>
): ParsedEndpoint {
  const operationId = operation.operationId || generateOperationId(path, method);

  return {
    operationId,
    path,
    method,
    summary: operation.summary,
    description: operation.description,
    tags: operation.tags || [],
    parameters: parseParameters(operation.parameters as OpenAPIV3.ParameterObject[] || []),
    requestBody: parseRequestBody(operation.requestBody as OpenAPIV3.RequestBodyObject | undefined),
    responses: parseResponses(operation.responses as OpenAPIV3.ResponsesObject),
    security: extractSecuritySchemes(operation.security)
  };
}

/**
 * Generate operation ID from path and method
 */
function generateOperationId(path: string, method: string): string {
  // Convert /api/users/{id}/orders to api-users-id-orders
  const sanitized = path
    .replace(/^\//, '')
    .replace(/\{([^}]+)\}/g, '$1')
    .replace(/\//g, '-')
    .replace(/[^a-zA-Z0-9-]/g, '');

  return `${method.toLowerCase()}-${sanitized}`;
}

/**
 * Parse parameters array
 */
function parseParameters(parameters: OpenAPIV3.ParameterObject[]): ParsedParameter[] {
  return parameters.map(param => ({
    name: param.name,
    in: param.in as ParsedParameter['in'],
    required: param.required || false,
    schema: convertSchema(param.schema as OpenAPIV3.SchemaObject || { type: 'string' }),
    description: param.description
  }));
}

/**
 * Parse request body
 */
function parseRequestBody(requestBody: OpenAPIV3.RequestBodyObject | undefined): ParsedRequestBody | undefined {
  if (!requestBody?.content) return undefined;

  // Prefer application/json
  const contentType = Object.keys(requestBody.content).find(ct => ct.includes('json'))
    || Object.keys(requestBody.content)[0];

  const mediaType = requestBody.content[contentType];
  if (!mediaType?.schema) return undefined;

  return {
    required: requestBody.required || false,
    contentType,
    schema: convertSchema(mediaType.schema as OpenAPIV3.SchemaObject),
    description: requestBody.description
  };
}

/**
 * Parse responses
 */
function parseResponses(responses: OpenAPIV3.ResponsesObject): ParsedResponse[] {
  const parsed: ParsedResponse[] = [];

  for (const [statusCode, response] of Object.entries(responses)) {
    const resp = response as OpenAPIV3.ResponseObject;

    let contentType: string | undefined;
    let schema: JsonSchema | undefined;

    if (resp.content) {
      contentType = Object.keys(resp.content).find(ct => ct.includes('json'))
        || Object.keys(resp.content)[0];

      if (contentType && resp.content[contentType]?.schema) {
        schema = convertSchema(resp.content[contentType].schema as OpenAPIV3.SchemaObject);
      }
    }

    parsed.push({
      statusCode,
      contentType,
      schema,
      description: resp.description
    });
  }

  return parsed;
}

/**
 * Extract security scheme names
 */
function extractSecuritySchemes(security: OpenAPIV3.SecurityRequirementObject[] | undefined): string[] {
  if (!security) return [];
  return security.flatMap(req => Object.keys(req));
}

/**
 * Convert OpenAPI schema to our JsonSchema format
 */
function convertSchema(schema: OpenAPIV3.SchemaObject): JsonSchema {
  const result: JsonSchema = {};

  if (schema.type) result.type = schema.type as string;
  if (schema.description) result.description = schema.description;
  if (schema.format) result.format = schema.format;
  if (schema.enum) result.enum = schema.enum;
  if (schema.minimum !== undefined) result.minimum = schema.minimum;
  if (schema.maximum !== undefined) result.maximum = schema.maximum;
  if (schema.minLength !== undefined) result.minLength = schema.minLength;
  if (schema.maxLength !== undefined) result.maxLength = schema.maxLength;
  if (schema.pattern) result.pattern = schema.pattern;
  if (schema.required) result.required = schema.required;

  if (schema.properties) {
    result.properties = {};
    for (const [name, prop] of Object.entries(schema.properties)) {
      result.properties[name] = convertSchema(prop as OpenAPIV3.SchemaObject);
    }
  }

  // Handle array items (type guard for ArraySchemaObject)
  if ('items' in schema && schema.items) {
    result.items = convertSchema(schema.items as OpenAPIV3.SchemaObject);
  }

  if (schema.additionalProperties !== undefined) {
    if (typeof schema.additionalProperties === 'boolean') {
      result.additionalProperties = schema.additionalProperties;
    } else {
      result.additionalProperties = convertSchema(schema.additionalProperties as OpenAPIV3.SchemaObject);
    }
  }

  return result;
}
