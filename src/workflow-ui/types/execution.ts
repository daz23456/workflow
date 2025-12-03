export interface WorkflowExecutionResponse {
  executionId: string;
  workflowName: string;
  success: boolean;
  input?: Record<string, any>;
  output: Record<string, any>;
  /** Task execution details - backend may return as 'tasks' or 'taskDetails' */
  tasks?: TaskExecutionDetail[];
  /** Task execution details - backend may return as 'tasks' or 'taskDetails' */
  taskDetails?: TaskExecutionDetail[];
  executionTimeMs: number;
  /** Time taken to build the execution graph in microseconds. Typically under 1000μs (1ms) */
  graphBuildDurationMicros?: number;
  /** Detailed orchestration cost breakdown showing where time is spent outside of task execution */
  orchestrationCost?: OrchestrationCostResponse;
  /** Diagnostic information about dependency detection (for debugging dependency issues) */
  graphDiagnostics?: GraphDiagnosticsResponse;
  startedAt: string;
  completedAt?: string;
  error?: string;
}

/** Orchestration cost breakdown for API response */
export interface OrchestrationCostResponse {
  /** Time from execution start to first task start (graph build + setup) in microseconds */
  setupDurationMicros: number;
  /** Time from last task completion to execution complete (output mapping + cleanup) in microseconds */
  teardownDurationMicros: number;
  /** Time spent scheduling between task batches in microseconds */
  schedulingOverheadMicros: number;
  /** Total orchestration cost (setup + teardown + scheduling) in microseconds */
  totalOrchestrationCostMicros: number;
  /** What percentage of total execution time was orchestration overhead. Lower is better. Ideal: less than 5% */
  orchestrationCostPercentage: number;
  /** Number of execution iterations (batches of parallel tasks) */
  executionIterations: number;
  /** Per-iteration timing details */
  iterations?: IterationTimingResponse[];
}

/** Per-iteration timing for API response */
export interface IterationTimingResponse {
  iteration: number;
  taskIds: string[];
  /** Duration of this iteration (all tasks in batch) in microseconds */
  durationMicros: number;
  /** Scheduling delay before this iteration started (time from previous iteration end) in microseconds */
  schedulingDelayMicros: number;
}

/** Graph diagnostics for API response (debugging dependency issues) */
export interface GraphDiagnosticsResponse {
  tasks: TaskDependencyDiagnosticResponse[];
}

/** Per-task dependency diagnostic for API response */
export interface TaskDependencyDiagnosticResponse {
  taskId: string;
  /** Dependencies explicitly declared via dependsOn */
  explicitDependencies: string[];
  /** Dependencies inferred from template expressions (e.g., {{tasks.X.output.Y}}) */
  implicitDependencies: string[];
}

export interface TaskExecutionDetail {
  taskId: string;
  taskRef: string;
  status: 'pending' | 'running' | 'success' | 'failed' | 'skipped';
  startedAt?: string;
  completedAt?: string;
  durationMs: number;
  input?: any;
  output?: any;
  error?: string;
  retryCount: number;
  httpResponse?: {
    statusCode: number;
    headers: Record<string, string>;
    body: any;
  };
}

export interface ExecutionHistoryItem {
  executionId: string;
  workflowName: string;
  status: 'success' | 'failed' | 'running';
  startedAt: string;
  completedAt?: string;
  durationMs: number;
  /** Time taken to build the execution graph in microseconds. Typically under 1000μs (1ms) */
  graphBuildDurationMicros?: number;
  inputSnapshot: Record<string, any>;
  outputSnapshot?: Record<string, any>;
  error?: string;
}

export interface ValidationError {
  taskId: string;
  field: string;
  message: string;
  suggestion?: string;
}

export interface WorkflowTestResponse {
  valid: boolean;
  validationErrors: Array<string | ValidationError>;
  executionPlan: {
    taskOrder: string[];
    parallelizable: string[][];
    totalTasks?: number;
    estimatedDurationMs?: number;
    parallelGroups?: Array<{ level: number; taskIds: string[] }>;
    executionOrder?: string[];
    graph?: {
      nodes: Array<{ id: string; label: string; level: number; error?: boolean }>;
      edges: Array<{ source: string; target: string; error?: boolean }>;
    };
  };
  templateResolution?: Record<
    string,
    Record<string, { template: string; resolved: string; source?: string }>
  >;
  /** Time taken to build the execution graph in microseconds */
  graphBuildDurationMicros?: number;
}

// Alias for backwards compatibility
export type DryRunResponse = WorkflowTestResponse;
