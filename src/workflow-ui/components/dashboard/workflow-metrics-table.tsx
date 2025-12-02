'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import type { WorkflowMetrics } from '@/lib/api/types';

type SortColumn = 'name' | 'avgDurationMs' | 'p95Ms' | 'errorRate' | 'executionCount';
type SortDirection = 'asc' | 'desc';

interface WorkflowMetricsTableProps {
  workflows: WorkflowMetrics[] | undefined;
  isLoading: boolean;
}

export function WorkflowMetricsTable({ workflows, isLoading }: WorkflowMetricsTableProps) {
  const [sortColumn, setSortColumn] = useState<SortColumn>('executionCount');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const sortedWorkflows = useMemo(() => {
    if (!workflows) return [];

    return [...workflows].sort((a, b) => {
      let comparison = 0;

      switch (sortColumn) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'avgDurationMs':
          comparison = a.avgDurationMs - b.avgDurationMs;
          break;
        case 'p95Ms':
          comparison = a.p95Ms - b.p95Ms;
          break;
        case 'errorRate':
          comparison = a.errorRate - b.errorRate;
          break;
        case 'executionCount':
          comparison = a.executionCount - b.executionCount;
          break;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [workflows, sortColumn, sortDirection]);

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('desc');
    }
  };

  const SortIcon = ({ column }: { column: SortColumn }) => {
    if (sortColumn !== column) {
      return <ChevronsUpDown className="w-4 h-4 text-gray-400" />;
    }
    return sortDirection === 'asc' ? (
      <ChevronUp className="w-4 h-4 text-blue-600" />
    ) : (
      <ChevronDown className="w-4 h-4 text-blue-600" />
    );
  };
  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Workflow Metrics</h2>
        </div>
        <div className="divide-y divide-gray-200">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="p-4 animate-pulse" role="status" aria-label="Loading workflow metrics">
              <div className="h-4 w-32 bg-gray-200 rounded mb-2" />
              <div className="h-3 w-48 bg-gray-200 rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!workflows || workflows.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8 text-center">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Workflow Metrics</h2>
        <p className="text-gray-500">No workflow data available</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">Workflow Metrics</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full" data-testid="workflow-metrics-table">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <button
                  onClick={() => handleSort('name')}
                  className="flex items-center gap-1 hover:text-gray-700 transition-colors"
                >
                  Workflow
                  <SortIcon column="name" />
                </button>
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                <button
                  onClick={() => handleSort('avgDurationMs')}
                  className="flex items-center gap-1 ml-auto hover:text-gray-700 transition-colors"
                >
                  Avg Duration
                  <SortIcon column="avgDurationMs" />
                </button>
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                <button
                  onClick={() => handleSort('p95Ms')}
                  className="flex items-center gap-1 ml-auto hover:text-gray-700 transition-colors"
                >
                  P95
                  <SortIcon column="p95Ms" />
                </button>
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                <button
                  onClick={() => handleSort('errorRate')}
                  className="flex items-center gap-1 ml-auto hover:text-gray-700 transition-colors"
                >
                  Error Rate
                  <SortIcon column="errorRate" />
                </button>
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                <button
                  onClick={() => handleSort('executionCount')}
                  className="flex items-center gap-1 ml-auto hover:text-gray-700 transition-colors"
                >
                  Executions
                  <SortIcon column="executionCount" />
                </button>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {sortedWorkflows.map((workflow) => (
              <tr key={workflow.name} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <Link
                    href={`/workflows/${encodeURIComponent(workflow.name)}`}
                    className="text-blue-600 hover:text-blue-800 font-medium"
                  >
                    {workflow.name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-right text-sm text-gray-900">
                  {workflow.avgDurationMs}ms
                </td>
                <td className="px-4 py-3 text-right text-sm text-gray-900">
                  {workflow.p95Ms}ms
                </td>
                <td className="px-4 py-3 text-right text-sm">
                  <span
                    className={`${
                      workflow.errorRate < 1
                        ? 'text-green-600'
                        : workflow.errorRate < 5
                          ? 'text-yellow-600'
                          : 'text-red-600'
                    }`}
                  >
                    {workflow.errorRate.toFixed(1)}%
                  </span>
                </td>
                <td className="px-4 py-3 text-right text-sm text-gray-900">
                  {workflow.executionCount.toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
