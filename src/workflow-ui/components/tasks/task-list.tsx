'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useTasks } from '@/lib/api/queries';
import type { Task } from '@/types/task';
import { TaskFilters } from './task-filters';
import { TaskCard } from './task-card';
import { TaskCardSkeleton } from './task-card-skeleton';
import { EmptyState } from './empty-state';
import { formatRelativeTime } from '@/lib/utils';

interface TaskListProps {
  defaultFilters?: {
    search?: string;
    namespace?: string;
    sort?: string;
  };
}

export function TaskList({ defaultFilters }: TaskListProps) {
  const router = useRouter();
  const [filters, setFilters] = useState({
    search: defaultFilters?.search || '',
    namespace: defaultFilters?.namespace,
    sort: defaultFilters?.sort || 'name',
  });
  const [filterResetKey, setFilterResetKey] = useState(0);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const { data, isLoading, error, dataUpdatedAt } = useTasks();

  // Extract tasks and convert to Task[] for local filtering
  const allTasks: Task[] = data?.tasks ? data.tasks.map((task: any) => ({
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
  })) : [];

  const lastUpdated = dataUpdatedAt ? formatRelativeTime(dataUpdatedAt) : null;

  // Extract unique namespaces from tasks
  const namespaces = allTasks.length > 0
    ? Array.from(new Set(allTasks.map((t) => t.namespace))).sort()
    : [];

  // Client-side filtering
  const filteredTasks = allTasks.filter((task) => {
    // Filter by search
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      const matchesSearch = task.name.toLowerCase().includes(searchLower) ||
        task.description.toLowerCase().includes(searchLower);
      if (!matchesSearch) return false;
    }

    // Filter by namespace
    if (filters.namespace && task.namespace !== filters.namespace) {
      return false;
    }

    return true;
  });

  // Client-side sorting
  const sortedTasks = [...filteredTasks].sort((a, b) => {
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

  // Calculate active filter count (excluding default sort)
  const activeFilterCount =
    (filters.search ? 1 : 0) +
    (filters.namespace ? 1 : 0) +
    (filters.sort && filters.sort !== 'name' ? 1 : 0);

  const hasActiveFilters = activeFilterCount > 0;

  const handleCardClick = (taskName: string) => {
    router.push(`/tasks/${taskName}`);
  };

  const handleClearFilters = () => {
    setFilters({
      search: '',
      namespace: undefined,
      sort: 'name',
    });
    // Force TaskFilters to reset by changing key
    setFilterResetKey((prev) => prev + 1);
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ignore shortcuts when typing in input/textarea/select
      const target = event.target as HTMLElement;
      const isInputElement =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT';

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
  }, []);

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
      <div className="mb-4 rounded-md bg-blue-50 border border-blue-200 px-4 py-2 text-xs text-blue-700">
        <span className="font-medium">Keyboard shortcuts:</span>{' '}
        <kbd className="rounded bg-white px-1.5 py-0.5 border border-blue-300">/</kbd> to search,{' '}
        <kbd className="rounded bg-white px-1.5 py-0.5 border border-blue-300">Esc</kbd> to clear filters
      </div>

      {/* Filters */}
      <TaskFilters
        key={filterResetKey}
        namespaces={namespaces}
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
      {!isLoading && sortedTasks.length > 0 && (
        <div className="mb-4 text-sm text-gray-600" role="status" aria-live="polite" aria-atomic="true">
          Showing {sortedTasks.length} {sortedTasks.length === 1 ? 'task' : 'tasks'}
        </div>
      )}

      {/* Last Updated Timestamp */}
      {!isLoading && lastUpdated && (
        <div className="mb-4 text-sm text-gray-500">
          Updated {lastUpdated}
        </div>
      )}

      {/* Loading State - Skeleton Cards */}
      {isLoading && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 6 }).map((_, index) => (
            <TaskCardSkeleton key={index} />
          ))}
        </div>
      )}

      {/* Empty State - No Tasks */}
      {!isLoading && sortedTasks.length === 0 && !filters.search && !filters.namespace && (
        <EmptyState
          title="No tasks yet"
          description="Get started by creating your first task."
        />
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
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {sortedTasks.map((task) => (
            <TaskCard
              key={task.name}
              task={task}
              onClick={() => handleCardClick(task.name)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
