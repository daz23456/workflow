'use client';

import { useTaskDetail, useTaskUsage, useTaskExecutions } from '@/lib/api/queries';
import { TaskDurationTrendsSection } from '@/components/analytics/task-duration-trends-section';
import { use } from 'react';
import Link from 'next/link';

export default function TaskDetailPage({
  params,
}: {
  params: Promise<{ name: string }>;
}) {
  const { name } = use(params);
  const { data: task, isLoading, error } = useTaskDetail(name);
  const { data: usage } = useTaskUsage(name, { skip: 0, take: 5 });
  const { data: executions } = useTaskExecutions(name, { skip: 0, take: 10 });

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
          <div className="space-y-4">
            <div className="h-32 bg-gray-200 rounded"></div>
            <div className="h-48 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !task) {
    return (
      <div className="container mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h2 className="text-red-800 font-semibold">Task not found</h2>
          <p className="text-red-600">{error?.message || `Task "${name}" not found`}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
          <Link href="/tasks" className="hover:text-blue-600">Tasks</Link>
          <span>/</span>
          <span>{name}</span>
        </div>
        <h1 className="text-3xl font-bold">{task.name}</h1>
        <p className="text-gray-600 mt-2">{task.description}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg border">
          <div className="text-sm text-gray-500">Used By</div>
          <div className="text-2xl font-bold">{task.stats?.usedByWorkflows ?? 0}</div>
        </div>
        <div className="bg-white p-4 rounded-lg border">
          <div className="text-sm text-gray-500">Executions</div>
          <div className="text-2xl font-bold">{task.stats?.totalExecutions ?? 0}</div>
        </div>
        <div className="bg-white p-4 rounded-lg border">
          <div className="text-sm text-gray-500">Avg Duration</div>
          <div className="text-2xl font-bold">{task.stats?.avgDurationMs ?? 0}ms</div>
        </div>
        <div className="bg-white p-4 rounded-lg border">
          <div className="text-sm text-gray-500">Success Rate</div>
          <div className="text-2xl font-bold">{(task.stats?.successRate ?? 0).toFixed(1)}%</div>
        </div>
      </div>

      {/* HTTP Config */}
      {task.httpRequest && (
        <div className="bg-white p-6 rounded-lg border mb-6">
          <h2 className="text-xl font-semibold mb-4">HTTP Configuration</h2>
          <div className="space-y-2">
            <div className="flex">
              <span className="text-gray-500 w-24">Method:</span>
              <span className="font-mono font-semibold">{task.httpRequest.method}</span>
            </div>
            <div className="flex">
              <span className="text-gray-500 w-24">URL:</span>
              <span className="font-mono text-sm">{task.httpRequest.url}</span>
            </div>
            {task.timeout && (
              <div className="flex">
                <span className="text-gray-500 w-24">Timeout:</span>
                <span className="font-mono">{task.timeout}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Schemas */}
      <div className="grid grid-cols-2 gap-6 mb-6">
        <div className="bg-white p-6 rounded-lg border">
          <h2 className="text-xl font-semibold mb-4">Input Schema</h2>
          <pre className="text-sm bg-gray-50 p-4 rounded overflow-auto">
            {JSON.stringify(task.inputSchema, null, 2)}
          </pre>
        </div>
        <div className="bg-white p-6 rounded-lg border">
          <h2 className="text-xl font-semibold mb-4">Output Schema</h2>
          <pre className="text-sm bg-gray-50 p-4 rounded overflow-auto">
            {JSON.stringify(task.outputSchema, null, 2)}
          </pre>
        </div>
      </div>

      {/* Usage */}
      <div className="bg-white p-6 rounded-lg border mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Workflows Using This Task</h2>
          <span className="text-sm text-gray-500">
            {usage?.totalCount || 0} total
          </span>
        </div>
        <div className="space-y-2">
          {usage?.workflows.map((workflow) => (
            <Link
              key={workflow.workflowName}
              href={`/workflows/${workflow.workflowName}`}
              className="block p-3 bg-gray-50 rounded hover:bg-gray-100"
            >
              <div className="font-semibold">{workflow.workflowName}</div>
              <div className="text-sm text-gray-500">
                {workflow.taskCount} tasks
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Duration Trends */}
      <div className="mb-6">
        <TaskDurationTrendsSection taskName={name} />
      </div>

      {/* Recent Executions */}
      <div className="bg-white p-6 rounded-lg border">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Recent Executions</h2>
        </div>
        <div className="space-y-2">
          {executions?.executions.map((exec) => (
            <div
              key={exec.executionId}
              className="p-3 bg-gray-50 rounded flex justify-between items-center"
            >
              <div>
                <div className="text-sm font-mono">{exec.executionId}</div>
                <div className="text-sm text-gray-500">{exec.workflowName}</div>
              </div>
              <div className="text-right">
                <div className={`text-sm font-semibold ${
                  exec.status === 'succeeded' ? 'text-green-600' : 'text-red-600'
                }`}>
                  {exec.status}
                </div>
                <div className="text-sm text-gray-500">{exec.durationMs}ms</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
