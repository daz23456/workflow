/**
 * TypeScript type definitions for WorkflowGateway API
 * These match the backend C# DTOs from WorkflowGateway
 */

// ============================================================================
// Workflow Management Types
// ============================================================================

export interface WorkflowSummary {
  name: string;
  namespace: string;
  taskCount: number;
  endpoint: string;
}

export interface WorkflowListResponse {
  workflows: WorkflowSummary[];
}

export interface TaskSummary {
  name: string;
  namespace: string;
  endpoint: string;
}

export interface TaskListResponse {
  tasks: TaskSummary[];
}

// ============================================================================
// Task Detail Types
// ============================================================================

export interface TaskStats {
  usedByWorkflows: number;
  totalExecutions: number;
  avgDurationMs: number;
  successRate: number;
  lastExecuted?: string; // ISO 8601
}

export interface TaskDetailResponse {
  name: string;
  namespace: string;
  description?: string;
  inputSchema?: SchemaDefinition;
  outputSchema?: SchemaDefinition;
  httpRequest?: {
    method: string;
    url: string;
    headers: Record<string, string>;
    bodyTemplate?: string;
  };
  retryPolicy?: {
    maxRetries: number;
    backoffMs: number;
  };
  timeout?: string;
  stats?: TaskStats;
}

export interface TaskUsageItem {
  workflowName: string;
  workflowNamespace: string;
  taskCount: number;
  lastExecuted?: string; // ISO 8601
}

export interface TaskUsageListResponse {
  taskName: string;
  workflows: TaskUsageItem[];
  totalCount: number;
  skip: number;
  take: number;
}

export interface TaskExecutionItem {
  executionId: string;
  workflowName: string;
  workflowNamespace: string;
  status: ExecutionStatus;
  durationMs: number;
  startedAt: string; // ISO 8601
  error?: string;
}

export interface TaskExecutionListResponse {
  taskName: string;
  executions: TaskExecutionItem[];
  totalCount: number;
  skip: number;
  take: number;
}

export interface TaskExecutionRequest {
  input: Record<string, any>;
}

export interface TaskExecutionResponse {
  executionId: string;
  taskName: string;
  status: ExecutionStatus;
  durationMs: number;
  startedAt: string; // ISO 8601
  completedAt?: string; // ISO 8601
  output?: Record<string, any>;
  error?: string;
}

// ============================================================================
// Workflow Detail Types
// ============================================================================

export interface PropertyDefinition {
  type: string;
  description?: string;
  format?: string;
  enum?: string[];
  minimum?: number;
  maximum?: number;
  items?: PropertyDefinition;
}

export interface SchemaDefinition {
  type: string;
  properties?: Record<string, PropertyDefinition>;
  required?: string[];
}

export interface WorkflowTaskStep {
  id: string;
  taskRef: string;
  description?: string;
  dependencies: string[];
  timeout?: string;
}

export interface WorkflowEndpoints {
  execute: string;
  test: string;
  details: string;
}

export interface WorkflowDetailResponse {
  name: string;
  namespace: string;
  inputSchema?: SchemaDefinition;
  outputSchema?: Record<string, any>;
  tasks: WorkflowTaskStep[];
  endpoints: WorkflowEndpoints;
}

// ============================================================================
// Workflow Execution Types
// ============================================================================

export interface WorkflowExecutionRequest {
  input: Record<string, any>;
}

export interface TaskExecutionDetail {
  taskId?: string;
  taskRef?: string;
  success: boolean;
  output?: Record<string, any>;
  errors: string[];
  retryCount: number;
  durationMs: number;
  startedAt: string; // ISO 8601
  completedAt: string; // ISO 8601
}

export interface WorkflowExecutionResponse {
  executionId: string;
  workflowName: string;
  success: boolean;
  output?: Record<string, any>;
  executedTasks: string[];
  taskDetails: TaskExecutionDetail[];
  executionTimeMs: number;
  error?: string;
}

// ============================================================================
// Workflow Test (Dry-run) Types
// ============================================================================

export interface WorkflowTestRequest {
  input: Record<string, any>;
}

export interface ValidationError {
  message: string;
  path?: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

export interface ExecutionGraphNode {
  id: string;
  taskRef: string;
  level: number;
}

export interface ExecutionGraphEdge {
  from: string;
  to: string;
}

export interface ParallelGroup {
  level: number;
  taskIds: string[];
}

export interface ExecutionPlan {
  nodes: ExecutionGraphNode[];
  edges: ExecutionGraphEdge[];
  parallelGroups: ParallelGroup[];
  executionOrder: string[];
  validationResult: ValidationResult;
  estimatedDurationMs?: number;
  templatePreviews: Record<string, Record<string, string>>;
}

export interface WorkflowTestResponse {
  valid: boolean;
  validationErrors: string[];
  executionPlan?: ExecutionPlan;
}

// ============================================================================
// Execution History Types
// ============================================================================

export type ExecutionStatus = 'Running' | 'Succeeded' | 'Failed' | 'Cancelled';

export interface ExecutionSummary {
  id: string;
  workflowName?: string;
  status?: ExecutionStatus;
  startedAt: string; // ISO 8601
  completedAt?: string; // ISO 8601
  durationMs?: number;
}

export interface ExecutionListResponse {
  workflowName?: string;
  executions: ExecutionSummary[];
  totalCount: number;
  skip: number;
  take: number;
}

export interface DetailedTaskExecution {
  taskId: string;
  taskRef: string;
  status: string;
  output?: Record<string, any>;
  errors: string[];
  durationMs: number;
  retryCount: number;
  startedAt: string; // ISO 8601
  completedAt: string; // ISO 8601
}

export interface DetailedWorkflowExecutionResponse {
  executionId: string;
  workflowName: string;
  status: ExecutionStatus;
  startedAt: string; // ISO 8601
  completedAt?: string; // ISO 8601
  durationMs?: number;
  inputSnapshot: Record<string, any>;
  outputSnapshot?: Record<string, any>;
  taskExecutions: DetailedTaskExecution[];
  errors?: string[];
}

// ============================================================================
// Execution Trace Types
// ============================================================================

export interface TaskTimingDetail {
  taskId: string;
  taskRef: string;
  startedAt: string; // ISO 8601
  completedAt?: string; // ISO 8601
  durationMs?: number;
  waitTimeMs: number; // Time spent waiting for dependencies
  status: string;
}

export interface DependencyInfo {
  taskId: string;
  dependsOn: string[];
  level: number;
}

export interface ActualParallelGroup {
  taskIds: string[];
  startedAt: string; // ISO 8601
  completedAt: string; // ISO 8601
  overlapMs: number;
}

export interface ExecutionTraceResponse {
  executionId: string;
  workflowName: string;
  startedAt: string; // ISO 8601
  completedAt?: string; // ISO 8601
  totalDurationMs?: number;
  taskTimings: TaskTimingDetail[];
  dependencyOrder: DependencyInfo[];
  plannedParallelGroups: ParallelGroup[];
  actualParallelGroups: ActualParallelGroup[];
}

// ============================================================================
// Workflow Versioning Types
// ============================================================================

export interface WorkflowVersion {
  versionHash: string;
  createdAt: string; // ISO 8601
  definitionSnapshot: string; // YAML workflow definition
}

export interface WorkflowVersionListResponse {
  workflowName: string;
  versions: WorkflowVersion[];
}

// ============================================================================
// Duration Trends Types
// ============================================================================

export interface DurationDataPoint {
  date: Date;
  averageDurationMs: number;
  minDurationMs: number;
  maxDurationMs: number;
  p50DurationMs: number;
  p95DurationMs: number;
  executionCount: number;
  successCount: number;
  failureCount: number;
}

export interface DurationTrendsResponse {
  entityType: 'Workflow' | 'Task';
  entityName: string;
  daysBack: number;
  dataPoints: DurationDataPoint[];
}

// ============================================================================
// API Error Types
// ============================================================================

export interface ApiError {
  error: string;
  message: string;
  details?: Record<string, any>;
}
