/**
 * WorkflowTask CRD types matching Kubernetes CRD schema
 */

export interface WorkflowTaskResource {
  apiVersion: string;
  kind: 'WorkflowTask';
  metadata: ResourceMetadata;
  spec: WorkflowTaskSpec;
}

export interface ResourceMetadata {
  name: string;
  namespace: string;
  labels?: Record<string, string>;
  annotations?: Record<string, string>;
}

export interface WorkflowTaskSpec {
  type: 'http' | 'transform';
  description?: string;
  request?: HttpRequestDefinition;
  inputSchema?: JsonSchema;
  outputSchema?: JsonSchema;
  timeout?: string;
  retry?: RetryPolicy;
}

export interface HttpRequestDefinition {
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: string;
}

export interface RetryPolicy {
  maxAttempts: number;
  backoffMs?: number;
}

export interface JsonSchema {
  type?: string;
  properties?: Record<string, JsonSchema>;
  items?: JsonSchema;
  required?: string[];
  description?: string;
  format?: string;
  enum?: unknown[];
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  additionalProperties?: boolean | JsonSchema;
  $ref?: string;
}

/**
 * OpenAPI import options
 */
export interface ImportOptions {
  source: string;           // URL or file path to OpenAPI spec
  baseUrl?: string;         // Override base URL for generated tasks
  output?: string;          // Output directory for YAML files
  namespace?: string;       // Kubernetes namespace (default: 'default')
  prefix?: string;          // Task name prefix
  tags?: string[];          // Only import endpoints with these tags
  excludeTags?: string[];   // Exclude endpoints with these tags
  singleFile?: boolean;     // Output all tasks to single file
  dryRun?: boolean;         // Print output without writing files
}

/**
 * Generated task result
 */
export interface GeneratedTask {
  name: string;
  resource: WorkflowTaskResource;
  yaml: string;
  operationId?: string;
  path: string;
  method: string;
}

/**
 * Import result
 */
export interface ImportResult {
  success: boolean;
  tasks: GeneratedTask[];
  errors: string[];
  warnings: string[];
  source: string;
  baseUrl: string;
}
