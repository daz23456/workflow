export interface WorkflowExecutionResponse {
  executionId: string;
  workflowName: string;
  success: boolean;
  output: Record<string, any>;
  tasks: TaskExecutionDetail[];
  executionTimeMs: number;
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
  inputSnapshot: Record<string, any>;
  outputSnapshot?: Record<string, any>;
}

export interface WorkflowTestResponse {
  valid: boolean;
  validationErrors: string[];
  executionPlan: {
    taskOrder: string[];
    parallelizable: string[][];
  };
}
