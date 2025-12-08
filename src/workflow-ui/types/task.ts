import type { JSONSchema } from './workflow';

/**
 * Task alias for use in components (same as TaskListItem)
 */
export type Task = TaskListItem;

/**
 * Task item displayed in the tasks list page
 */
export interface TaskListItem {
  name: string;
  namespace: string;
  description: string;
  endpoint: string;
  inputSchemaPreview?: string;
  tags?: string[];
  category?: string;
  stats: {
    usedByWorkflows: number; // Count of workflows using this task
    totalExecutions: number; // Total times executed across all workflows
    avgDurationMs: number;
    successRate: number; // 0-100
    lastExecuted?: string; // ISO timestamp
  };
}

/**
 * Detailed task information for task detail page
 */
export interface TaskDetail {
  name: string;
  namespace: string;
  description: string;
  inputSchema?: JSONSchema;
  outputSchema?: JSONSchema;
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
  timeout?: string; // e.g., "30s", "5m"
  stats: {
    usedByWorkflows: number;
    totalExecutions: number;
    avgDurationMs: number;
    successRate: number;
    lastExecuted?: string;
  };
  endpoints: {
    details: string;
    usage: string;
    executions: string;
    execute: string;
  };
}

/**
 * Workflow that uses a specific task
 */
export interface TaskUsageItem {
  workflowName: string;
  workflowNamespace: string;
  taskCount: number; // Total tasks in the workflow
  lastExecuted?: string; // ISO timestamp
}

/**
 * Execution of a task (across any workflow)
 */
export interface TaskExecutionItem {
  executionId: string;
  workflowName: string;
  workflowNamespace: string;
  status: 'success' | 'succeeded' | 'failed' | 'running';
  durationMs: number;
  startedAt: string; // ISO timestamp
  error?: string;
}

/**
 * Response from task execution (test/execute endpoint)
 */
export interface TaskExecutionResponse {
  executionId: string;
  status: 'success' | 'succeeded' | 'failed';
  durationMs: number;
  startedAt: string;
  completedAt?: string;
  outputs?: Record<string, any>;
  error?: string;
}

/**
 * Filters for task executions list
 */
export interface TaskExecutionFilters {
  workflow?: string; // Filter by workflow name
  status?: 'all' | 'success' | 'failed';
  dateFrom?: string; // ISO timestamp
  dateTo?: string; // ISO timestamp
  skip?: number; // Pagination offset
  take?: number; // Pagination limit
}

/**
 * Filters for task usage list
 */
export interface TaskUsageFilters {
  skip?: number;
  take?: number;
}
