import { ResourceMetadata } from './workflowTask';

/**
 * Kubernetes Custom Resource for Workflow
 */
export interface WorkflowResource {
  apiVersion: string;
  kind: string;
  metadata: ResourceMetadata;
  spec: WorkflowSpec;
  status?: WorkflowStatus;
}

/**
 * Workflow specification
 */
export interface WorkflowSpec {
  input: Record<string, WorkflowInputParameter>;
  tasks: WorkflowTaskStep[];
  output?: Record<string, string>;
}

/**
 * Input parameter definition for workflow
 */
export interface WorkflowInputParameter {
  type: string;
  required: boolean;
  description?: string;
  default?: unknown;
}

/**
 * Task step within workflow (references a WorkflowTask)
 */
export interface WorkflowTaskStep {
  id: string;
  taskRef: string;
  input: Record<string, string>;
  dependsOn?: string[];
  condition?: string;
}

/**
 * Workflow status
 */
export interface WorkflowStatus {
  phase: string;
  executionCount: number;
  lastExecuted: string;
  validationErrors: string[];
}
