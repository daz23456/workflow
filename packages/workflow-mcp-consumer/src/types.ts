/**
 * Types for the workflow MCP consumer package
 * Stage 15: MCP Server for External Workflow Consumption
 */

/**
 * Workflow metadata for discovery
 */
export interface WorkflowSummary {
  name: string;
  description: string;
  categories?: string[];
  tags?: string[];
  inputSummary: string;
  taskCount: number;
  stats?: WorkflowStats;
}

/**
 * Workflow execution statistics
 */
export interface WorkflowStats {
  executions: number;
  avgDurationMs: number;
  successRate: number;
}

/**
 * List workflows result
 */
export interface ListWorkflowsResult {
  workflows: WorkflowSummary[];
  total: number;
  filtered: number;
}

/**
 * Input for list_workflows tool
 */
export interface ListWorkflowsInput {
  category?: string;
  categories?: string[];
  tags?: string[];
  anyTags?: string[];
  excludeTags?: string[];
  includeStats?: boolean;
}

/**
 * Search match result
 */
export interface SearchMatch {
  workflow: string;
  confidence: number;
  matchReason: string;
  requiredInputs: string[];
}

/**
 * Best match for auto-execute mode
 */
export interface BestMatch {
  workflow: string;
  confidence: number;
  canAutoExecute: boolean;
  extractedInputs: Record<string, unknown>;
  missingInputs: string[];
}

/**
 * Search workflows result
 */
export interface SearchWorkflowsResult {
  matches: SearchMatch[];
  bestMatch?: BestMatch;
}

/**
 * Input for search_workflows tool
 */
export interface SearchWorkflowsInput {
  query: string;
  autoExecute?: boolean;
  context?: Record<string, unknown>;
}

/**
 * Workflow input parameter definition
 */
export interface WorkflowInputParameter {
  type: string;
  required: boolean;
  description?: string;
  default?: unknown;
}

/**
 * Workflow example for documentation
 */
export interface WorkflowExample {
  name: string;
  description?: string;
  input: Record<string, unknown>;
  expectedOutput?: Record<string, unknown>;
}

/**
 * Task summary in workflow details
 */
export interface TaskSummary {
  id: string;
  description?: string;
  dependencies: string[];
}

/**
 * Full workflow details
 */
export interface WorkflowDetails {
  name: string;
  description: string;
  inputSchema: Record<string, WorkflowInputParameter>;
  outputSchema?: Record<string, unknown>;
  examples: WorkflowExample[];
  tasks: TaskSummary[];
  estimatedDurationMs?: number;
  categories?: string[];
  tags?: string[];
}

/**
 * Input for get_workflow_details tool
 */
export interface GetWorkflowDetailsInput {
  name: string;
}

/**
 * API response types from the gateway
 */
export interface GatewayWorkflowResponse {
  name: string;
  description?: string;
  categories?: string[];
  tags?: string[];
  examples?: WorkflowExample[];
  input?: Record<string, WorkflowInputParameter>;
  tasks?: Array<{
    id: string;
    taskRef: string;
    description?: string;
    dependsOn?: string[];
  }>;
}

/**
 * Gateway workflows list response
 */
export interface GatewayWorkflowsListResponse {
  workflows: GatewayWorkflowResponse[];
}

/**
 * Gateway workflow statistics response
 */
export interface GatewayWorkflowStatsResponse {
  workflowName: string;
  totalExecutions: number;
  avgDurationMs: number;
  successRate: number;
}

/**
 * Input for execute_workflow tool
 */
export interface ExecuteWorkflowInput {
  workflow: string;
  input: Record<string, unknown>;
  dryRun?: boolean;
}

/**
 * Task result in execution output
 */
export interface TaskExecutionResult {
  taskId: string;
  status: 'completed' | 'failed' | 'skipped';
  durationMs: number;
  output?: Record<string, unknown>;
  error?: string;
}

/**
 * Successful execution result
 */
export interface ExecuteWorkflowSuccessResult {
  success: true;
  executionId: string;
  output: Record<string, unknown>;
  durationMs: number;
  taskResults: TaskExecutionResult[];
}

/**
 * Missing input field info
 */
export interface MissingInputField {
  field: string;
  type: string;
  description?: string;
}

/**
 * Invalid input field info
 */
export interface InvalidInputField {
  field: string;
  error: string;
  received?: unknown;
}

/**
 * Validation failure result
 */
export interface ExecuteWorkflowValidationError {
  success: false;
  errorType: 'validation';
  missingInputs: MissingInputField[];
  invalidInputs: InvalidInputField[];
  suggestedPrompt?: string;
}

/**
 * Execution failure result
 */
export interface ExecuteWorkflowExecutionError {
  success: false;
  errorType: 'execution';
  failedTask: string;
  errorMessage: string;
  partialOutput?: Record<string, unknown>;
}

/**
 * Combined execute workflow result type
 */
export type ExecuteWorkflowResult =
  | ExecuteWorkflowSuccessResult
  | ExecuteWorkflowValidationError
  | ExecuteWorkflowExecutionError;

/**
 * Dry run execution plan
 */
export interface DryRunResult {
  success: true;
  executionPlan: {
    workflow: string;
    taskCount: number;
    parallelGroups: string[][];
    estimatedDurationMs?: number;
  };
}

// ============================================
// Stage 32.3: Label Management Types
// ============================================

/**
 * Tag information with usage count
 */
export interface TagInfo {
  name: string;
  count: number;
}

/**
 * Category information with usage count
 */
export interface CategoryInfo {
  name: string;
  count: number;
}

/**
 * Label list response from gateway
 */
export interface LabelListResponse {
  tags: TagInfo[];
  categories: CategoryInfo[];
}

/**
 * Input for list_labels tool
 */
export interface ListLabelsInput {
  entityType?: 'workflow' | 'task';
  sortBy?: 'usage' | 'name';
}

/**
 * Result from list_labels tool
 */
export interface ListLabelsResult {
  tags: TagInfo[];
  categories: CategoryInfo[];
  totalTags: number;
  totalCategories: number;
}

/**
 * Input for manage_labels tool
 */
export interface ManageLabelsInput {
  entityType: 'workflow' | 'task';
  entityNames: string[];
  addTags?: string[];
  removeTags?: string[];
  addCategories?: string[];
  removeCategories?: string[];
  dryRun?: boolean;
}

/**
 * Label change detail
 */
export interface LabelChange {
  entityName: string;
  tagsAdded: string[];
  tagsRemoved: string[];
  categoriesAdded: string[];
  categoriesRemoved: string[];
}

/**
 * Result from manage_labels tool
 */
export interface ManageLabelsResult {
  success: boolean;
  changes: LabelChange[];
  summary: {
    entitiesModified: number;
    tagsAdded: number;
    tagsRemoved: number;
    categoriesAdded: number;
    categoriesRemoved: number;
  };
  dryRun: boolean;
}

/**
 * Bulk labels request for gateway API
 */
export interface BulkLabelsRequest {
  entityNames: string[];
  addTags?: string[];
  removeTags?: string[];
  addCategories?: string[];
  removeCategories?: string[];
  dryRun?: boolean;
}

/**
 * Suggested label with confidence
 */
export interface SuggestedLabel {
  label: string;
  type: 'tag' | 'category';
  confidence: number;
  reason: string;
}

/**
 * Input for suggest_labels tool
 */
export interface SuggestLabelsInput {
  entityType: 'workflow' | 'task';
  entityName: string;
}

/**
 * Result from suggest_labels tool
 */
export interface SuggestLabelsResult {
  entityName: string;
  suggestions: SuggestedLabel[];
}

/**
 * Task definition for listing
 */
export interface TaskDefinition {
  name: string;
  description?: string;
  categories?: string[];
  tags?: string[];
  type?: string;
}

/**
 * Input for list_tasks tool
 */
export interface ListTasksInput {
  tags?: string[];
  anyTags?: string[];
  excludeTags?: string[];
  category?: string;
}

/**
 * Result from list_tasks tool
 */
export interface ListTasksResult {
  tasks: TaskDefinition[];
  total: number;
  filtered: number;
}
