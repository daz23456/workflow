import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  WorkflowListItem,
  WorkflowDetail,
} from '@/types/workflow';
import type {
  WorkflowExecutionResponse,
  ExecutionHistoryItem,
  DryRunResponse,
} from '@/types/execution';
import type {
  TaskDetail,
  TaskUsageItem,
  TaskExecutionItem,
  TaskExecutionResponse,
} from '@/types/task';
import type { DurationTrendsResponse } from './types';

/**
 * TanStack Query hooks for API data fetching
 *
 * Key features:
 * - Automatic caching and cache invalidation
 * - Loading and error states
 * - Automatic retries
 * - Query deduplication
 * - Optimistic updates
 */

// ============================================================================
// API BASE URL
// ============================================================================

// Changed from '/api/v1' to '/api' to use Next.js proxy routes instead of MSW
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

// ============================================================================
// API CLIENT UTILITIES
// ============================================================================

class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public details?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new ApiError(
      data.error || 'An error occurred',
      response.status,
      data.details
    );
  }

  return data;
}

// ============================================================================
// QUERY KEYS (for cache invalidation)
// ============================================================================

export const queryKeys = {
  workflows: (filters?: { search?: string; namespace?: string; sort?: string }) =>
    ['workflows', filters] as const,
  workflowDetail: (name: string) => ['workflows', name] as const,
  workflowExecutions: (name: string, filters?: { status?: string; limit?: number; offset?: number }) =>
    ['workflows', name, 'executions', filters] as const,
  workflowDurationTrends: (name: string, daysBack: number) =>
    ['workflows', name, 'duration-trends', daysBack] as const,
  executionDetail: (id: string) => ['executions', id] as const,
  tasks: ['tasks'] as const,
  taskDetail: (name: string) => ['tasks', name] as const,
  taskUsage: (name: string, filters?: { skip?: number; take?: number }) =>
    ['tasks', name, 'usage', filters] as const,
  taskExecutions: (name: string, filters?: { status?: string; skip?: number; take?: number }) =>
    ['tasks', name, 'executions', filters] as const,
  taskDurationTrends: (name: string, daysBack: number) =>
    ['tasks', name, 'duration-trends', daysBack] as const,
};

// ============================================================================
// WORKFLOW QUERIES
// ============================================================================

/**
 * Fetch all workflows with optional filters
 */
export function useWorkflows(filters?: {
  search?: string;
  namespace?: string;
  sort?: string;
}) {
  return useQuery({
    queryKey: queryKeys.workflows(filters),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.search) params.append('search', filters.search);
      if (filters?.namespace) params.append('namespace', filters.namespace);
      if (filters?.sort) params.append('sort', filters.sort);

      const url = params.toString()
        ? `${API_BASE_URL}/workflows?${params}`
        : `${API_BASE_URL}/workflows`;

      const data = await fetchJson<{ workflows: WorkflowListItem[]; total: number }>(url);
      return data;
    },
    staleTime: 30000, // Consider data fresh for 30 seconds
    gcTime: 300000, // Keep in cache for 5 minutes
  });
}

/**
 * Fetch workflow details by name
 */
export function useWorkflowDetail(name: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.workflowDetail(name),
    queryFn: async () => {
      const data = await fetchJson<WorkflowDetail>(
        `${API_BASE_URL}/workflows/${name}`
      );
      return data;
    },
    staleTime: 60000, // 1 minute
    gcTime: 300000, // 5 minutes
    enabled: options?.enabled ?? true,
  });
}

/**
 * Fetch execution history for a workflow
 */
export function useWorkflowExecutions(
  name: string,
  filters?: {
    status?: string;
    limit?: number;
    offset?: number;
  }
) {
  const { status, limit = 10, offset = 0 } = filters || {};

  return useQuery({
    queryKey: queryKeys.workflowExecutions(name, { status, limit, offset }),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (status) params.append('status', status);
      params.append('limit', String(limit));
      params.append('offset', String(offset));

      const data = await fetchJson<{
        executions: ExecutionHistoryItem[];
        total: number;
        limit: number;
        offset: number;
      }>(`${API_BASE_URL}/workflows/${name}/executions?${params}`);
      return data;
    },
    staleTime: 10000, // 10 seconds (execution history updates frequently)
    gcTime: 60000, // 1 minute
  });
}

/**
 * Fetch execution details by ID
 */
export function useExecutionDetail(id: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.executionDetail(id),
    queryFn: async () => {
      const data = await fetchJson<WorkflowExecutionResponse>(
        `${API_BASE_URL}/executions/${id}`
      );
      return data;
    },
    staleTime: 60000, // 1 minute
    gcTime: 300000, // 5 minutes
    enabled: options?.enabled ?? true,
  });
}

/**
 * Fetch duration trends for a workflow over time
 */
export function useWorkflowDurationTrends(
  name: string,
  daysBack: number = 30,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: queryKeys.workflowDurationTrends(name, daysBack),
    queryFn: async () => {
      const data = await fetchJson<DurationTrendsResponse>(
        `${API_BASE_URL}/workflows/${name}/duration-trends?daysBack=${daysBack}`
      );

      // Parse date strings to Date objects
      return {
        ...data,
        dataPoints: data.dataPoints.map(point => ({
          ...point,
          date: new Date(point.date),
        })),
      };
    },
    staleTime: 300000, // 5 minutes (trends change slowly)
    gcTime: 900000, // 15 minutes
    enabled: options?.enabled ?? !!name,
  });
}

// ============================================================================
// WORKFLOW MUTATIONS
// ============================================================================

/**
 * Execute a workflow
 */
export function useExecuteWorkflow(name: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: Record<string, unknown>) => {
      const data = await fetchJson<WorkflowExecutionResponse>(
        `${API_BASE_URL}/workflows/${name}/execute`,
        {
          method: 'POST',
          body: JSON.stringify(input),
        }
      );
      return data;
    },
    onSuccess: () => {
      // Invalidate execution history to show new execution
      queryClient.invalidateQueries({
        queryKey: queryKeys.workflowExecutions(name),
      });
      // Invalidate workflow list to update stats (all filters)
      queryClient.invalidateQueries({
        queryKey: ['workflows'],
      });
    },
  });
}

/**
 * Dry-run a workflow (validation + execution plan)
 */
export function useDryRun(name: string) {
  return useMutation({
    mutationFn: async (input: Record<string, unknown>) => {
      const data = await fetchJson<DryRunResponse>(
        `${API_BASE_URL}/workflows/${name}/test`,
        {
          method: 'POST',
          body: JSON.stringify(input),
        }
      );
      return data;
    },
  });
}

// ============================================================================
// TASK QUERIES
// ============================================================================

/**
 * Fetch all available tasks
 */
export function useTasks() {
  return useQuery({
    queryKey: queryKeys.tasks,
    queryFn: async () => {
      const data = await fetchJson<{
        tasks: Array<{
          name: string;
          description: string;
          inputSchema: unknown;
          outputSchema: unknown;
        }>;
      }>(`${API_BASE_URL}/tasks`);
      return data;
    },
    staleTime: 300000, // 5 minutes (tasks don't change often)
    gcTime: 600000, // 10 minutes
  });
}

// ============================================================================
// UTILITY HOOKS
// ============================================================================

/**
 * Prefetch workflow detail (useful for optimistic UI)
 */
export function usePrefetchWorkflowDetail() {
  const queryClient = useQueryClient();

  return (name: string) => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.workflowDetail(name),
      queryFn: async () => {
        const data = await fetchJson<WorkflowDetail>(
          `${API_BASE_URL}/workflows/${name}`
        );
        return data;
      },
    });
  };
}

/**
 * Invalidate all workflow-related queries (useful after workflow updates)
 */
export function useInvalidateWorkflows() {
  const queryClient = useQueryClient();

  return () => {
    queryClient.invalidateQueries({ queryKey: ['workflows'] });
  };
}

// ============================================================================
// TASK DETAIL QUERIES
// ============================================================================

/**
 * Fetch detailed task information by name
 */
export function useTaskDetail(name: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.taskDetail(name),
    queryFn: async () => {
      const data = await fetchJson<TaskDetail>(
        `${API_BASE_URL}/tasks/${name}`
      );
      return data;
    },
    staleTime: 60000, // 1 minute
    gcTime: 300000, // 5 minutes
    enabled: options?.enabled ?? true,
  });
}

/**
 * Prefetch task detail (useful for optimistic UI)
 */
export function usePrefetchTaskDetail() {
  const queryClient = useQueryClient();

  return (name: string) => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.taskDetail(name),
      queryFn: async () => {
        const data = await fetchJson<TaskDetail>(
          `${API_BASE_URL}/tasks/${name}`
        );
        return data;
      },
    });
  };
}

/**
 * Fetch workflows that use a specific task
 */
export function useTaskUsage(
  name: string,
  filters?: {
    skip?: number;
    take?: number;
  }
) {
  const { skip = 0, take = 20 } = filters || {};

  return useQuery({
    queryKey: queryKeys.taskUsage(name, { skip, take }),
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('skip', String(skip));
      params.append('take', String(take));

      const data = await fetchJson<{
        taskName: string;
        workflows: TaskUsageItem[];
        totalCount: number;
        skip: number;
        take: number;
      }>(`${API_BASE_URL}/tasks/${name}/usage?${params}`);
      return data;
    },
    staleTime: 30000, // 30 seconds
    gcTime: 300000, // 5 minutes
  });
}

/**
 * Fetch execution history for a specific task across all workflows
 */
export function useTaskExecutions(
  name: string,
  filters?: {
    status?: string;
    skip?: number;
    take?: number;
  }
) {
  const { status, skip = 0, take = 20 } = filters || {};

  return useQuery({
    queryKey: queryKeys.taskExecutions(name, { status, skip, take }),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (status) params.append('status', status);
      params.append('skip', String(skip));
      params.append('take', String(take));

      const data = await fetchJson<{
        taskName: string;
        executions: TaskExecutionItem[];
        averageDurationMs: number;
        totalCount: number;
        skip: number;
        take: number;
      }>(`${API_BASE_URL}/tasks/${name}/executions?${params}`);
      return data;
    },
    staleTime: 10000, // 10 seconds (execution history updates frequently)
    gcTime: 60000, // 1 minute
  });
}

/**
 * Fetch duration trends for a task over time (across all workflows)
 */
export function useTaskDurationTrends(
  name: string,
  daysBack: number = 30,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: queryKeys.taskDurationTrends(name, daysBack),
    queryFn: async () => {
      const data = await fetchJson<DurationTrendsResponse>(
        `${API_BASE_URL}/tasks/${name}/duration-trends?daysBack=${daysBack}`
      );

      // Parse date strings to Date objects
      return {
        ...data,
        dataPoints: data.dataPoints.map(point => ({
          ...point,
          date: new Date(point.date),
        })),
      };
    },
    staleTime: 300000, // 5 minutes (trends change slowly)
    gcTime: 900000, // 15 minutes
    enabled: options?.enabled ?? !!name,
  });
}

// ============================================================================
// TASK MUTATIONS
// ============================================================================

/**
 * Execute a task standalone (without workflow)
 */
export function useExecuteTask(name: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: Record<string, unknown>) => {
      const data = await fetchJson<TaskExecutionResponse>(
        `${API_BASE_URL}/tasks/${name}/execute`,
        {
          method: 'POST',
          body: JSON.stringify({ input }),
        }
      );
      return data;
    },
    onSuccess: () => {
      // Invalidate task execution history to show new execution
      queryClient.invalidateQueries({
        queryKey: queryKeys.taskExecutions(name),
      });
      // Invalidate task details to update stats
      queryClient.invalidateQueries({
        queryKey: queryKeys.taskDetail(name),
      });
      // Invalidate tasks list to update overall stats
      queryClient.invalidateQueries({
        queryKey: queryKeys.tasks,
      });
    },
  });
}
