'use client';

import Link from 'next/link';
import type { WorkflowMetrics } from '@/lib/api/types';

interface WorkflowMetricsTableProps {
  workflows: WorkflowMetrics[] | undefined;
  isLoading: boolean;
}

export function WorkflowMetricsTable({ workflows, isLoading }: WorkflowMetricsTableProps) {
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
                Workflow
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Avg Duration
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                P95
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Error Rate
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Executions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {workflows.map((workflow) => (
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
