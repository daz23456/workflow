import type { TaskDetail, TaskUsageItem, TaskExecutionItem } from '@/types/task';

/**
 * Mock task details for testing
 */
export const mockTaskDetails: Record<string, TaskDetail> = {
  'fetch-user': {
    name: 'fetch-user',
    namespace: 'default',
    description: 'Fetches user data from the API',
    inputSchema: {
      type: 'object',
      properties: {
        userId: { type: 'string' },
      },
      required: ['userId'],
    },
    outputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        name: { type: 'string' },
        email: { type: 'string' },
      },
    },
    httpRequest: {
      method: 'GET',
      url: 'https://api.example.com/users/{{input.userId}}',
      headers: {
        'Content-Type': 'application/json',
      },
    },
    retryPolicy: {
      maxRetries: 3,
      backoffMs: 1000,
    },
    timeout: '30s',
    stats: {
      usedByWorkflows: 3,
      totalExecutions: 150,
      avgDurationMs: 250,
      successRate: 95.5,
      lastExecuted: '2025-01-15T10:30:00Z',
    },
    endpoints: {
      details: '/api/tasks/fetch-user',
      usage: '/api/tasks/fetch-user/usage',
      executions: '/api/tasks/fetch-user/executions',
      execute: '/api/tasks/fetch-user/execute',
    },
  },
};

/**
 * Mock task usage data
 */
export const mockTaskUsage: Record<string, TaskUsageItem[]> = {
  'fetch-user': [
    {
      workflowName: 'user-signup',
      workflowNamespace: 'default',
      taskCount: 5,
      lastExecuted: '2025-01-15T10:30:00Z',
    },
    {
      workflowName: 'user-onboarding',
      workflowNamespace: 'default',
      taskCount: 3,
      lastExecuted: '2025-01-14T15:20:00Z',
    },
    {
      workflowName: 'profile-update',
      workflowNamespace: 'production',
      taskCount: 2,
      lastExecuted: '2025-01-13T09:15:00Z',
    },
  ],
};

/**
 * Mock task executions
 */
export const mockTaskExecutions: Record<string, TaskExecutionItem[]> = {
  'fetch-user': [
    {
      executionId: 'exec-task-001',
      workflowName: 'user-signup',
      workflowNamespace: 'default',
      status: 'succeeded',
      durationMs: 245,
      startedAt: '2025-01-15T10:30:00Z',
    },
    {
      executionId: 'exec-task-002',
      workflowName: 'user-onboarding',
      workflowNamespace: 'default',
      status: 'succeeded',
      durationMs: 230,
      startedAt: '2025-01-15T09:15:00Z',
    },
    {
      executionId: 'exec-task-003',
      workflowName: 'user-signup',
      workflowNamespace: 'default',
      status: 'failed',
      durationMs: 125,
      startedAt: '2025-01-14T18:45:00Z',
      error: 'User not found',
    },
  ],
};
