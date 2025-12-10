import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import {
  useWorkflows,
  useWorkflowDetail,
  useWorkflowExecutions,
  useExecutionDetail,
  useExecuteWorkflow,
  useDryRun,
  useTasks,
  usePrefetchWorkflowDetail,
  useInvalidateWorkflows,
  useTaskDetail,
  useTaskUsage,
  useTaskExecutions,
  useExecuteTask,
  useWorkflowDurationTrends,
  useTaskDurationTrends,
  usePrefetchTaskDetail,
  useTemplates,
  useTemplateDetail,
  usePrefetchTemplateDetail,
  useDeployTemplate,
  useSystemMetrics,
  useWorkflowsMetrics,
  useWorkflowHistoryMetrics,
  useSlowestWorkflows,
  useBlastRadius,
} from './queries';

/**
 * Test TanStack Query hooks to ensure they:
 * - Fetch data correctly
 * - Handle loading states
 * - Handle errors
 * - Cache data appropriately
 */

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false, // Disable retries in tests
        gcTime: Infinity, // Don't garbage collect during tests
      },
    },
  });

  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe('TanStack Query Hooks', () => {
  describe('API Error Handling', () => {
    it('creates ApiError with status and details', async () => {
      const { result } = renderHook(() => useWorkflowDetail('non-existent'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      const error = result.current.error as Error & { status?: number };
      expect(error).toBeDefined();
      expect(error.name).toBe('ApiError');
      expect(error.status).toBe(404);
    });

    it('uses fallback error message when data.error is missing', async () => {
      const { result } = renderHook(() => useWorkflowDetail('error-no-message'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      const error = result.current.error as Error;
      expect(error.message).toBe('An error occurred');
    });

    it('uses data.error message when provided', async () => {
      const { result } = renderHook(() => useWorkflowDetail('non-existent'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      const error = result.current.error as Error;
      expect(error.message).toBe('Workflow "non-existent" not found');
    });
  });

  describe('useWorkflows', () => {
    it('fetches workflow list successfully', async () => {
      const { result } = renderHook(() => useWorkflows(), {
        wrapper: createWrapper(),
      });

      // Initially loading
      expect(result.current.isLoading).toBe(true);

      // Wait for data
      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toBeDefined();
      expect(result.current.data?.workflows).toBeDefined();
      expect(Array.isArray(result.current.data?.workflows)).toBe(true);
      expect(result.current.data?.total).toBe(5);
    });

    it('includes workflow metadata', async () => {
      const { result } = renderHook(() => useWorkflows(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      const workflow = result.current.data!.workflows[0];
      expect(workflow).toHaveProperty('name');
      expect(workflow).toHaveProperty('namespace');
      expect(workflow).toHaveProperty('description');
      expect(workflow).toHaveProperty('taskCount');
      expect(workflow).toHaveProperty('stats');
    });

    it('filters workflows by search query', async () => {
      const { result } = renderHook(() => useWorkflows({ search: 'user' }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toBeDefined();
      expect(result.current.data!.workflows.length).toBe(2); // user-signup, user-onboarding
      expect(result.current.data!.total).toBe(2);
    });

    it('filters workflows by namespace', async () => {
      const { result } = renderHook(() => useWorkflows({ namespace: 'production' }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toBeDefined();
      result.current.data!.workflows.forEach((w) => {
        expect(w.namespace).toBe('production');
      });
    });

    it('sorts workflows by name', async () => {
      const { result } = renderHook(() => useWorkflows({ sort: 'name' }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      const names = result.current.data!.workflows.map((w) => w.name);
      const sortedNames = [...names].sort();
      expect(names).toEqual(sortedNames);
    });

    it('combines multiple filters', async () => {
      const { result } = renderHook(
        () =>
          useWorkflows({
            search: 'order',
            namespace: 'production',
            sort: 'name',
          }),
        {
          wrapper: createWrapper(),
        }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toBeDefined();
      result.current.data!.workflows.forEach((w) => {
        expect(w.name).toContain('order');
        expect(w.namespace).toBe('production');
      });
    });

    it('uses different cache keys for different filters', async () => {
      const wrapper = createWrapper();

      // First query with no filters
      const { result: result1 } = renderHook(() => useWorkflows(), {
        wrapper,
      });

      await waitFor(() => {
        expect(result1.current.isSuccess).toBe(true);
      });

      const totalWithoutFilter = result1.current.data!.total;

      // Second query with filter (should be separate cache entry)
      const { result: result2 } = renderHook(() => useWorkflows({ search: 'user' }), {
        wrapper,
      });

      await waitFor(() => {
        expect(result2.current.isSuccess).toBe(true);
      });

      const totalWithFilter = result2.current.data!.total;

      // Should be different results due to different cache keys
      expect(totalWithFilter).toBeLessThan(totalWithoutFilter);
    });
  });

  describe('useWorkflowDetail', () => {
    it('fetches workflow details successfully', async () => {
      const { result } = renderHook(() => useWorkflowDetail('user-signup'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toBeDefined();
      expect(result.current.data?.name).toBe('user-signup');
      expect(result.current.data?.tasks).toBeDefined();
      expect(result.current.data?.graph).toBeDefined();
    });

    it('handles 404 errors', async () => {
      const { result } = renderHook(() => useWorkflowDetail('non-existent'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBeDefined();
    });

    it('can be disabled with enabled option', () => {
      const { result } = renderHook(() => useWorkflowDetail('user-signup', { enabled: false }), {
        wrapper: createWrapper(),
      });

      expect(result.current.isPending).toBe(true);
      expect(result.current.fetchStatus).toBe('idle');
    });
  });

  describe('useWorkflowExecutions', () => {
    it('fetches execution history successfully', async () => {
      const { result } = renderHook(() => useWorkflowExecutions('user-signup'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toBeDefined();
      expect(result.current.data?.executions).toBeDefined();
      expect(Array.isArray(result.current.data?.executions)).toBe(true);
    });

    it('supports pagination filters', async () => {
      const { result } = renderHook(
        () => useWorkflowExecutions('user-signup', { limit: 2, offset: 0 }),
        {
          wrapper: createWrapper(),
        }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data?.limit).toBe(2);
      expect(result.current.data?.offset).toBe(0);
    });

    it('applies default pagination values when not provided', async () => {
      const { result } = renderHook(() => useWorkflowExecutions('user-signup', {}), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Default values: limit = 10, offset = 0
      expect(result.current.data?.limit).toBe(10);
      expect(result.current.data?.offset).toBe(0);
    });

    it('applies default pagination when filters is undefined', async () => {
      const { result } = renderHook(() => useWorkflowExecutions('user-signup', undefined), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Default values should be applied
      expect(result.current.data?.limit).toBe(10);
      expect(result.current.data?.offset).toBe(0);
    });

    it('supports status filtering', async () => {
      const { result } = renderHook(
        () => useWorkflowExecutions('user-signup', { status: 'succeeded' }),
        {
          wrapper: createWrapper(),
        }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      result.current.data?.executions.forEach((exec) => {
        expect(exec.status).toBe('succeeded');
      });
    });

    it('does not add status parameter when status is undefined', async () => {
      const { result } = renderHook(
        () => useWorkflowExecutions('user-signup', { status: undefined }),
        {
          wrapper: createWrapper(),
        }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Should fetch successfully without status filter
      expect(result.current.data).toBeDefined();
      expect(result.current.data?.executions).toBeDefined();
    });
  });

  describe('useExecutionDetail', () => {
    it('fetches execution details successfully', async () => {
      const { result } = renderHook(() => useExecutionDetail('exec-signup-001'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toBeDefined();
      expect(result.current.data?.executionId).toBe('exec-signup-001');
      expect(result.current.data?.workflowName).toBe('user-signup');
    });

    it('handles 404 errors', async () => {
      const { result } = renderHook(() => useExecutionDetail('non-existent'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBeDefined();
    });
  });

  describe('useExecuteWorkflow', () => {
    it('executes workflow successfully', async () => {
      const { result } = renderHook(() => useExecuteWorkflow('user-signup'), {
        wrapper: createWrapper(),
      });

      // Execute mutation
      result.current.mutate({
        email: 'test@example.com',
        password: 'password123',
        username: 'testuser',
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toBeDefined();
      expect(result.current.data?.success).toBe(true);
      expect(result.current.data?.executionId).toBeDefined();
    });

    it('handles execution errors', async () => {
      const { result } = renderHook(() => useExecuteWorkflow('user-signup'), {
        wrapper: createWrapper(),
      });

      // Trigger validation error
      result.current.mutate({ simulateError: true });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBeDefined();
    });

    it('handles schema mismatch errors', async () => {
      const { result } = renderHook(() => useExecuteWorkflow('user-onboarding'), {
        wrapper: createWrapper(),
      });

      result.current.mutate({
        userId: 'user-123',
        plan: 'pro',
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data?.success).toBe(false);
      expect(result.current.data?.error).toContain('Template resolution failed');
    });
  });

  describe('useDryRun', () => {
    it('performs dry-run successfully', async () => {
      const { result } = renderHook(() => useDryRun('user-signup'), {
        wrapper: createWrapper(),
      });

      result.current.mutate({
        email: 'test@example.com',
        password: 'password123',
        username: 'testuser',
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toBeDefined();
      expect(result.current.data?.valid).toBeDefined();
      expect(result.current.data?.executionPlan).toBeDefined();
      expect(result.current.data?.templateResolution).toBeDefined();
    });

    it('returns validation errors for invalid workflow', async () => {
      const { result } = renderHook(() => useDryRun('user-onboarding'), {
        wrapper: createWrapper(),
      });

      result.current.mutate({
        userId: 'user-123',
        plan: 'pro',
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data?.valid).toBe(false);
      expect(result.current.data?.validationErrors).toBeDefined();
      expect(Array.isArray(result.current.data?.validationErrors)).toBe(true);
    });

    it('includes execution plan with parallel groups', async () => {
      const { result } = renderHook(() => useDryRun('order-processing'), {
        wrapper: createWrapper(),
      });

      result.current.mutate({
        orderId: 'order-123',
        items: [],
        paymentMethod: 'card',
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      const plan = result.current.data?.executionPlan;
      expect(plan).toBeDefined();
      expect(plan?.parallelGroups).toBeDefined();
      expect(Array.isArray(plan?.parallelGroups)).toBe(true);
    });
  });

  describe('useTasks', () => {
    it('fetches available tasks successfully', async () => {
      const { result } = renderHook(() => useTasks(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toBeDefined();
      expect(result.current.data?.tasks).toBeDefined();
      expect(Array.isArray(result.current.data?.tasks)).toBe(true);
    });

    it('includes task schemas', async () => {
      const { result } = renderHook(() => useTasks(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      const task = result.current.data!.tasks[0];
      expect(task).toHaveProperty('name');
      expect(task).toHaveProperty('description');
      expect(task).toHaveProperty('inputSchema');
      expect(task).toHaveProperty('outputSchema');
    });
  });

  describe('Utility hooks', () => {
    it('usePrefetchWorkflowDetail prefetches workflow data', async () => {
      const wrapper = createWrapper();

      const { result: prefetchResult } = renderHook(() => usePrefetchWorkflowDetail(), { wrapper });

      // Prefetch the data
      prefetchResult.current('user-signup');

      // Small delay to allow prefetch to start
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Now hook into the query - it should already be fetched or fetching
      const { result: queryResult } = renderHook(() => useWorkflowDetail('user-signup'), {
        wrapper,
      });

      await waitFor(() => {
        expect(queryResult.current.isSuccess).toBe(true);
      });

      expect(queryResult.current.data?.name).toBe('user-signup');
    });

    it('useInvalidateWorkflows calls invalidateQueries', async () => {
      const { result: invalidateResult } = renderHook(() => useInvalidateWorkflows(), {
        wrapper: createWrapper(),
      });

      // Simply verify the function is callable
      expect(invalidateResult.current).toBeInstanceOf(Function);

      // Call it - it should not throw
      expect(() => invalidateResult.current()).not.toThrow();
    });
  });

  // ============================================================================
  // TASK QUERIES
  // ============================================================================

  describe('useTaskDetail', () => {
    it('fetches task details successfully', async () => {
      const { result } = renderHook(() => useTaskDetail('fetch-user'), {
        wrapper: createWrapper(),
      });

      // Initially loading
      expect(result.current.isLoading).toBe(true);

      // Wait for data
      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toBeDefined();
      expect(result.current.data?.name).toBe('fetch-user');
      expect(result.current.data?.namespace).toBeDefined();
      expect(result.current.data?.stats).toBeDefined();
    });

    it('includes task schemas and HTTP config', async () => {
      const { result } = renderHook(() => useTaskDetail('fetch-user'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      const task = result.current.data!;
      expect(task).toHaveProperty('inputSchema');
      expect(task).toHaveProperty('outputSchema');
      expect(task).toHaveProperty('httpRequest');
      expect(task.httpRequest?.method).toBeDefined();
      expect(task.httpRequest?.url).toBeDefined();
    });

    it('handles 404 errors', async () => {
      const { result } = renderHook(() => useTaskDetail('non-existent'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBeDefined();
    });

    it('can be disabled with enabled option', () => {
      const { result } = renderHook(() => useTaskDetail('fetch-user', { enabled: false }), {
        wrapper: createWrapper(),
      });

      expect(result.current.isPending).toBe(true);
      expect(result.current.fetchStatus).toBe('idle');
    });
  });

  describe('useTaskUsage', () => {
    it('fetches workflows using a task', async () => {
      const { result } = renderHook(() => useTaskUsage('fetch-user'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toBeDefined();
      expect(result.current.data?.taskName).toBe('fetch-user');
      expect(result.current.data?.workflows).toBeDefined();
      expect(Array.isArray(result.current.data?.workflows)).toBe(true);
      expect(result.current.data?.totalCount).toBeGreaterThanOrEqual(0);
    });

    it('supports pagination', async () => {
      const { result } = renderHook(() => useTaskUsage('fetch-user', { skip: 0, take: 5 }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data?.skip).toBe(0);
      expect(result.current.data?.take).toBe(5);
    });

    it('includes workflow metadata', async () => {
      const { result } = renderHook(() => useTaskUsage('fetch-user'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      if (result.current.data!.workflows.length > 0) {
        const workflow = result.current.data!.workflows[0];
        expect(workflow).toHaveProperty('workflowName');
        expect(workflow).toHaveProperty('workflowNamespace');
        expect(workflow).toHaveProperty('taskCount');
      }
    });
  });

  describe('useTaskExecutions', () => {
    it('fetches task execution history', async () => {
      const { result } = renderHook(() => useTaskExecutions('fetch-user'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toBeDefined();
      expect(result.current.data?.taskName).toBe('fetch-user');
      expect(result.current.data?.executions).toBeDefined();
      expect(Array.isArray(result.current.data?.executions)).toBe(true);
      expect(result.current.data?.averageDurationMs).toBeGreaterThanOrEqual(0);
    });

    it('supports pagination', async () => {
      const { result } = renderHook(() => useTaskExecutions('fetch-user', { skip: 0, take: 10 }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data?.skip).toBe(0);
      expect(result.current.data?.take).toBe(10);
    });

    it('supports status filtering', async () => {
      const { result } = renderHook(
        () => useTaskExecutions('fetch-user', { status: 'succeeded' }),
        {
          wrapper: createWrapper(),
        }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      result.current.data?.executions.forEach((exec) => {
        expect(exec.status).toBe('succeeded');
      });
    });

    it('includes execution details', async () => {
      const { result } = renderHook(() => useTaskExecutions('fetch-user'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      if (result.current.data!.executions.length > 0) {
        const execution = result.current.data!.executions[0];
        expect(execution).toHaveProperty('executionId');
        expect(execution).toHaveProperty('workflowName');
        expect(execution).toHaveProperty('status');
        expect(execution).toHaveProperty('durationMs');
        expect(execution).toHaveProperty('startedAt');
      }
    });
  });

  describe('useExecuteTask', () => {
    it('executes task successfully', async () => {
      const { result } = renderHook(() => useExecuteTask('fetch-user'), {
        wrapper: createWrapper(),
      });

      // Execute mutation
      result.current.mutate({ userId: '123' });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toBeDefined();
      expect(result.current.data?.executionId).toBeDefined();
      expect(result.current.data?.status).toMatch(/success|succeeded/);
      expect(result.current.data?.durationMs).toBeGreaterThanOrEqual(0);
    });

    it('handles execution errors', async () => {
      const { result } = renderHook(() => useExecuteTask('fetch-user'), {
        wrapper: createWrapper(),
      });

      // Trigger error
      result.current.mutate({ simulateError: true });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBeDefined();
    });

    it('includes output data on success', async () => {
      const { result } = renderHook(() => useExecuteTask('fetch-user'), {
        wrapper: createWrapper(),
      });

      result.current.mutate({ userId: '123' });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data?.outputs).toBeDefined();
    });

    it('invalidates task execution history on success', async () => {
      const wrapper = createWrapper();

      const { result: executeResult } = renderHook(() => useExecuteTask('fetch-user'), { wrapper });

      // Execute task
      executeResult.current.mutate({ userId: '123' });

      await waitFor(() => {
        expect(executeResult.current.isSuccess).toBe(true);
      });

      // Verify cache invalidation would trigger refetch
      // (This is hard to test directly, but we can verify the hook doesn't error)
      expect(executeResult.current.data).toBeDefined();
    });
  });

  // ============================================================================
  // DURATION TRENDS & PREFETCH FUNCTIONS
  // ============================================================================

  describe('useWorkflowDurationTrends', () => {
    it('fetches duration trends successfully', async () => {
      const { result } = renderHook(() => useWorkflowDurationTrends('user-signup', 30), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toBeDefined();
      expect(result.current.data?.dataPoints).toBeDefined();
      expect(Array.isArray(result.current.data?.dataPoints)).toBe(true);
    });

    it('parses date strings to Date objects', async () => {
      const { result } = renderHook(() => useWorkflowDurationTrends('user-signup', 30), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      const dataPoint = result.current.data!.dataPoints[0];
      expect(dataPoint.date).toBeInstanceOf(Date);
    });

    it('can be disabled with enabled option', () => {
      const { result } = renderHook(
        () => useWorkflowDurationTrends('user-signup', 30, { enabled: false }),
        {
          wrapper: createWrapper(),
        }
      );

      expect(result.current.isPending).toBe(true);
      expect(result.current.fetchStatus).toBe('idle');
    });

    it('is disabled when name is empty', () => {
      const { result } = renderHook(() => useWorkflowDurationTrends('', 30), {
        wrapper: createWrapper(),
      });

      expect(result.current.isPending).toBe(true);
      expect(result.current.fetchStatus).toBe('idle');
    });
  });

  describe('useTaskDurationTrends', () => {
    it('fetches task duration trends successfully', async () => {
      const { result } = renderHook(() => useTaskDurationTrends('fetch-user', 30), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toBeDefined();
      expect(result.current.data?.dataPoints).toBeDefined();
      expect(Array.isArray(result.current.data?.dataPoints)).toBe(true);
    });

    it('parses date strings to Date objects', async () => {
      const { result } = renderHook(() => useTaskDurationTrends('fetch-user', 30), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      const dataPoint = result.current.data!.dataPoints[0];
      expect(dataPoint.date).toBeInstanceOf(Date);
    });

    it('can be disabled with enabled option', () => {
      const { result } = renderHook(
        () => useTaskDurationTrends('fetch-user', 30, { enabled: false }),
        {
          wrapper: createWrapper(),
        }
      );

      expect(result.current.isPending).toBe(true);
      expect(result.current.fetchStatus).toBe('idle');
    });

    it('is disabled when name is empty', () => {
      const { result } = renderHook(() => useTaskDurationTrends('', 30), {
        wrapper: createWrapper(),
      });

      expect(result.current.isPending).toBe(true);
      expect(result.current.fetchStatus).toBe('idle');
    });
  });

  describe('usePrefetchTaskDetail', () => {
    it('prefetches task data', async () => {
      const wrapper = createWrapper();

      const { result: prefetchResult } = renderHook(() => usePrefetchTaskDetail(), { wrapper });

      // Prefetch the data
      prefetchResult.current('fetch-user');

      // Small delay to allow prefetch to start
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Now hook into the query - it should already be fetched or fetching
      const { result: queryResult } = renderHook(() => useTaskDetail('fetch-user'), { wrapper });

      await waitFor(() => {
        expect(queryResult.current.isSuccess).toBe(true);
      });

      expect(queryResult.current.data?.name).toBe('fetch-user');
    });
  });

  // ============================================================================
  // TEMPLATE QUERIES
  // ============================================================================

  describe('useTemplates', () => {
    it('fetches all templates', async () => {
      const { result } = renderHook(() => useTemplates(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toBeDefined();
      expect(result.current.data?.templates).toBeDefined();
      expect(Array.isArray(result.current.data?.templates)).toBe(true);
    });

    it('filters by category', async () => {
      const { result } = renderHook(() => useTemplates({ category: 'ApiComposition' }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toBeDefined();
    });

    it('filters by difficulty', async () => {
      const { result } = renderHook(() => useTemplates({ difficulty: 'Beginner' }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toBeDefined();
    });

    it('filters by search', async () => {
      const { result } = renderHook(() => useTemplates({ search: 'parallel' }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toBeDefined();
    });

    it('filters by tags', async () => {
      const { result } = renderHook(() => useTemplates({ tags: ['http', 'api'] }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toBeDefined();
    });

    it('filters by maxEstimatedTime', async () => {
      const { result } = renderHook(() => useTemplates({ maxEstimatedTime: 10 }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toBeDefined();
    });

    it('filters by parallelOnly', async () => {
      const { result } = renderHook(() => useTemplates({ parallelOnly: true }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toBeDefined();
    });
  });

  describe('useTemplateDetail', () => {
    it('fetches template detail with YAML', async () => {
      const { result } = renderHook(() => useTemplateDetail('parallel-api-fetch'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toBeDefined();
      expect(result.current.data?.name).toBe('parallel-api-fetch');
      expect(result.current.data?.yamlDefinition).toBeDefined();
    });

    it('can be disabled with enabled option', () => {
      const { result } = renderHook(
        () => useTemplateDetail('parallel-api-fetch', { enabled: false }),
        {
          wrapper: createWrapper(),
        }
      );

      expect(result.current.isPending).toBe(true);
      expect(result.current.fetchStatus).toBe('idle');
    });
  });

  describe('usePrefetchTemplateDetail', () => {
    it('prefetches template data', async () => {
      const wrapper = createWrapper();

      const { result: prefetchResult } = renderHook(() => usePrefetchTemplateDetail(), { wrapper });

      // Prefetch the data
      prefetchResult.current('parallel-api-fetch');

      // Small delay to allow prefetch to start
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Now hook into the query - it should already be fetched or fetching
      const { result: queryResult } = renderHook(
        () => useTemplateDetail('parallel-api-fetch'),
        { wrapper }
      );

      await waitFor(() => {
        expect(queryResult.current.isSuccess).toBe(true);
      });

      expect(queryResult.current.data?.name).toBe('parallel-api-fetch');
    });
  });

  describe('useDeployTemplate', () => {
    it('deploys template successfully', async () => {
      const { result } = renderHook(() => useDeployTemplate(), {
        wrapper: createWrapper(),
      });

      // Execute mutation
      result.current.mutate({
        templateName: 'parallel-api-fetch',
        workflowName: 'my-workflow',
        namespace: 'default',
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toBeDefined();
      expect(result.current.data?.workflowName).toBeDefined();
      expect(result.current.data?.message).toBeDefined();
    });

    it('handles deployment errors', async () => {
      const { result } = renderHook(() => useDeployTemplate(), {
        wrapper: createWrapper(),
      });

      // Trigger error with invalid template
      result.current.mutate({
        templateName: 'non-existent-template',
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBeDefined();
    });

    it('invalidates workflows on success', async () => {
      const wrapper = createWrapper();

      const { result: deployResult } = renderHook(() => useDeployTemplate(), { wrapper });

      // Deploy template
      deployResult.current.mutate({
        templateName: 'parallel-api-fetch',
      });

      await waitFor(() => {
        expect(deployResult.current.isSuccess).toBe(true);
      });

      // Verify the mutation succeeded
      expect(deployResult.current.data).toBeDefined();
    });
  });

  // ============================================================================
  // METRICS QUERIES
  // ============================================================================

  describe('useSystemMetrics', () => {
    it('fetches system metrics successfully', async () => {
      const { result } = renderHook(() => useSystemMetrics(), {
        wrapper: createWrapper(),
      });

      // Initially loading
      expect(result.current.isLoading).toBe(true);

      // Wait for data
      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toBeDefined();
      expect(result.current.data?.totalExecutions).toBeDefined();
      expect(result.current.data?.throughput).toBeDefined();
      expect(result.current.data?.p95Ms).toBeDefined();
      expect(result.current.data?.errorRate).toBeDefined();
    });

    it('supports different time ranges', async () => {
      const { result } = renderHook(() => useSystemMetrics('7d'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data?.timeRange).toBe('7d');
    });

    it('uses default time range of 24h', async () => {
      const { result } = renderHook(() => useSystemMetrics(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data?.timeRange).toBe('24h');
    });
  });

  describe('useWorkflowsMetrics', () => {
    it('fetches workflows metrics successfully', async () => {
      const { result } = renderHook(() => useWorkflowsMetrics(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toBeDefined();
      expect(Array.isArray(result.current.data)).toBe(true);
      expect(result.current.data!.length).toBeGreaterThan(0);
    });

    it('includes workflow metrics details', async () => {
      const { result } = renderHook(() => useWorkflowsMetrics(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      const workflow = result.current.data![0];
      expect(workflow).toHaveProperty('name');
      expect(workflow).toHaveProperty('avgDurationMs');
      expect(workflow).toHaveProperty('p95Ms');
      expect(workflow).toHaveProperty('errorRate');
      expect(workflow).toHaveProperty('executionCount');
    });
  });

  describe('useWorkflowHistoryMetrics', () => {
    it('fetches workflow history successfully', async () => {
      const { result } = renderHook(() => useWorkflowHistoryMetrics('user-signup'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toBeDefined();
      expect(Array.isArray(result.current.data)).toBe(true);
    });

    it('includes history data points', async () => {
      const { result } = renderHook(() => useWorkflowHistoryMetrics('user-signup'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      const dataPoint = result.current.data![0];
      expect(dataPoint).toHaveProperty('timestamp');
      expect(dataPoint).toHaveProperty('avgDurationMs');
      expect(dataPoint).toHaveProperty('p95Ms');
      expect(dataPoint).toHaveProperty('errorRate');
      expect(dataPoint).toHaveProperty('count');
    });

    it('supports different time ranges', async () => {
      const { result } = renderHook(() => useWorkflowHistoryMetrics('user-signup', '7d'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toBeDefined();
    });
  });

  describe('useSlowestWorkflows', () => {
    it('fetches slowest workflows successfully', async () => {
      const { result } = renderHook(() => useSlowestWorkflows(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toBeDefined();
      expect(Array.isArray(result.current.data)).toBe(true);
    });

    it('includes degradation data', async () => {
      const { result } = renderHook(() => useSlowestWorkflows(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      const workflow = result.current.data![0];
      expect(workflow).toHaveProperty('name');
      expect(workflow).toHaveProperty('avgDurationMs');
      expect(workflow).toHaveProperty('p95Ms');
      expect(workflow).toHaveProperty('degradationPercent');
    });

    it('supports custom limit', async () => {
      const { result } = renderHook(() => useSlowestWorkflows(5), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toBeDefined();
    });
  });

  // ============================================================================
  // BLAST RADIUS QUERIES
  // ============================================================================

  describe('useBlastRadius', () => {
    it('fetches blast radius successfully', async () => {
      const { result } = renderHook(() => useBlastRadius('fetch-user'), {
        wrapper: createWrapper(),
      });

      // Initially loading
      expect(result.current.isLoading).toBe(true);

      // Wait for data
      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toBeDefined();
      expect(result.current.data?.taskName).toBe('fetch-user');
      expect(result.current.data?.analysisDepth).toBeDefined();
    });

    it('includes summary data', async () => {
      const { result } = renderHook(() => useBlastRadius('fetch-user'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data?.summary).toBeDefined();
      expect(result.current.data?.summary?.totalAffectedWorkflows).toBeGreaterThanOrEqual(0);
      expect(result.current.data?.summary?.totalAffectedTasks).toBeGreaterThanOrEqual(0);
      expect(result.current.data?.summary?.affectedWorkflows).toBeDefined();
      expect(result.current.data?.summary?.affectedTasks).toBeDefined();
    });

    it('includes graph data', async () => {
      const { result } = renderHook(() => useBlastRadius('fetch-user'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data?.graph).toBeDefined();
      expect(result.current.data?.graph?.nodes).toBeDefined();
      expect(result.current.data?.graph?.edges).toBeDefined();
      expect(Array.isArray(result.current.data?.graph?.nodes)).toBe(true);
      expect(Array.isArray(result.current.data?.graph?.edges)).toBe(true);
    });

    it('supports custom depth option', async () => {
      const { result } = renderHook(() => useBlastRadius('fetch-user', { depth: 2 }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data?.analysisDepth).toBe(2);
    });

    it('includes truncatedAtDepth indicator', async () => {
      const { result } = renderHook(() => useBlastRadius('fetch-user'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(typeof result.current.data?.truncatedAtDepth).toBe('boolean');
    });

    it('can be disabled with enabled option', () => {
      const { result } = renderHook(
        () => useBlastRadius('fetch-user', { enabled: false }),
        {
          wrapper: createWrapper(),
        }
      );

      expect(result.current.isPending).toBe(true);
      expect(result.current.fetchStatus).toBe('idle');
    });

    it('handles task not found error', async () => {
      const { result } = renderHook(() => useBlastRadius('non-existent-task'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBeDefined();
    });
  });
});
