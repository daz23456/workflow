/**
 * Unit tests for Label API hooks
 * Stage 43.6: Label UI-API Integration
 *
 * TDD: Tests for label query and mutation hooks
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import type { ReactNode } from 'react';
import type {
  LabelListResponse,
  LabelStatsResponse,
  UpdateLabelsResponse,
  BulkLabelsResponse,
} from '@/types/label';
import { server } from '../mocks/server';
import {
  useLabels,
  useLabelStats,
  useUpdateWorkflowLabels,
  useUpdateTaskLabels,
  useBulkUpdateWorkflowLabels,
  useBulkUpdateTaskLabels,
} from './queries';

const API_BASE = 'http://localhost:5001/api/v1';

// Mock data
const mockLabelList: LabelListResponse = {
  tags: [
    { value: 'production', workflowCount: 5, taskCount: 3 },
    { value: 'beta', workflowCount: 2, taskCount: 1 },
  ],
  categories: [
    { value: 'payments', workflowCount: 3 },
    { value: 'orders', workflowCount: 2 },
  ],
};

const mockLabelStats: LabelStatsResponse = {
  totalTags: 10,
  totalCategories: 5,
  workflowsWithTags: 8,
  workflowsWithCategories: 6,
  tasksWithTags: 4,
  tasksWithCategories: 3,
  topTags: [{ value: 'production', workflowCount: 5, taskCount: 3 }],
  topCategories: [{ value: 'payments', workflowCount: 3 }],
};

const mockUpdateResponse: UpdateLabelsResponse = {
  success: true,
  entityName: 'test-workflow',
  currentTags: ['production', 'new-tag'],
  currentCategories: ['payments'],
  message: 'Labels updated successfully',
};

const mockBulkResponse: BulkLabelsResponse = {
  success: true,
  affectedEntities: 3,
  isDryRun: false,
  changes: [
    {
      name: 'workflow-1',
      addedTags: ['new-tag'],
      removedTags: [],
      addedCategories: [],
      removedCategories: [],
    },
  ],
  message: 'Bulk update completed',
};

// Label API handlers
const labelHandlers = [
  http.get(`${API_BASE}/labels`, () => {
    return HttpResponse.json(mockLabelList);
  }),
  http.get(`${API_BASE}/labels/stats`, () => {
    return HttpResponse.json(mockLabelStats);
  }),
  http.patch(`${API_BASE}/workflows/:name/labels`, () => {
    return HttpResponse.json(mockUpdateResponse);
  }),
  http.patch(`${API_BASE}/tasks/:name/labels`, () => {
    return HttpResponse.json({
      ...mockUpdateResponse,
      entityName: 'test-task',
    });
  }),
  http.post(`${API_BASE}/workflows/labels/bulk`, () => {
    return HttpResponse.json(mockBulkResponse);
  }),
  http.post(`${API_BASE}/tasks/labels/bulk`, () => {
    return HttpResponse.json(mockBulkResponse);
  }),
];

// Test wrapper with QueryClient
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  });

  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

describe('Label API Hooks', () => {
  beforeEach(() => {
    // Add label handlers to the shared server
    server.use(...labelHandlers);
  });

  afterEach(() => {
    server.resetHandlers();
  });

  describe('useLabels', () => {
    it('should fetch all available labels', async () => {
      const { result } = renderHook(() => useLabels(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual(mockLabelList);
      expect(result.current.data?.tags).toHaveLength(2);
      expect(result.current.data?.categories).toHaveLength(2);
    });

    it('should return tag and category counts', async () => {
      const { result } = renderHook(() => useLabels(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      const productionTag = result.current.data?.tags.find(
        (t) => t.value === 'production'
      );
      expect(productionTag?.workflowCount).toBe(5);
      expect(productionTag?.taskCount).toBe(3);
    });
  });

  describe('useLabelStats', () => {
    it('should fetch label statistics', async () => {
      const { result } = renderHook(() => useLabelStats(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data?.totalTags).toBe(10);
      expect(result.current.data?.totalCategories).toBe(5);
      expect(result.current.data?.workflowsWithTags).toBe(8);
    });

    it('should return top tags and categories', async () => {
      const { result } = renderHook(() => useLabelStats(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data?.topTags).toHaveLength(1);
      expect(result.current.data?.topCategories).toHaveLength(1);
    });
  });

  describe('useUpdateWorkflowLabels', () => {
    it('should update workflow labels', async () => {
      const { result } = renderHook(() => useUpdateWorkflowLabels(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({
        workflowName: 'test-workflow',
        request: { addTags: ['new-tag'] },
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data?.success).toBe(true);
      expect(result.current.data?.currentTags).toContain('new-tag');
    });

    it('should handle add and remove tags', async () => {
      const { result } = renderHook(() => useUpdateWorkflowLabels(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({
        workflowName: 'test-workflow',
        request: {
          addTags: ['new-tag'],
          removeTags: ['old-tag'],
          addCategories: ['payments'],
        },
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data?.success).toBe(true);
    });
  });

  describe('useUpdateTaskLabels', () => {
    it('should update task labels', async () => {
      const { result } = renderHook(() => useUpdateTaskLabels(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({
        taskName: 'test-task',
        request: { addTags: ['new-tag'] },
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data?.success).toBe(true);
      expect(result.current.data?.entityName).toBe('test-task');
    });
  });

  describe('useBulkUpdateWorkflowLabels', () => {
    it('should bulk update workflow labels', async () => {
      const { result } = renderHook(() => useBulkUpdateWorkflowLabels(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({
        entityNames: ['workflow-1', 'workflow-2', 'workflow-3'],
        addTags: ['new-tag'],
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data?.success).toBe(true);
      expect(result.current.data?.affectedEntities).toBe(3);
    });

    it('should support dry run mode', async () => {
      server.use(
        http.post(`${API_BASE}/workflows/labels/bulk`, () => {
          return HttpResponse.json({
            ...mockBulkResponse,
            isDryRun: true,
          });
        })
      );

      const { result } = renderHook(() => useBulkUpdateWorkflowLabels(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({
        entityNames: ['workflow-1'],
        addTags: ['test'],
        dryRun: true,
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data?.isDryRun).toBe(true);
    });
  });

  describe('useBulkUpdateTaskLabels', () => {
    it('should bulk update task labels', async () => {
      const { result } = renderHook(() => useBulkUpdateTaskLabels(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({
        entityNames: ['task-1', 'task-2'],
        addTags: ['new-tag'],
        removeCategories: ['old-category'],
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data?.success).toBe(true);
    });
  });

  describe('Error handling', () => {
    it('should handle API errors gracefully', async () => {
      server.use(
        http.get(`${API_BASE}/labels`, () => {
          return HttpResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
          );
        })
      );

      const { result } = renderHook(() => useLabels(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(result.current.error).toBeDefined();
    });

    it('should handle network failures', async () => {
      server.use(
        http.get(`${API_BASE}/labels`, () => {
          return HttpResponse.error();
        })
      );

      const { result } = renderHook(() => useLabels(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });
});
