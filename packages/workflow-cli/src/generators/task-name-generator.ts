/**
 * Task Name Generator
 * Generates Kubernetes-compliant task names from OpenAPI endpoints
 */

import type { ParsedEndpoint } from '../openapi-parser.js';

/** Maximum length for K8s resource names */
const K8S_NAME_MAX_LENGTH = 63;

/**
 * Sanitize a string for use as a Kubernetes resource name.
 * - Converts to lowercase
 * - Replaces non-alphanumeric characters with hyphens
 * - Removes consecutive hyphens
 * - Removes leading/trailing hyphens
 * - Truncates to 63 characters (K8s limit)
 */
export function sanitizeForK8s(name: string): string {
  let sanitized = name
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  // Truncate to K8s limit
  if (sanitized.length > K8S_NAME_MAX_LENGTH) {
    sanitized = sanitized.substring(0, K8S_NAME_MAX_LENGTH);
    // Remove trailing hyphen if truncation created one
    sanitized = sanitized.replace(/-$/, '');
  }

  return sanitized;
}

/**
 * Generate a task name from an OpenAPI endpoint.
 * Uses operationId, sanitizes for K8s, and applies optional prefix.
 *
 * @param endpoint - The parsed OpenAPI endpoint
 * @param prefix - Optional prefix to add to the task name
 * @returns A valid Kubernetes resource name
 */
export function generateTaskName(endpoint: ParsedEndpoint, prefix?: string): string {
  // Sanitize the operationId
  let name = sanitizeForK8s(endpoint.operationId);

  // Ensure it starts with a letter (K8s requirement)
  if (!/^[a-z]/.test(name)) {
    name = 'task-' + name;
  }

  // Add prefix if specified
  if (prefix) {
    name = `${prefix}-${name}`;
  }

  // Re-sanitize in case prefix added issues, and ensure length limit
  if (name.length > K8S_NAME_MAX_LENGTH) {
    name = name.substring(0, K8S_NAME_MAX_LENGTH).replace(/-$/, '');
  }

  return name;
}
