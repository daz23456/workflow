'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useWorkflows } from '@/lib/api/queries';
import { WorkflowFilters } from './workflow-filters';
import { WorkflowCard } from './workflow-card';
import { WorkflowCardSkeleton } from './workflow-card-skeleton';
import { EmptyState } from './empty-state';
import { formatRelativeTime } from '@/lib/utils';

interface WorkflowListProps {
  defaultFilters?: {
    search?: string;
    namespace?: string;
    sort?: string;
  };
}

export function WorkflowList({ defaultFilters }: WorkflowListProps) {
  const router = useRouter();
  const [filters, setFilters] = useState({
    search: defaultFilters?.search || '',
    namespace: defaultFilters?.namespace,
    sort: defaultFilters?.sort || 'name',
  });
  const [filterResetKey, setFilterResetKey] = useState(0);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const { data, isLoading, error, dataUpdatedAt } = useWorkflows(filters);

  const rawWorkflows = data?.workflows || [];
  const lastUpdated = dataUpdatedAt ? formatRelativeTime(dataUpdatedAt) : null;

  // Client-side filtering (in case backend doesn't support search filtering)
  const workflows = useMemo(() => {
    let filtered = rawWorkflows;

    // Apply search filter on client side
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(
        (workflow) =>
          workflow.name.toLowerCase().includes(searchLower) ||
          workflow.description?.toLowerCase().includes(searchLower) ||
          workflow.namespace?.toLowerCase().includes(searchLower)
      );
    }

    // Apply namespace filter on client side
    if (filters.namespace) {
      filtered = filtered.filter((workflow) => workflow.namespace === filters.namespace);
    }

    // Apply sorting on client side
    if (filters.sort) {
      filtered = [...filtered].sort((a, b) => {
        switch (filters.sort) {
          case 'name':
            return a.name.localeCompare(b.name);
          case 'namespace':
            return (a.namespace || '').localeCompare(b.namespace || '');
          case 'lastExecuted':
            // Sort by last executed date (most recent first)
            const aDate = a.stats?.lastExecuted ? new Date(a.stats.lastExecuted).getTime() : 0;
            const bDate = b.stats?.lastExecuted ? new Date(b.stats.lastExecuted).getTime() : 0;
            return bDate - aDate;
          case 'success-rate':
            // Sort by success rate (highest first)
            const aRate = a.stats?.successRate ?? 0;
            const bRate = b.stats?.successRate ?? 0;
            return bRate - aRate;
          case 'executions':
            // Sort by total executions (highest first)
            const aExecs = a.stats?.totalExecutions ?? 0;
            const bExecs = b.stats?.totalExecutions ?? 0;
            return bExecs - aExecs;
          default:
            return 0;
        }
      });
    }

    return filtered;
  }, [rawWorkflows, filters.search, filters.namespace, filters.sort]);

  // Extract unique namespaces from all workflows (before filtering)
  const namespaces =
    rawWorkflows.length > 0 ? Array.from(new Set(rawWorkflows.map((w) => w.namespace))).sort() : [];

  // Calculate active filter count (excluding default sort)
  const activeFilterCount =
    (filters.search ? 1 : 0) +
    (filters.namespace ? 1 : 0) +
    (filters.sort && filters.sort !== 'name' ? 1 : 0);

  const hasActiveFilters = activeFilterCount > 0;

  const handleCardClick = (workflowName: string) => {
    router.push(`/workflows/${workflowName}`);
  };

  const handleClearFilters = () => {
    setFilters({
      search: '',
      namespace: undefined,
      sort: 'name',
    });
    // Force WorkflowFilters to reset by changing key
    setFilterResetKey((prev) => prev + 1);
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
  }, []);

  if (error) {
    return (
      <div className="p-8">
        <EmptyState
          title="Error loading workflows"
          description="Failed to load workflows. Please try again later."
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
      <WorkflowFilters
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

      {/* Workflow Count */}
      {!isLoading && workflows.length > 0 && (
        <div
          className="mb-4 text-sm text-gray-600"
          role="status"
          aria-live="polite"
          aria-atomic="true"
        >
          Showing {workflows.length} {workflows.length === 1 ? 'workflow' : 'workflows'}
        </div>
      )}

      {/* Last Updated Timestamp */}
      {!isLoading && lastUpdated && (
        <div className="mb-4 text-sm text-gray-500">Updated {lastUpdated}</div>
      )}

      {/* Loading State - Skeleton Cards */}
      {isLoading && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 6 }).map((_, index) => (
            <WorkflowCardSkeleton key={index} />
          ))}
        </div>
      )}

      {/* Empty State - No Workflows */}
      {!isLoading && workflows.length === 0 && !filters.search && !filters.namespace && (
        <EmptyState
          title="No workflows yet"
          description="Get started by creating your first workflow."
        />
      )}

      {/* Empty State - No Results */}
      {!isLoading && workflows.length === 0 && (filters.search || filters.namespace) && (
        <div role="status" aria-live="polite">
          <EmptyState
            title="No workflows found"
            description="Try adjusting your filters to find what you're looking for."
          />
        </div>
      )}

      {/* Workflow Grid */}
      {!isLoading && workflows.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {workflows.map((workflow) => (
            <WorkflowCard
              key={workflow.name}
              workflow={workflow}
              onClick={() => handleCardClick(workflow.name)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
