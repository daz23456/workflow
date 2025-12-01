import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { WorkflowListItem, WorkflowDetail } from '@/types/workflow';
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
import type {
  TemplateListItem,
  TemplateDetail,
  TemplateFilters,
  TemplateDeployRequest,
} from '@/types/template';
import type { DurationTrendsResponse, ExecutionTraceResponse } from './types';

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
    throw new ApiError(data.error || 'An error occurred', response.status, data.details);
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
  workflowExecutions: (
    name: string,
    filters?: { status?: string; limit?: number; offset?: number }
  ) => ['workflows', name, 'executions', filters] as const,
  workflowDurationTrends: (name: string, daysBack: number) =>
    ['workflows', name, 'duration-trends', daysBack] as const,
  workflowVersions: (name: string) => ['workflows', name, 'versions'] as const,
  executionDetail: (id: string) => ['executions', id] as const,
  executionTrace: (id: string) => ['executions', id, 'trace'] as const,
  tasks: ['tasks'] as const,
  taskDetail: (name: string) => ['tasks', name] as const,
  taskUsage: (name: string, filters?: { skip?: number; take?: number }) =>
    ['tasks', name, 'usage', filters] as const,
  taskExecutions: (name: string, filters?: { status?: string; skip?: number; take?: number }) =>
    ['tasks', name, 'executions', filters] as const,
  taskDurationTrends: (name: string, daysBack: number) =>
    ['tasks', name, 'duration-trends', daysBack] as const,
  templates: (filters?: TemplateFilters) => ['templates', filters] as const,
  templateDetail: (name: string) => ['templates', name] as const,
};

// ============================================================================
// WORKFLOW QUERIES
// ============================================================================

/**
 * Fetch all workflows with optional filters
 */
export function useWorkflows(filters?: { search?: string; namespace?: string; sort?: string }) {
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
      const data = await fetchJson<WorkflowDetail>(`${API_BASE_URL}/workflows/${name}`);
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

      // Backend returns ExecutionSummary with 'id', but frontend expects 'executionId'
      const data = await fetchJson<{
        executions: Array<{
          id?: string;
          executionId?: string;
          workflowName?: string;
          status?: string;
          startedAt: string;
          completedAt?: string;
          durationMs?: number;
          inputSnapshot?: Record<string, unknown>;
          outputSnapshot?: Record<string, unknown>;
          error?: string;
        }>;
        total?: number;
        totalCount?: number;
        limit?: number;
        offset?: number;
      }>(`${API_BASE_URL}/workflows/${name}/executions?${params}`);

      // Transform executions to ensure executionId is set
      const executions: ExecutionHistoryItem[] = data.executions.map((exec) => ({
        executionId: exec.executionId || exec.id || '',
        workflowName: exec.workflowName || name,
        status: (exec.status?.toLowerCase() === 'succeeded' ? 'success' : exec.status?.toLowerCase() || 'running') as 'success' | 'failed' | 'running',
        startedAt: exec.startedAt,
        completedAt: exec.completedAt,
        durationMs: exec.durationMs || 0,
        inputSnapshot: exec.inputSnapshot || {},
        outputSnapshot: exec.outputSnapshot,
        error: exec.error,
      }));

      return {
        executions,
        total: data.total ?? data.totalCount ?? executions.length,
        limit: data.limit ?? limit,
        offset: data.offset ?? offset,
      };
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
      // Backend returns DetailedWorkflowExecutionResponse with 'status' field
      // Frontend expects WorkflowExecutionResponse with 'success' boolean
      const data = await fetchJson<{
        executionId?: string;
        workflowName: string;
        status?: string;
        success?: boolean;
        startedAt: string;
        completedAt?: string;
        durationMs?: number;
        executionTimeMs?: number;
        graphBuildDurationMicros?: number;
        input?: Record<string, unknown>;
        inputSnapshot?: Record<string, unknown>;
        output?: Record<string, unknown>;
        outputSnapshot?: Record<string, unknown>;
        tasks?: Array<{
          taskId: string;
          taskRef: string;
          success?: boolean;
          status?: string;
          input?: unknown;
          output?: unknown;
          errors?: string[];
          error?: string;
          durationMs: number;
          retryCount?: number;
          startedAt?: string;
          completedAt?: string;
        }>;
        taskExecutions?: Array<{
          taskId: string;
          taskRef: string;
          success?: boolean;
          status?: string;
          input?: unknown;
          output?: unknown;
          errors?: string[];
          error?: string;
          durationMs: number;
          retryCount?: number;
          startedAt?: string;
          completedAt?: string;
        }>;
        errors?: string[];
        error?: string;
      }>(`${API_BASE_URL}/executions/${id}`);

      // Determine success from status or success field
      const isSuccess =
        data.success !== undefined
          ? data.success
          : data.status?.toLowerCase() === 'succeeded' || data.status?.toLowerCase() === 'success';

      // Transform to expected format
      const tasks = (data.tasks || data.taskExecutions || []).map((task) => ({
        taskId: task.taskId,
        taskRef: task.taskRef,
        status: task.success ? 'success' as const : 'failed' as const,
        input: task.input,
        output: task.output,
        error: task.error || (task.errors && task.errors.length > 0 ? task.errors.join('; ') : undefined),
        durationMs: task.durationMs,
        retryCount: task.retryCount || 0,
        startedAt: task.startedAt,
        completedAt: task.completedAt,
      }));

      const result: WorkflowExecutionResponse = {
        executionId: data.executionId || id,
        workflowName: data.workflowName,
        success: isSuccess,
        input: data.input || data.inputSnapshot,
        output: data.output || data.outputSnapshot || {},
        tasks,
        executionTimeMs: data.executionTimeMs || data.durationMs || 0,
        graphBuildDurationMicros: data.graphBuildDurationMicros,
        startedAt: data.startedAt,
        completedAt: data.completedAt,
        error: data.error || (data.errors && data.errors.length > 0 ? data.errors.join('; ') : undefined),
      };

      return result;
    },
    staleTime: 60000, // 1 minute
    gcTime: 300000, // 5 minutes
    enabled: options?.enabled ?? true,
  });
}

/**
 * Fetch execution trace with detailed timing analysis
 */
export function useExecutionTrace(id: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.executionTrace(id),
    queryFn: async () => {
      const data = await fetchJson<ExecutionTraceResponse>(
        `${API_BASE_URL}/executions/${id}/trace`
      );
      return data;
    },
    staleTime: 60000, // 1 minute (trace data doesn't change for completed executions)
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
        dataPoints: data.dataPoints.map((point) => ({
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

/**
 * Fetch workflow version history (includes YAML definitions)
 */
export function useWorkflowVersions(name: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.workflowVersions(name),
    queryFn: async () => {
      const data = await fetchJson<{
        workflowName: string;
        versions: Array<{
          versionHash: string;
          createdAt: string;
          definitionSnapshot: string;
        }>;
      }>(`${API_BASE_URL}/workflows/${name}/versions`);
      return data;
    },
    staleTime: 60000, // 1 minute
    gcTime: 300000, // 5 minutes
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
      const data = await fetchJson<DryRunResponse>(`${API_BASE_URL}/workflows/${name}/test`, {
        method: 'POST',
        body: JSON.stringify(input),
      });
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
          namespace: string;
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
        const data = await fetchJson<WorkflowDetail>(`${API_BASE_URL}/workflows/${name}`);
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
      const data = await fetchJson<TaskDetail>(`${API_BASE_URL}/tasks/${name}`);
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
        const data = await fetchJson<TaskDetail>(`${API_BASE_URL}/tasks/${name}`);
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
        dataPoints: data.dataPoints.map((point) => ({
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
      const data = await fetchJson<TaskExecutionResponse>(`${API_BASE_URL}/tasks/${name}/execute`, {
        method: 'POST',
        body: JSON.stringify({ input }),
      });
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

// ============================================================================
// TEMPLATE QUERIES
// ============================================================================

/**
 * Fetch all workflow templates with optional filters
 */
export function useTemplates(filters?: TemplateFilters) {
  return useQuery({
    queryKey: queryKeys.templates(filters),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.category) params.append('category', filters.category);
      if (filters?.difficulty) params.append('difficulty', filters.difficulty);
      if (filters?.search) params.append('search', filters.search);
      if (filters?.tags && filters.tags.length > 0) {
        filters.tags.forEach((tag) => params.append('tags', tag));
      }
      if (filters?.maxEstimatedTime) {
        params.append('maxEstimatedTime', String(filters.maxEstimatedTime));
      }
      if (filters?.parallelOnly) {
        params.append('parallelOnly', 'true');
      }

      const url = params.toString()
        ? `${API_BASE_URL}/templates?${params}`
        : `${API_BASE_URL}/templates`;

      const data = await fetchJson<{ templates: TemplateListItem[]; total: number }>(url);
      return data;
    },
    staleTime: 60000, // 1 minute (templates don't change often)
    gcTime: 300000, // 5 minutes
  });
}

/**
 * Fetch template details including YAML definition
 */
export function useTemplateDetail(name: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.templateDetail(name),
    queryFn: async () => {
      const data = await fetchJson<TemplateDetail>(`${API_BASE_URL}/templates/${name}`);
      return data;
    },
    staleTime: 60000, // 1 minute
    gcTime: 300000, // 5 minutes
    enabled: options?.enabled ?? true,
  });
}

/**
 * Prefetch template detail (useful for hover previews)
 */
export function usePrefetchTemplateDetail() {
  const queryClient = useQueryClient();

  return (name: string) => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.templateDetail(name),
      queryFn: async () => {
        const data = await fetchJson<TemplateDetail>(`${API_BASE_URL}/templates/${name}`);
        return data;
      },
    });
  };
}

// ============================================================================
// TEMPLATE MUTATIONS
// ============================================================================

/**
 * Deploy a template (creates a new workflow from template)
 */
export function useDeployTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: TemplateDeployRequest) => {
      const data = await fetchJson<{ workflowName: string; namespace: string; message: string }>(
        `${API_BASE_URL}/templates/deploy`,
        {
          method: 'POST',
          body: JSON.stringify(request),
        }
      );
      return data;
    },
    onSuccess: () => {
      // Invalidate workflows to show newly deployed workflow
      queryClient.invalidateQueries({
        queryKey: ['workflows'],
      });
    },
  });
}
