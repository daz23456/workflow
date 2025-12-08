/**
 * WorkflowTask CRD Generator
 * Converts parsed OpenAPI endpoints to Kubernetes WorkflowTask CRDs
 *
 * Refactored in Stage 16.2 to use modular generators
 */

import type { ParsedEndpoint, ParsedSpec } from './openapi-parser.js';
import type { WorkflowTaskResource, GeneratedTask } from './types.js';

// Import from modular generators
import {
  generateTaskName,
  buildInputSchema,
  buildOutputSchema,
  generateHttpConfig,
  serializeTaskToYaml,
  writeTasksToFiles,
  generatePermissionLabels
} from './generators/index.js';

export interface GeneratorOptions {
  baseUrl: string;
  namespace: string;
  prefix?: string;
  tags?: string[];
  excludeTags?: string[];
}

/**
 * Generate WorkflowTask CRDs from a parsed OpenAPI spec
 */
export function generateTasksFromSpec(
  spec: ParsedSpec,
  options: GeneratorOptions
): GeneratedTask[] {
  const tasks: GeneratedTask[] = [];

  for (const endpoint of spec.endpoints) {
    // Filter by tags if specified
    if (options.tags && options.tags.length > 0) {
      if (!endpoint.tags.some(tag => options.tags!.includes(tag))) {
        continue;
      }
    }

    // Exclude by tags if specified
    if (options.excludeTags && options.excludeTags.length > 0) {
      if (endpoint.tags.some(tag => options.excludeTags!.includes(tag))) {
        continue;
      }
    }

    const task = generateTask(endpoint, options);
    tasks.push(task);
  }

  return tasks;
}

/**
 * Generate a single WorkflowTask CRD from an endpoint
 */
function generateTask(
  endpoint: ParsedEndpoint,
  options: GeneratorOptions
): GeneratedTask {
  const taskName = generateTaskName(endpoint, options.prefix);
  const httpConfig = generateHttpConfig(endpoint, options.baseUrl);
  const permissionLabels = generatePermissionLabels(endpoint);

  const resource: WorkflowTaskResource = {
    apiVersion: 'workflow.example.com/v1',
    kind: 'WorkflowTask',
    metadata: {
      name: taskName,
      namespace: options.namespace,
      labels: {
        'workflow.io/generated-from': 'openapi',
        'workflow.io/operation-id': endpoint.operationId,
        ...permissionLabels
      },
      annotations: {
        'workflow.io/source-path': endpoint.path,
        'workflow.io/source-method': endpoint.method
      }
    },
    spec: {
      type: 'http',
      description: endpoint.summary || endpoint.description || `${endpoint.method} ${endpoint.path}`,
      request: {
        url: httpConfig.url,
        method: httpConfig.method,
        headers: httpConfig.headers,
        body: httpConfig.body
      },
      inputSchema: buildInputSchema(endpoint),
      outputSchema: buildOutputSchema(endpoint),
      timeout: '30s',
      retry: {
        maxAttempts: 3,
        backoffMs: 1000
      }
    }
  };

  const yaml = serializeTaskToYaml(resource);

  return {
    name: taskName,
    resource,
    yaml,
    operationId: endpoint.operationId,
    path: endpoint.path,
    method: endpoint.method
  };
}

// Re-export writeTasksToFiles for external use
export { writeTasksToFiles };
