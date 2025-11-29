'use client';

import { useState, useMemo, useEffect } from 'react';
import type { ExecutionHistoryItem } from '@/types/execution';

interface ExecutionHistoryPanelProps {
  executions: ExecutionHistoryItem[];
  onExecutionClick?: (executionId: string) => void;
  isLoading?: boolean;
}

type StatusFilter = 'all' | 'success' | 'failed';
type SortOrder = 'newest' | 'oldest';

/**
 * Formats duration in milliseconds to human-readable string
 */
function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`;
  }

  const seconds = ms / 1000;
  if (seconds < 60) {
    return `${seconds.toFixed(1)}s`;
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}m ${remainingSeconds}s`;
}

/**
 * Formats ISO timestamp to time string
 */
function formatTime(isoString: string): string {
  return new Date(isoString).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

/**
 * Returns Tailwind classes for status badge color
 */
function getStatusColor(status: ExecutionHistoryItem['status']): string {
  switch (status) {
    case 'success':
      return 'bg-green-100 text-green-800 border border-green-200';
    case 'failed':
      return 'bg-red-100 text-red-800 border border-red-200';
    case 'running':
      return 'bg-blue-100 text-blue-800 border border-blue-200';
    default:
      return 'bg-gray-100 text-gray-800 border border-gray-200';
  }
}

export function ExecutionHistoryPanel({
  executions,
  onExecutionClick,
  isLoading = false,
}: ExecutionHistoryPanelProps) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sortOrder, setSortOrder] = useState<SortOrder>('newest');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Filter and sort executions
  const filteredAndSortedExecutions = useMemo(() => {
    let filtered = executions;

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = executions.filter((exec) => {
        const status = exec.status.toLowerCase();
        // Handle both "success"/"succeeded" and "failed"
        if (statusFilter === 'success') {
          return status === 'success' || status === 'succeeded';
        }
        if (statusFilter === 'failed') {
          return status === 'failed';
        }
        return status === statusFilter;
      });
    }

    // Apply sorting
    const sorted = [...filtered].sort((a, b) => {
      const aTime = new Date(a.startedAt).getTime();
      const bTime = new Date(b.startedAt).getTime();
      return sortOrder === 'newest' ? bTime - aTime : aTime - bTime;
    });

    return sorted;
  }, [executions, statusFilter, sortOrder]);

  // Calculate pagination
  const totalPages = Math.ceil(filteredAndSortedExecutions.length / pageSize);
  const paginatedExecutions = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return filteredAndSortedExecutions.slice(startIndex, endIndex);
  }, [filteredAndSortedExecutions, currentPage, pageSize]);

  // Reset to page 1 when filters or page size change
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, sortOrder, pageSize]);

  const handleExecutionClick = (executionId: string) => {
    if (onExecutionClick) {
      onExecutionClick(executionId);
    }
  };

  const toggleSortOrder = () => {
    setSortOrder((prev) => (prev === 'newest' ? 'oldest' : 'newest'));
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center bg-gray-50 border border-gray-200 rounded-lg">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
          <p className="mt-2 text-sm text-gray-600">Loading executions...</p>
        </div>
      </div>
    );
  }

  // Empty state
  if (executions.length === 0) {
    return (
      <div className="flex h-full items-center justify-center bg-gray-50 border border-gray-200 rounded-lg">
        <div className="text-center text-gray-500">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
            />
          </svg>
          <p className="mt-2 text-sm">No executions yet</p>
        </div>
      </div>
    );
  }

  // Filtered empty state
  const showFilteredEmpty = filteredAndSortedExecutions.length === 0 && executions.length > 0;

  return (
    <div className="flex h-full flex-col bg-white border border-gray-200 rounded-lg">
      {/* Header */}
      <div className="border-b border-gray-200 px-4 py-3">
        <h3 className="text-lg font-semibold text-gray-900">Execution History</h3>
      </div>

      {/* Filters */}
      <div className="border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                statusFilter === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('success')}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                statusFilter === 'success'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Success
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('failed')}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                statusFilter === 'failed'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Failed
            </button>
          </div>

          {/* Sort Button */}
          <button
            type="button"
            onClick={toggleSortOrder}
            className="flex items-center gap-1 rounded-md bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12"
              />
            </svg>
            Sort: {sortOrder === 'newest' ? 'Newest' : 'Oldest'}
          </button>
        </div>
      </div>

      {/* Execution List */}
      <div className="flex-1 overflow-y-auto">
        {showFilteredEmpty ? (
          <div className="flex h-full items-center justify-center text-gray-500">
            <p className="text-sm">No {statusFilter} executions found</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {paginatedExecutions.map((execution) => (
              <button
                key={execution.executionId}
                type="button"
                onClick={() => handleExecutionClick(execution.executionId)}
                className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  {/* Left side: Status and ID */}
                  <div className="flex items-center gap-3">
                    <span
                      className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${getStatusColor(
                        execution.status
                      )}`}
                    >
                      {execution.status}
                    </span>
                    <div>
                      <div className="text-sm font-mono text-gray-900">{execution.executionId}</div>
                      {execution.error && (
                        <div className="mt-1 text-xs text-red-600">{execution.error}</div>
                      )}
                    </div>
                  </div>

                  {/* Right side: Time and Duration */}
                  <div className="text-right text-xs text-gray-500">
                    <div>{formatTime(execution.startedAt)}</div>
                    <div className="mt-1 font-medium text-gray-700">
                      {formatDuration(execution.durationMs)}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Pagination Controls */}
      {filteredAndSortedExecutions.length > 0 && (
        <div className="border-t border-gray-200 px-4 py-3 bg-gray-50">
          <div className="flex items-center justify-between">
            {/* Results Info & Page Size */}
            <div className="flex items-center gap-4">
              <p className="text-sm text-gray-700">
                Showing{' '}
                <span className="font-medium">
                  {Math.min((currentPage - 1) * pageSize + 1, filteredAndSortedExecutions.length)}
                </span>{' '}
                to{' '}
                <span className="font-medium">
                  {Math.min(currentPage * pageSize, filteredAndSortedExecutions.length)}
                </span>{' '}
                of <span className="font-medium">{filteredAndSortedExecutions.length}</span> results
              </p>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="rounded-md border border-gray-300 bg-white px-2 py-1 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value={10}>10 per page</option>
                <option value={25}>25 per page</option>
                <option value={50}>50 per page</option>
                <option value={100}>100 per page</option>
              </select>
            </div>

            {/* Page Navigation */}
            {totalPages > 1 && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="rounded-md border border-gray-300 bg-white px-3 py-1 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Previous
                </button>

                {/* Page Numbers */}
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum: number;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }

                    return (
                      <button
                        key={pageNum}
                        type="button"
                        onClick={() => setCurrentPage(pageNum)}
                        className={`min-w-[32px] rounded-md px-2 py-1 text-sm font-medium ${
                          currentPage === pageNum
                            ? 'bg-blue-600 text-white'
                            : 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>

                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="rounded-md border border-gray-300 bg-white px-3 py-1 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
