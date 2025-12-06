/**
 * Workflow and Task Loaders
 * Load workflow and task definitions from YAML files
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as yaml from 'yaml';

/**
 * Metadata for workflow/task resources
 */
export interface ResourceMetadata {
  name: string;
  namespace: string;
}

/**
 * JSON Schema definition
 */
export interface JsonSchemaDefinition {
  type?: string;
  properties?: Record<string, JsonSchemaDefinition>;
  required?: string[];
  items?: JsonSchemaDefinition;
}

/**
 * Retry configuration for a task
 */
export interface RetryConfig {
  maxAttempts: number;
  backoffMs?: number;
}

/**
 * Task reference in a workflow
 */
export interface WorkflowTaskRef {
  id: string;
  taskRef: string;
  input?: Record<string, unknown>;
  dependsOn?: string[];
  timeout?: string;
  retry?: RetryConfig;
}

/**
 * Workflow specification
 */
export interface WorkflowSpec {
  tasks: WorkflowTaskRef[];
  input?: JsonSchemaDefinition;
  output?: Record<string, string>;
  timeout?: string;
  description?: string;
}

/**
 * Alias for WorkflowTaskRef for convenience
 */
export type WorkflowTask = WorkflowTaskRef;

/**
 * Workflow definition (CRD structure)
 */
export interface WorkflowDefinition {
  apiVersion: string;
  kind: 'Workflow';
  metadata: ResourceMetadata;
  spec: WorkflowSpec;
}

/**
 * HTTP request configuration for a task
 */
export interface HttpRequest {
  url: string;
  method: string;
  headers?: Record<string, string>;
  body?: unknown;
}

/**
 * Task specification
 */
export interface TaskSpec {
  type: string;
  request?: HttpRequest;
  inputSchema?: JsonSchemaDefinition;
  outputSchema?: JsonSchemaDefinition;
}

/**
 * Task definition (CRD structure)
 */
export interface TaskDefinition {
  apiVersion: string;
  kind: 'WorkflowTask';
  metadata: ResourceMetadata;
  spec: TaskSpec;
}

/**
 * Options for loadTasksFromDirectory
 */
export interface LoadTasksOptions {
  namespace?: string;
}

/**
 * Load a workflow definition from a YAML file
 * @param filePath Path to the workflow YAML file
 * @returns Parsed workflow definition
 * @throws Error if file doesn't exist, YAML is invalid, or resource is not a Workflow
 */
export async function loadWorkflow(filePath: string): Promise<WorkflowDefinition> {
  const content = await fs.readFile(filePath, 'utf-8');

  let parsed: unknown;
  try {
    parsed = yaml.parse(content);
  } catch (error) {
    throw new Error(`Invalid YAML in ${filePath}: ${error}`);
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new Error(`Invalid workflow definition in ${filePath}`);
  }

  const resource = parsed as Record<string, unknown>;

  if (resource.kind !== 'Workflow') {
    throw new Error(`Expected kind: Workflow, but got: ${resource.kind}`);
  }

  return resource as unknown as WorkflowDefinition;
}

/**
 * Load task definitions from a YAML file
 * Supports multi-document YAML (separated by ---)
 * @param filePath Path to the task YAML file
 * @returns Array of parsed task definitions
 * @throws Error if file doesn't exist or YAML is invalid
 */
export async function loadTasks(filePath: string): Promise<TaskDefinition[]> {
  const content = await fs.readFile(filePath, 'utf-8');

  const tasks: TaskDefinition[] = [];

  // Parse multi-document YAML
  const documents = yaml.parseAllDocuments(content);

  for (const doc of documents) {
    if (doc.errors && doc.errors.length > 0) {
      throw new Error(`Invalid YAML in ${filePath}: ${doc.errors[0].message}`);
    }

    const parsed = doc.toJSON();
    if (parsed && typeof parsed === 'object' && parsed.kind === 'WorkflowTask') {
      tasks.push(parsed as TaskDefinition);
    }
  }

  return tasks;
}

/**
 * Load all task definitions from a directory
 * @param dirPath Path to the directory containing task YAML files
 * @param options Options for filtering tasks
 * @returns Array of all task definitions found
 * @throws Error if directory doesn't exist
 */
export async function loadTasksFromDirectory(
  dirPath: string,
  options: LoadTasksOptions = {}
): Promise<TaskDefinition[]> {
  const entries = await fs.readdir(dirPath, { withFileTypes: true });

  const tasks: TaskDefinition[] = [];

  for (const entry of entries) {
    // Skip directories and non-YAML files
    if (!entry.isFile()) continue;

    const ext = path.extname(entry.name).toLowerCase();
    if (ext !== '.yaml' && ext !== '.yml') continue;

    const filePath = path.join(dirPath, entry.name);
    const fileTasks = await loadTasks(filePath);

    // Filter by namespace if specified
    if (options.namespace) {
      tasks.push(...fileTasks.filter(t => t.metadata.namespace === options.namespace));
    } else {
      tasks.push(...fileTasks);
    }
  }

  return tasks;
}
