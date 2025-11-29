'use client';

import { useState } from 'react';
import type { WorkflowExecutionResponse } from '@/types/execution';

interface ExecutionResultPanelProps {
  execution: WorkflowExecutionResponse;
  onClose?: () => void;
}

export function ExecutionResultPanel({ execution, onClose }: ExecutionResultPanelProps) {
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());

  const toggleTask = (taskId: string) => {
    setExpandedTasks((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) {
        next.delete(taskId);
      } else {
        next.add(taskId);
      }
      return next;
    });
  };

  const copyExecutionId = async () => {
    await navigator.clipboard.writeText(execution.executionId);
  };

  const hasOutput = Object.keys(execution.output).length > 0;

  return (
    <div className="flex h-full flex-col bg-white border-l border-gray-200">
      {/* Header with Close Button */}
      <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold text-gray-900">Execution Result</h2>
          <span
            className={`inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-medium ${
              execution.success
                ? 'bg-green-100 text-green-800 border border-green-200'
                : 'bg-red-100 text-red-800 border border-red-200'
            }`}
          >
            {execution.success ? 'Success' : 'Failed'}
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label="Close execution result"
        >
          <svg
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="1.5"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {/* Execution Info */}
        <div className="mb-6 space-y-3">
          {/* Execution ID */}
          <div>
            <div className="text-sm font-medium text-gray-500">Execution ID</div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm font-mono text-gray-900">{execution.executionId}</span>
              <button
                type="button"
                onClick={copyExecutionId}
                className="rounded p-1 text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                aria-label="Copy execution ID"
                title="Copy execution ID"
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth="1.5"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184"
                  />
                </svg>
              </button>
            </div>
          </div>

          {/* Workflow Name */}
          <div>
            <div className="text-sm font-medium text-gray-500">Workflow</div>
            <div className="text-sm text-gray-900 mt-1">{execution.workflowName}</div>
          </div>

          {/* Metrics Grid */}
          <div className="grid grid-cols-2 gap-4 pt-2">
            <div>
              <div className="text-xs text-gray-500">Duration</div>
              <div className="text-sm font-medium text-gray-900">
                {formatDuration(execution.executionTimeMs)}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Started</div>
              <div className="text-sm font-medium text-gray-900">
                {new Date(execution.startedAt).toLocaleTimeString()}
              </div>
            </div>
            {execution.completedAt && (
              <div>
                <div className="text-xs text-gray-500">Completed</div>
                <div className="text-sm font-medium text-gray-900">
                  {new Date(execution.completedAt).toLocaleTimeString()}
                </div>
              </div>
            )}
          </div>

          {/* Graph Build Warning - only shown when slow (> 1ms) */}
          {isGraphBuildSlow(execution.graphBuildDurationMicros) && (
            <div className="mt-3 rounded-md bg-amber-50 border border-amber-300 px-4 py-3">
              <div className="flex items-center gap-2">
                <svg
                  className="h-5 w-5 text-amber-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth="1.5"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                  />
                </svg>
                <div>
                  <div className="text-sm font-semibold text-amber-800">Slow Graph Build</div>
                  <div className="text-xs text-amber-700">
                    Graph build took {formatMicroseconds(execution.graphBuildDurationMicros)}{' '}
                    (expected &lt;1ms). Consider simplifying workflow or reviewing task
                    dependencies.
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Error Message */}
        {execution.error && (
          <div className="mb-6 rounded-md bg-red-50 border border-red-200 px-4 py-3">
            <div className="text-sm font-medium text-red-800 mb-1">Error</div>
            <div className="text-sm text-red-700">{execution.error}</div>
          </div>
        )}

        {/* Output */}
        <div className="mb-6">
          <div className="text-sm font-medium text-gray-900 mb-2">Output</div>
          {hasOutput ? (
            <pre className="rounded-md bg-gray-50 px-4 py-3 text-xs font-mono text-gray-700 overflow-x-auto">
              {JSON.stringify(execution.output, null, 2)}
            </pre>
          ) : (
            <div className="text-sm text-gray-500 italic">No output data</div>
          )}
        </div>

        {/* Task Results */}
        <div className="mb-6">
          <div className="text-sm font-medium text-gray-900 mb-3">Task Results</div>
          <div className="space-y-2">
            {execution.tasks.map((task) => (
              <div key={task.taskId} className="rounded-md border border-gray-200">
                {/* Task Header */}
                <button
                  type="button"
                  onClick={() => toggleTask(task.taskId)}
                  className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-gray-50 transition-colors duration-150"
                  aria-label={`Toggle ${task.taskId} details`}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${getTaskStatusColor(
                        task.status
                      )}`}
                    >
                      {task.status}
                    </span>
                    <span className="text-sm font-medium text-gray-900">{task.taskId}</span>
                    <span className="text-xs text-gray-500">{formatDuration(task.durationMs)}</span>
                    {task.retryCount > 0 && (
                      <span className="text-xs text-yellow-700">
                        {task.retryCount} {task.retryCount === 1 ? 'retry' : 'retries'}
                      </span>
                    )}
                  </div>
                  <svg
                    className={`h-5 w-5 text-gray-400 transition-transform ${
                      expandedTasks.has(task.taskId) ? 'rotate-0' : '-rotate-90'
                    }`}
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth="1.5"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M19.5 8.25l-7.5 7.5-7.5-7.5"
                    />
                  </svg>
                </button>

                {/* Task Details (Expanded) */}
                {expandedTasks.has(task.taskId) && (
                  <div className="border-t border-gray-200 px-4 py-3 bg-gray-50">
                    {/* Task Reference */}
                    <div className="mb-3">
                      <div className="text-xs font-medium text-gray-500">Task Reference</div>
                      <div className="text-sm text-gray-900 mt-1">{task.taskRef}</div>
                    </div>

                    {/* Task Error */}
                    {task.error && (
                      <div className="mb-3 rounded-md bg-red-50 border border-red-200 px-3 py-2">
                        <div className="text-xs font-medium text-red-800">Error</div>
                        <div className="text-sm text-red-700 mt-1">{task.error}</div>
                      </div>
                    )}

                    {/* HTTP Response */}
                    {task.httpResponse && (
                      <div className="mb-3">
                        <div className="text-xs font-medium text-gray-500 mb-2">HTTP Response</div>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500">Status:</span>
                            <span
                              className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${getHttpStatusColor(
                                task.httpResponse.statusCode
                              )}`}
                            >
                              {task.httpResponse.statusCode}
                            </span>
                          </div>
                          <div>
                            <div className="text-xs text-gray-500 mb-1">Headers</div>
                            <div className="rounded-md bg-white px-3 py-2 text-xs font-mono text-gray-700">
                              {Object.entries(task.httpResponse.headers).map(([key, value]) => (
                                <div key={key}>
                                  <span className="text-gray-500">{key}:</span> {value}
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Task Output */}
                    {task.output && (
                      <div>
                        <div className="text-xs font-medium text-gray-500 mb-1">Output</div>
                        <pre className="rounded-md bg-white px-3 py-2 text-xs font-mono text-gray-700 overflow-x-auto">
                          {JSON.stringify(task.output, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

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
 * Formats duration in microseconds to human-readable string
 */
function formatMicroseconds(micros: number | undefined): string {
  if (micros === undefined || micros === null) {
    return 'N/A';
  }

  if (micros < 1000) {
    return `${micros}μs`;
  }

  const ms = micros / 1000;
  if (ms < 1000) {
    return `${ms.toFixed(2)}ms`;
  }

  return `${(ms / 1000).toFixed(2)}s`;
}

/**
 * Returns true if graph build time exceeds threshold (1ms = 1000μs)
 * Per ADR-0001, graph build should be < 1ms for typical workflows
 */
function isGraphBuildSlow(micros: number | undefined): boolean {
  if (micros === undefined || micros === null) {
    return false;
  }
  // Threshold: 1ms (1000 microseconds)
  return micros > 1000;
}

/**
 * Returns Tailwind classes for task status badge color
 */
function getTaskStatusColor(status: string): string {
  switch (status) {
    case 'success':
      return 'bg-green-100 text-green-800 border border-green-200';
    case 'failed':
      return 'bg-red-100 text-red-800 border border-red-200';
    case 'running':
      return 'bg-blue-100 text-blue-800 border border-blue-200';
    case 'pending':
      return 'bg-gray-100 text-gray-800 border border-gray-200';
    case 'skipped':
      return 'bg-yellow-100 text-yellow-800 border border-yellow-200';
    default:
      return 'bg-gray-100 text-gray-800 border border-gray-200';
  }
}

/**
 * Returns Tailwind classes for HTTP status code badge color
 */
function getHttpStatusColor(statusCode: number): string {
  if (statusCode >= 200 && statusCode < 300) {
    return 'bg-green-100 text-green-800 border border-green-200';
  }
  if (statusCode >= 400) {
    return 'bg-red-100 text-red-800 border border-red-200';
  }
  return 'bg-gray-100 text-gray-800 border border-gray-200';
}
