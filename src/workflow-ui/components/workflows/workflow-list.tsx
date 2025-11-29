'use client';

import { useState, useEffect, useRef } from 'react';
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

  const workflows = data?.workflows || [];
  const lastUpdated = dataUpdatedAt ? formatRelativeTime(dataUpdatedAt) : null;

  // Extract unique namespaces from workflows
  const namespaces =
    workflows.length > 0 ? Array.from(new Set(workflows.map((w) => w.namespace))).sort() : [];

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
      <div className="mb-4 rounded-md bg-blue-50 border border-blue-200 px-4 py-2 text-xs text-blue-700">
        <span className="font-medium">Keyboard shortcuts:</span>{' '}
        <kbd className="rounded bg-white px-1.5 py-0.5 border border-blue-300">/</kbd> to search,{' '}
        <kbd className="rounded bg-white px-1.5 py-0.5 border border-blue-300">Esc</kbd> to clear
        filters
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
