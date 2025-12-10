/**
 * TypeScript type definitions for WorkflowGateway API
 * These match the backend C# DTOs from WorkflowGateway
 */

// ============================================================================
// Workflow Management Types
// ============================================================================

export interface WorkflowSummaryStats {
  totalExecutions: number;
  successRate: number;
  avgDurationMs: number;
  lastExecuted?: string; // ISO 8601
}

export interface WorkflowSummary {
  name: string;
  namespace: string;
  description: string;
  taskCount: number;
  inputSchemaPreview: string;
  endpoint: string;
  stats?: WorkflowSummaryStats;
}

export interface WorkflowListResponse {
  workflows: WorkflowSummary[];
  total: number;
  skip: number;
  take: number;
}

export interface TaskSummaryStats {
  usedByWorkflows: number;
  totalExecutions: number;
  successRate: number;
  avgDurationMs: number;
  lastExecuted?: string; // ISO 8601
}

export interface TaskSummary {
  name: string;
  type: string;
  namespace: string;
  description?: string;
  stats?: TaskSummaryStats;
}

export interface TaskListResponse {
  tasks: TaskSummary[];
  total: number;
  skip: number;
  take: number;
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
  dependsOn: string[];
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
  /** Time taken to build the execution graph in microseconds. Typically under 1000μs (1ms) */
  graphBuildDurationMicros?: number;
  error?: string;
}

// ============================================================================
// Workflow Test (Dry-run) Types
// ============================================================================

export interface WorkflowTestRequest {
  input: Record<string, any>;
}

// ============================================================================
// Test Execute Types (for builder testing without deployment)
// ============================================================================

export interface TestExecuteRequest {
  workflowYaml: string;
  input: Record<string, any>;
}

export interface TestExecuteResponse {
  success: boolean;
  workflowName: string;
  output?: Record<string, any>;
  executedTasks: string[];
  taskDetails: TaskExecutionDetail[];
  executionTimeMs: number;
  error?: string;
  validationErrors: string[];
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
  /** Time taken to build the execution graph in microseconds */
  graphBuildDurationMicros?: number;
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
  success: boolean;
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
  /** Time taken to build the execution graph in microseconds. Typically under 1000μs (1ms) */
  graphBuildDurationMicros?: number;
  input?: Record<string, any>;
  inputSnapshot?: Record<string, any>;
  output?: Record<string, any>;
  outputSnapshot?: Record<string, any>;
  tasks: DetailedTaskExecution[];
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
  waitedForTasks?: string[]; // Task IDs this task waited for
  retryCount?: number;
  success: boolean; // Whether the task completed successfully
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
// Metrics Types
// ============================================================================

export type TimeRange = '1h' | '24h' | '7d' | '30d';

export interface SystemMetrics {
  totalExecutions: number;
  throughput: number;
  p50Ms: number;
  p95Ms: number;
  p99Ms: number;
  errorRate: number;
  timeRange: string;
}

export interface WorkflowMetrics {
  name: string;
  avgDurationMs: number;
  p95Ms: number;
  errorRate: number;
  executionCount: number;
}

export interface WorkflowHistoryPoint {
  timestamp: string;
  avgDurationMs: number;
  p95Ms: number;
  errorRate: number;
  count: number;
}

export interface SlowestWorkflow {
  name: string;
  avgDurationMs: number;
  p95Ms: number;
  degradationPercent: number;
}

// ============================================================================
// Health Check Types
// ============================================================================

export type HealthState = 'Healthy' | 'Degraded' | 'Unhealthy' | 'Unknown';

export interface TaskHealthStatus {
  taskId: string;
  taskRef: string;
  status: HealthState;
  url?: string;
  latencyMs: number;
  reachable: boolean;
  statusCode?: number;
  errorMessage?: string;
}

export interface WorkflowHealthStatus {
  workflowName: string;
  overallHealth: HealthState;
  tasks: TaskHealthStatus[];
  checkedAt: string;
  durationMs: number;
}

export interface HealthSummary {
  totalWorkflows: number;
  healthyCount: number;
  degradedCount: number;
  unhealthyCount: number;
  unknownCount: number;
  workflows: WorkflowHealthStatus[];
  generatedAt: string;
}

// ============================================================================
// API Error Types
// ============================================================================

export interface ApiError {
  error: string;
  message: string;
  details?: Record<string, any>;
}

// ============================================================================
// Blast Radius Types
// ============================================================================

export interface BlastRadiusDepthLevel {
  depth: number;
  workflows: string[];
  tasks: string[];
}

export interface BlastRadiusSummary {
  totalAffectedWorkflows: number;
  totalAffectedTasks: number;
  affectedWorkflows: string[];
  affectedTasks: string[];
  byDepth: BlastRadiusDepthLevel[];
}

export interface BlastRadiusNode {
  id: string;
  name: string;
  type: 'task' | 'workflow';
  depth: number;
  isSource: boolean;
}

export interface BlastRadiusEdge {
  source: string;
  target: string;
  relationship: 'usedBy' | 'contains';
}

export interface BlastRadiusGraph {
  nodes: BlastRadiusNode[];
  edges: BlastRadiusEdge[];
}

export interface BlastRadiusResponse {
  taskName: string;
  analysisDepth: number;
  truncatedAtDepth: boolean;
  summary?: BlastRadiusSummary;
  graph?: BlastRadiusGraph;
}
