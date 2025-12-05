/**
 * OpenAPI 3.x Parser
 * Parses OpenAPI specs and extracts endpoint information for CRD generation
 */
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
export declare function parseOpenApiSpec(source: string): Promise<ParsedSpec>;
//# sourceMappingURL=openapi-parser.d.ts.map