/**
 * Permission Label Generator
 * Generates Kubernetes labels for access control and security metadata
 */

import type { ParsedEndpoint, SecurityScheme } from '../openapi-parser.js';

/**
 * Generate permission-related labels from endpoint metadata.
 * Creates labels for tags, operation, and resource.
 *
 * @param endpoint - The parsed OpenAPI endpoint
 * @returns Record of label names to values
 */
export function generatePermissionLabels(endpoint: ParsedEndpoint): Record<string, string> {
  const labels: Record<string, string> = {};

  // Add tags label if present
  if (endpoint.tags.length > 0) {
    labels['workflow.io/tags'] = endpoint.tags.join(',');
  }

  // Extract operation (HTTP method)
  labels['workflow.io/operation'] = endpoint.method.toLowerCase();

  // Extract resource from path (first path segment without params)
  const resource = extractResource(endpoint.path);
  if (resource) {
    labels['workflow.io/resource'] = resource;
  }

  return labels;
}

/**
 * Extract resource name from path.
 * E.g., "/users/{id}/posts" -> "users"
 */
function extractResource(path: string): string | undefined {
  const segments = path.split('/').filter(s => s && !s.startsWith('{'));
  return segments[0];
}

/**
 * Generate security-related labels from security schemes.
 * Creates labels for auth type, headers, scopes, etc.
 *
 * @param schemes - Array of security schemes
 * @returns Record of label names to values
 */
export function generateSecurityLabels(schemes: SecurityScheme[]): Record<string, string> {
  const labels: Record<string, string> = {};

  if (schemes.length === 0) {
    return labels;
  }

  // Use the first scheme (most common case is single auth)
  const scheme = schemes[0];
  labels['workflow.io/auth-type'] = getAuthType(scheme);

  if (scheme.type === 'apiKey' && scheme.name) {
    labels['workflow.io/auth-header'] = scheme.name;
  }

  if (scheme.type === 'http' && scheme.scheme === 'bearer') {
    if (scheme.bearerFormat) {
      labels['workflow.io/auth-format'] = scheme.bearerFormat;
    }
  }

  if (scheme.type === 'oauth2' && scheme.flows) {
    const scopes = extractOAuth2Scopes(scheme);
    if (scopes.length > 0) {
      labels['workflow.io/auth-scopes'] = scopes.join(',');
    }
  }

  return labels;
}

/**
 * Get simplified auth type name
 */
function getAuthType(scheme: SecurityScheme): string {
  if (scheme.type === 'http' && scheme.scheme === 'bearer') {
    return 'bearer';
  }
  return scheme.type;
}

/**
 * Extract all scopes from OAuth2 flows
 */
function extractOAuth2Scopes(scheme: SecurityScheme): string[] {
  const scopes = new Set<string>();

  if (scheme.flows?.authorizationCode?.scopes) {
    Object.keys(scheme.flows.authorizationCode.scopes).forEach(s => scopes.add(s));
  }
  if (scheme.flows?.clientCredentials?.scopes) {
    Object.keys(scheme.flows.clientCredentials.scopes).forEach(s => scopes.add(s));
  }
  if (scheme.flows?.implicit?.scopes) {
    Object.keys(scheme.flows.implicit.scopes).forEach(s => scopes.add(s));
  }
  if (scheme.flows?.password?.scopes) {
    Object.keys(scheme.flows.password.scopes).forEach(s => scopes.add(s));
  }

  return Array.from(scopes);
}
