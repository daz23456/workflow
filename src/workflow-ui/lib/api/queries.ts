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

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api/v1';

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
  workflows: ['workflows'] as const,
  workflowDetail: (name: string) => ['workflows', name] as const,
  workflowExecutions: (name: string, filters?: { status?: string; limit?: number; offset?: number }) =>
    ['workflows', name, 'executions', filters] as const,
  executionDetail: (id: string) => ['executions', id] as const,
  tasks: ['tasks'] as const,
};

// ============================================================================
// WORKFLOW QUERIES
// ============================================================================

/**
 * Fetch all workflows
 */
export function useWorkflows() {
  return useQuery({
    queryKey: queryKeys.workflows,
    queryFn: async () => {
      const data = await fetchJson<{ workflows: WorkflowListItem[]; total: number }>(
        `${API_BASE_URL}/workflows`
      );
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
      // Invalidate workflow list to update stats
      queryClient.invalidateQueries({
        queryKey: queryKeys.workflows,
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
    queryClient.invalidateQueries({ queryKey: queryKeys.workflows });
  };
}
