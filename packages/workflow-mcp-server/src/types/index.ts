/**
 * Workflow Task resource from the Kubernetes CRD
 * Note: Gateway API returns inputSchema/outputSchema at top level
 */
export interface WorkflowTask {
  name: string;
  type?: string;
  namespace?: string;
  description?: string | null;
  category?: string;
  inputSchema?: JsonSchema;
  outputSchema?: JsonSchema;
  // Legacy spec format (for backward compatibility)
  spec?: {
    http?: {
      url: string;
      method: string;
    };
    input?: JsonSchema;
    output?: JsonSchema;
  };
}

/**
 * JSON Schema definition
 */
export interface JsonSchema {
  type: string;
  properties?: Record<string, JsonSchema>;
  required?: string[];
  items?: JsonSchema;
  description?: string;
}

/**
 * Task summary for list_tasks tool
 */
export interface TaskSummary {
  name: string;
  description: string;
  category: string;
  inputSchema: JsonSchema;
  outputSchema: JsonSchema;
}

/**
 * Workflow validation result
 */
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  message: string;
  location?: string;
  suggestion?: string;
}

export interface ValidationWarning {
  message: string;
  suggestion?: string;
}

/**
 * Generated workflow result
 */
export interface GeneratedWorkflow {
  yaml: string;
  explanation: string;
  taskCount: number;
  pattern: WorkflowPattern;
}

export type WorkflowPattern = 'sequential' | 'parallel' | 'diamond' | 'complex';

/**
 * Tool parameters
 */
export interface ListTasksParams {
  category?: string;
  search?: string;
}

export interface GenerateWorkflowParams {
  intent: string;
  constraints?: {
    maxTasks?: number;
    allowedTasks?: string[];
    timeout?: string;
  };
  /** Use LLM for generation (default: true if API key configured) */
  useLLM?: boolean;
}

export interface ValidateWorkflowParams {
  yaml: string;
  suggestFixes?: boolean;
}

/**
 * Dry run workflow parameters
 */
export interface DryRunWorkflowParams {
  yaml: string;
  sampleInput: Record<string, unknown>;
}

/**
 * Dry run workflow result
 */
export interface DryRunResult {
  valid: boolean;
  executionPlan: ExecutionPlan;
  errors: ValidationError[];
}

export interface ExecutionPlan {
  tasks: ExecutionPlanTask[];
  parallelGroups: string[][];
}

export interface ExecutionPlanTask {
  id: string;
  taskRef: string;
  resolvedInput: Record<string, unknown>;
  dependencies: string[];
  estimatedDuration?: string;
}

/**
 * Execute workflow parameters
 */
export interface ExecuteWorkflowParams {
  workflowName: string;
  input: Record<string, unknown>;
}

/**
 * Execute workflow result
 */
export interface ExecuteWorkflowResult {
  executionId: string;
  status: 'completed' | 'failed';
  output: Record<string, unknown>;
  taskResults: TaskResult[];
  totalDuration: number;
}

export interface TaskResult {
  taskId: string;
  status: string;
  duration: number;
  output?: Record<string, unknown>;
  error?: string;
}

/**
 * Refinement loop types
 */
export type TerminationReason =
  | 'success'
  | 'max_iterations'
  | 'oscillation_detected'
  | 'no_progress'
  | 'unfixable_errors';

export interface RefinementStep {
  iteration: number;
  errors: string[];
  fixes: string[];
}

export interface RefinementResult {
  yaml: string;
  history: RefinementStep[];
  valid: boolean;
  terminationReason: TerminationReason;
}

export interface GeneratedWorkflowWithRefinement extends GeneratedWorkflow {
  refinementHistory?: RefinementStep[];
  finalValidation?: ValidationResult;
  terminationReason?: TerminationReason;
}
