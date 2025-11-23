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
      const { result } = renderHook(
        () => useWorkflows({ namespace: 'production' }),
        {
          wrapper: createWrapper(),
        }
      );

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
      const { result: result2 } = renderHook(
        () => useWorkflows({ search: 'user' }),
        {
          wrapper,
        }
      );

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
      const { result } = renderHook(
        () => useWorkflowDetail('user-signup', { enabled: false }),
        {
          wrapper: createWrapper(),
        }
      );

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
  });

  describe('useExecutionDetail', () => {
    it('fetches execution details successfully', async () => {
      const { result } = renderHook(
        () => useExecutionDetail('exec-signup-001'),
        {
          wrapper: createWrapper(),
        }
      );

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

      const { result: prefetchResult } = renderHook(
        () => usePrefetchWorkflowDetail(),
        { wrapper }
      );

      // Prefetch the data
      prefetchResult.current('user-signup');

      // Small delay to allow prefetch to start
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Now hook into the query - it should already be fetched or fetching
      const { result: queryResult } = renderHook(
        () => useWorkflowDetail('user-signup'),
        { wrapper }
      );

      await waitFor(() => {
        expect(queryResult.current.isSuccess).toBe(true);
      });

      expect(queryResult.current.data?.name).toBe('user-signup');
    });

    it('useInvalidateWorkflows calls invalidateQueries', async () => {
      const { result: invalidateResult } = renderHook(
        () => useInvalidateWorkflows(),
        { wrapper: createWrapper() }
      );

      // Simply verify the function is callable
      expect(invalidateResult.current).toBeInstanceOf(Function);

      // Call it - it should not throw
      expect(() => invalidateResult.current()).not.toThrow();
    });
  });
});
