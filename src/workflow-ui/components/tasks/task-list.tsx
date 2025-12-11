'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useTasks, useLabels } from '@/lib/api/queries';
import type { Task } from '@/types/task';
import { TaskFilters } from './task-filters';
import { TaskCard } from './task-card';
import { TaskCardSkeleton } from './task-card-skeleton';
import { EmptyState } from './empty-state';
import { Pagination } from '@/components/ui/pagination';
import { formatRelativeTime } from '@/lib/utils';

interface TaskListProps {
  defaultFilters?: {
    search?: string;
    namespace?: string;
    sort?: string;
  };
}

const DEFAULT_PAGE_SIZE = 25;

export function TaskList({ defaultFilters }: TaskListProps) {
  const router = useRouter();
  const [filters, setFilters] = useState({
    search: defaultFilters?.search || '',
    namespace: defaultFilters?.namespace,
    sort: defaultFilters?.sort || 'name',
    tags: [] as string[],
    category: undefined as string | undefined,
  });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [filterResetKey, setFilterResetKey] = useState(0);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Fetch available labels for filter dropdowns
  const { data: labelsData } = useLabels();

  // Debounce search to avoid too many API calls
  const [debouncedSearch, setDebouncedSearch] = useState(filters.search);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(filters.search);
      setPage(1); // Reset to first page on search
    }, 300);
    return () => clearTimeout(timer);
  }, [filters.search]);

  // Reset page when namespace changes
  useEffect(() => {
    setPage(1);
  }, [filters.namespace]);

  const skip = (page - 1) * pageSize;

  const { data, isLoading, error, dataUpdatedAt, isFetching } = useTasks({
    search: debouncedSearch || undefined,
    namespace: filters.namespace || undefined,
    skip,
    take: pageSize,
  });

  const lastUpdated = dataUpdatedAt ? formatRelativeTime(dataUpdatedAt) : null;

  // Extract tasks from API response
  const tasks: Task[] = useMemo(() => {
    if (!data?.tasks) return [];
    return data.tasks.map((task: any) => ({
      name: task.name,
      namespace: task.namespace || 'default',
      description: task.description || '',
      endpoint: task.endpoint || '',
      inputSchemaPreview: task.inputSchemaPreview,
      stats: {
        usedByWorkflows: task.stats?.usedByWorkflows || 0,
        totalExecutions: task.stats?.totalExecutions || 0,
        avgDurationMs: task.stats?.avgDurationMs || 0,
        successRate: task.stats?.successRate || 0,
        lastExecuted: task.stats?.lastExecuted,
      },
    }));
  }, [data?.tasks]);

  // Client-side sorting (backend doesn't support sort parameter for tasks)
  const sortedTasks = useMemo(() => {
    return [...tasks].sort((a, b) => {
      switch (filters.sort) {
        case 'success-rate':
          return b.stats.successRate - a.stats.successRate;
        case 'executions':
          return b.stats.totalExecutions - a.stats.totalExecutions;
        case 'usage':
          return b.stats.usedByWorkflows - a.stats.usedByWorkflows;
        case 'name':
        default:
          return a.name.localeCompare(b.name);
      }
    });
  }, [tasks, filters.sort]);

  const total = data?.total || 0;
  const totalPages = Math.ceil(total / pageSize);

  // For namespace filter - need all namespaces from a separate call
  // For simplicity, we'll extract from current page
  const namespaces = useMemo(() => {
    if (!data?.tasks) return [];
    return Array.from(new Set(data.tasks.map((t: any) => t.namespace || 'default'))).sort();
  }, [data?.tasks]);

  // Calculate active filter count (excluding default sort)
  const activeFilterCount =
    (filters.search ? 1 : 0) +
    (filters.namespace ? 1 : 0) +
    (filters.sort && filters.sort !== 'name' ? 1 : 0) +
    filters.tags.length +
    (filters.category ? 1 : 0);

  const hasActiveFilters = activeFilterCount > 0;

  const handleCardClick = (taskName: string) => {
    router.push(`/tasks/${taskName}`);
  };

  // Handle clicking a tag on a task card - add to filters
  const handleTagClick = useCallback((tag: string) => {
    setFilters((prev) => ({
      ...prev,
      tags: prev.tags.includes(tag) ? prev.tags : [...prev.tags, tag],
    }));
    setPage(1);
  }, []);

  // Handle clicking a category on a task card - set as filter
  const handleCategoryClick = useCallback((category: string) => {
    setFilters((prev) => ({
      ...prev,
      category,
    }));
    setPage(1);
  }, []);

  const handleClearFilters = useCallback(() => {
    setFilters({
      search: '',
      namespace: undefined,
      sort: 'name',
      tags: [],
      category: undefined,
    });
    setPage(1);
    // Force TaskFilters to reset by changing key
    setFilterResetKey((prev) => prev + 1);
  }, []);

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    // Scroll to top of list
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    setPage(1); // Reset to first page
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ignore shortcuts when typing in input/textarea/select
      const target = event.target as HTMLElement;
      const isInputElement =
        target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT';

      // "/" to focus search (unless already in an input)
      if (event.key === '/' && !isInputElement) {
        event.preventDefault();
        searchInputRef.current?.focus();
      }

      // "Escape" to clear filters
      if (event.key === 'Escape') {
        event.preventDefault();
        handleClearFilters();
        // Blur any focused element
        if (document.activeElement instanceof HTMLElement) {
          document.activeElement.blur();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleClearFilters]);

  if (error) {
    return (
      <div className="p-8">
        <EmptyState
          title="Error loading tasks"
          description="Failed to load tasks. Please try again later."
        />
      </div>
    );
  }

  return (
    <div>
      {/* Keyboard Navigation Hints */}
      <div className="theme-hint mb-4 px-4 py-2 text-xs">
        <span className="theme-hint-label">Keyboard shortcuts:</span>{' '}
        <kbd className="theme-kbd">/</kbd>{' '}
        <span className="theme-hint-text">to search,</span>{' '}
        <kbd className="theme-kbd">Esc</kbd>{' '}
        <span className="theme-hint-text">to clear filters</span>
      </div>

      {/* Filters */}
      <TaskFilters
        key={filterResetKey}
        namespaces={namespaces}
        availableTags={labelsData?.tags.map((t) => t.value) ?? []}
        availableCategories={labelsData?.categories.map((c) => c.value) ?? []}
        onFilterChange={setFilters}
        defaultValues={filters}
        isLoading={isLoading}
        searchInputRef={searchInputRef}
      />

      {/* Clear Filters Button */}
      {hasActiveFilters && (
        <div className="mb-4">
          <button
            onClick={handleClearFilters}
            className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm transition-all duration-150 ease-in-out hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            aria-label="Clear filters"
          >
            Clear filters
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-xs font-semibold text-blue-700">
              {activeFilterCount}
            </span>
          </button>
        </div>
      )}

      {/* Task Count */}
      {!isLoading && total > 0 && (
        <div
          className="mb-4 text-sm text-gray-600"
          role="status"
          aria-live="polite"
          aria-atomic="true"
        >
          {isFetching ? (
            <span className="text-gray-400">Loading...</span>
          ) : (
            <>
              Showing {sortedTasks.length} of {total} {total === 1 ? 'task' : 'tasks'}
            </>
          )}
        </div>
      )}

      {/* Last Updated Timestamp */}
      {!isLoading && lastUpdated && (
        <div className="mb-4 text-sm text-gray-500">Updated {lastUpdated}</div>
      )}

      {/* Loading State - Skeleton Cards */}
      {isLoading && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: pageSize > 8 ? 8 : pageSize }).map((_, index) => (
            <TaskCardSkeleton key={index} />
          ))}
        </div>
      )}

      {/* Empty State - No Tasks */}
      {!isLoading && sortedTasks.length === 0 && !filters.search && !filters.namespace && (
        <EmptyState title="No tasks yet" description="Get started by creating your first task." />
      )}

      {/* Empty State - No Results */}
      {!isLoading && sortedTasks.length === 0 && (filters.search || filters.namespace) && (
        <div role="status" aria-live="polite">
          <EmptyState
            title="No tasks found"
            description="Try adjusting your filters to find what you're looking for."
          />
        </div>
      )}

      {/* Task Grid */}
      {!isLoading && sortedTasks.length > 0 && (
        <>
          <div className={`grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 ${isFetching ? 'opacity-60' : ''}`}>
            {sortedTasks.map((task) => (
              <TaskCard
                key={task.name}
                task={task}
                onClick={() => handleCardClick(task.name)}
                onTagClick={handleTagClick}
                onCategoryClick={handleCategoryClick}
              />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              totalItems={total}
              pageSize={pageSize}
              onPageChange={handlePageChange}
              onPageSizeChange={handlePageSizeChange}
              isLoading={isFetching}
            />
          )}
        </>
      )}
    </div>
  );
}
