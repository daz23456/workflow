export interface WorkflowExecutionResponse {
  executionId: string;
  workflowName: string;
  success: boolean;
  output: Record<string, any>;
  tasks: TaskExecutionDetail[];
  executionTimeMs: number;
  /** Time taken to build the execution graph in microseconds. Typically under 1000μs (1ms) */
  graphBuildDurationMicros?: number;
  startedAt: string;
  completedAt?: string;
  error?: string;
}

export interface TaskExecutionDetail {
  taskId: string;
  taskRef: string;
  status: 'pending' | 'running' | 'success' | 'failed' | 'skipped';
  startedAt?: string;
  completedAt?: string;
  durationMs: number;
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
}

// Alias for backwards compatibility
export type DryRunResponse = WorkflowTestResponse;
