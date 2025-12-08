/**
 * Output Schema Generator
 * Builds output schemas from OpenAPI endpoint responses
 */

import type { ParsedEndpoint, ParsedResponse } from '../openapi-parser.js';
import type { JsonSchema } from '../types.js';

/** Success status codes in priority order */
const SUCCESS_CODES = ['200', '201', '202', '204', 'default'];

/**
 * Find the most appropriate success response from a list of responses.
 * Prioritizes 200, then 201, then other 2xx, then default.
 *
 * @param responses - Array of parsed responses
 * @returns The best success response, or undefined if none found
 */
export function findSuccessResponse(responses: ParsedResponse[]): ParsedResponse | undefined {
  for (const code of SUCCESS_CODES) {
    const response = responses.find(r => r.statusCode === code);
    if (response) {
      return response;
    }
  }
  return undefined;
}

/**
 * Build output schema from endpoint responses.
 * Uses the success response schema, or a generic schema if not defined.
 *
 * @param endpoint - The parsed OpenAPI endpoint
 * @returns JSON Schema for the task output
 */
export function buildOutputSchema(endpoint: ParsedEndpoint): JsonSchema {
  const successResponse = findSuccessResponse(endpoint.responses);

  if (successResponse?.schema) {
    return successResponse.schema;
  }

  // Default empty response schema
  return {
    type: 'object',
    description: 'Response from the endpoint'
  };
}
