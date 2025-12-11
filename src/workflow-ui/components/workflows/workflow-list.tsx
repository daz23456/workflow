'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useWorkflows, useLabels } from '@/lib/api/queries';
import { WorkflowFilters } from './workflow-filters';
import { WorkflowCard } from './workflow-card';
import { WorkflowCardSkeleton } from './workflow-card-skeleton';
import { EmptyState } from './empty-state';
import { Pagination } from '@/components/ui/pagination';
import { formatRelativeTime } from '@/lib/utils';

interface WorkflowListProps {
  defaultFilters?: {
    search?: string;
    namespace?: string;
    sort?: string;
  };
}

const DEFAULT_PAGE_SIZE = 25;

export function WorkflowList({ defaultFilters }: WorkflowListProps) {
  const router = useRouter();
  const [filters, setFilters] = useState({
    search: defaultFilters?.search || '',
    namespace: defaultFilters?.namespace,
    sort: defaultFilters?.sort || 'name',
    tags: [] as string[],
    categories: [] as string[],
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

  const { data, isLoading, error, dataUpdatedAt, isFetching } = useWorkflows({
    search: debouncedSearch || undefined,
    namespace: filters.namespace || undefined,
    skip,
    take: pageSize,
  });

  const rawWorkflows = data?.workflows || [];
  const lastUpdated = dataUpdatedAt ? formatRelativeTime(dataUpdatedAt) : null;

  // Client-side sorting (in case backend doesn't support sort parameter for all sort types)
  const workflows = useMemo(() => {
    let sorted = [...rawWorkflows];

    // Apply sorting on client side
    if (filters.sort) {
      sorted = sorted.sort((a, b) => {
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

    return sorted;
  }, [rawWorkflows, filters.sort]);

  const total = data?.total || 0;
  const totalPages = Math.ceil(total / pageSize);

  // Extract unique namespaces from current page
  const namespaces = useMemo(() => {
    if (!rawWorkflows.length) return [];
    return Array.from(new Set(rawWorkflows.map((w) => w.namespace))).sort();
  }, [rawWorkflows]);

  // Calculate active filter count (excluding default sort)
  const activeFilterCount =
    (filters.search ? 1 : 0) +
    (filters.namespace ? 1 : 0) +
    (filters.sort && filters.sort !== 'name' ? 1 : 0) +
    filters.tags.length +
    filters.categories.length;

  const hasActiveFilters = activeFilterCount > 0;

  const handleCardClick = (workflowName: string) => {
    router.push(`/workflows/${workflowName}`);
  };

  // Handle clicking a tag on a workflow card - add to filters
  const handleTagClick = useCallback((tag: string) => {
    setFilters((prev) => ({
      ...prev,
      tags: prev.tags.includes(tag) ? prev.tags : [...prev.tags, tag],
    }));
    setPage(1);
  }, []);

  // Handle clicking a category on a workflow card - add to filters
  const handleCategoryClick = useCallback((category: string) => {
    setFilters((prev) => ({
      ...prev,
      categories: prev.categories.includes(category) ? prev.categories : [...prev.categories, category],
    }));
    setPage(1);
  }, []);

  const handleClearFilters = useCallback(() => {
    setFilters({
      search: '',
      namespace: undefined,
      sort: 'name',
      tags: [],
      categories: [],
    });
    setPage(1);
    // Force WorkflowFilters to reset by changing key
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

      {/* Workflow Count */}
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
              Showing {workflows.length} of {total} {total === 1 ? 'workflow' : 'workflows'}
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
        <>
          <div className={`grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 ${isFetching ? 'opacity-60' : ''}`}>
            {workflows.map((workflow) => (
              <WorkflowCard
                key={workflow.name}
                workflow={workflow}
                onClick={() => handleCardClick(workflow.name)}
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
