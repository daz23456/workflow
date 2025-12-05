/* eslint-disable */
/**
 * Auto-generated from JSON Schema - DO NOT EDIT MANUALLY
 * Generated at: 2025-11-26T10:27:15Z
 * Source: schemas/workflow.schema.json
 */

/**
 * Kubernetes Custom Resource for Workflow
 */
export interface Workflow {
  /**
   * API version
   */
  apiVersion: "workflow.example.com/v1";
  /**
   * Resource kind
   */
  kind: "Workflow";
  metadata: ResourceMetadata;
  spec: WorkflowSpec;
  status?: WorkflowStatus;
}
/**
 * Kubernetes resource metadata
 */
export interface ResourceMetadata {
  /**
   * Resource name
   */
  name: string;
  /**
   * Resource namespace
   */
  namespace: string;
}
/**
 * Workflow specification
 */
export interface WorkflowSpec {
  /**
   * Input parameters for the workflow
   */
  input: {
    [k: string]: WorkflowInputParameter | undefined;
  };
  /**
   * Tasks to execute in the workflow
   *
   * @minItems 1
   */
  tasks: [WorkflowTaskStep, ...WorkflowTaskStep[]];
  /**
   * Output mappings from task results
   */
  output?: {
    [k: string]: string | undefined;
  };
}
/**
 * Input parameter definition for workflow
 */
export interface WorkflowInputParameter {
  /**
   * Parameter type
   */
  type: "string" | "number" | "integer" | "boolean" | "object" | "array";
  /**
   * Whether the parameter is required
   */
  required: boolean;
  /**
   * Parameter description
   */
  description?: string;
  /**
   * Default value for the parameter
   */
  default?: {
    [k: string]: any | undefined;
  };
}
/**
 * Task step within workflow (references a WorkflowTask)
 */
export interface WorkflowTaskStep {
  /**
   * Unique task step identifier
   */
  id: string;
  /**
   * Reference to WorkflowTask name
   */
  taskRef: string;
  /**
   * Input mappings (supports template expressions)
   */
  input: {
    [k: string]: string | undefined;
  };
  /**
   * Task IDs this task depends on
   */
  dependsOn?: string[];
  /**
   * Conditional execution expression
   */
  condition?: string;
  /**
   * Task timeout (e.g., 30s, 5m, 2h)
   */
  timeout?: string;
}
/**
 * Workflow status
 */
export interface WorkflowStatus {
  /**
   * Workflow phase
   */
  phase?: "Pending" | "Running" | "Succeeded" | "Failed";
  /**
   * Number of executions
   */
  executionCount?: number;
  /**
   * Last execution timestamp
   */
  lastExecuted?: string;
  /**
   * Validation error messages
   */
  validationErrors?: string[];
}
