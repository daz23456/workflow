'use client';

import { useState } from 'react';

export interface TaskExecution {
  taskId: string;
  taskName: string;
  status: string;
  input: Record<string, unknown>;
  output: Record<string, unknown> | null;
  error?: string;
  duration: string;
}

export interface ExecutionDetails {
  id: string;
  workflowName: string;
  status: string;
  startedAt: string;
  completedAt: string;
  duration: string;
  tasks: TaskExecution[];
}

export interface ExecutionComparisonProps {
  execution1: ExecutionDetails;
  execution2: ExecutionDetails;
}

export function ExecutionComparison({ execution1, execution2 }: ExecutionComparisonProps) {
  const [showOnlyDifferences, setShowOnlyDifferences] = useState(false);
  const [swapped, setSwapped] = useState(false);

  const left = swapped ? execution2 : execution1;
  const right = swapped ? execution1 : execution2;

  // Check if executions are identical
  const areIdentical = JSON.stringify(execution1) === JSON.stringify(execution2);

  const isDifferent = (field: string, val1: any, val2: any): boolean => {
    return JSON.stringify(val1) !== JSON.stringify(val2);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Succeeded':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'Failed':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'Running':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const toggleDiffView = () => {
    setShowOnlyDifferences(!showOnlyDifferences);
  };

  const handleSwap = () => {
    setSwapped(!swapped);
  };

  const formatJSON = (data: any) => {
    if (data === null || data === undefined) {
      return 'null';
    }
    if (typeof data === 'object') {
      return JSON.stringify(data, null, 2);
    }
    return String(data);
  };

  return (
    <div role="region" aria-label="execution comparison" className="p-4 space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center border-b pb-2">
        <h3 className="text-lg font-semibold">Execution Comparison</h3>
        <div className="flex space-x-2">
          <button
            onClick={toggleDiffView}
            className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 text-sm"
            aria-label={showOnlyDifferences ? 'Show all' : 'Show only differences'}
          >
            {showOnlyDifferences ? 'Show All' : 'Show Only Differences'}
          </button>
          <button
            onClick={handleSwap}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
            aria-label="Swap"
          >
            Swap
          </button>
        </div>
      </div>

      {/* Identical executions message */}
      {areIdentical && (
        <div className="text-center text-gray-600 py-4">
          No differences found - executions are identical
        </div>
      )}

      {!areIdentical && (
        <>
          {/* Side-by-side comparison */}
          <div className="grid grid-cols-2 gap-4">
            {/* Left execution */}
            <article className="border rounded p-4 space-y-3">
              <div>
                <div className="font-semibold text-lg">{left.id}</div>
                <div
                  className="mt-2"
                  data-field="status"
                  data-diff={isDifferent('status', left.status, right.status)}
                >
                  <span
                    className={`text-xs px-2 py-1 rounded border ${getStatusColor(left.status)}`}
                  >
                    {left.status}
                  </span>
                </div>
              </div>

              <div
                data-field="duration"
                data-diff={isDifferent('duration', left.duration, right.duration)}
              >
                <span className="font-medium">Duration:</span> {left.duration}
              </div>

              {/* Tasks */}
              <div>
                <h5 className="font-medium mb-2">Tasks</h5>
                {left.tasks.map((task, idx) => {
                  const rightTask = right.tasks[idx];
                  const taskDifferent =
                    rightTask && JSON.stringify(task) !== JSON.stringify(rightTask);

                  if (showOnlyDifferences && !taskDifferent) {
                    return null;
                  }

                  return (
                    <div key={task.taskId} className="bg-gray-50 p-3 rounded mb-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-medium">{task.taskName}</div>
                          <div className="text-sm text-gray-600">{task.taskId}</div>
                        </div>
                        <span
                          className={`text-xs px-2 py-1 rounded border ${getStatusColor(task.status)}`}
                        >
                          {task.status}
                        </span>
                      </div>

                      <div className="mt-2 space-y-1 text-sm">
                        <div>
                          <span className="font-medium">Input:</span>
                          <pre className="bg-white p-2 rounded text-xs overflow-auto mt-1">
                            {formatJSON(task.input)}
                          </pre>
                        </div>
                        <div
                          data-diff={
                            rightTask && isDifferent('output', task.output, rightTask.output)
                          }
                        >
                          <span className="font-medium">Output:</span>
                          <pre className="bg-white p-2 rounded text-xs overflow-auto mt-1">
                            {formatJSON(task.output)}
                          </pre>
                        </div>
                        {task.error && (
                          <div className="text-red-600">
                            <span className="font-medium">Error:</span> {task.error}
                          </div>
                        )}
                        <div>
                          <span className="font-medium">Duration:</span> {task.duration}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </article>

            {/* Right execution */}
            <article className="border rounded p-4 space-y-3">
              <div>
                <div className="font-semibold text-lg">{right.id}</div>
                <div
                  className="mt-2"
                  data-field="status"
                  data-diff={isDifferent('status', left.status, right.status)}
                >
                  <span
                    className={`text-xs px-2 py-1 rounded border ${getStatusColor(right.status)}`}
                  >
                    {right.status}
                  </span>
                </div>
              </div>

              <div
                data-field="duration"
                data-diff={isDifferent('duration', left.duration, right.duration)}
              >
                <span className="font-medium">Duration:</span> {right.duration}
              </div>

              {/* Tasks */}
              <div>
                <h5 className="font-medium mb-2">Tasks</h5>
                {right.tasks.map((task, idx) => {
                  const leftTask = left.tasks[idx];
                  const taskDifferent =
                    leftTask && JSON.stringify(task) !== JSON.stringify(leftTask);

                  if (showOnlyDifferences && !taskDifferent) {
                    return null;
                  }

                  return (
                    <div key={task.taskId} className="bg-gray-50 p-3 rounded mb-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-medium">{task.taskName}</div>
                          <div className="text-sm text-gray-600">{task.taskId}</div>
                        </div>
                        <span
                          className={`text-xs px-2 py-1 rounded border ${getStatusColor(task.status)}`}
                        >
                          {task.status}
                        </span>
                      </div>

                      <div className="mt-2 space-y-1 text-sm">
                        <div>
                          <span className="font-medium">Input:</span>
                          <pre className="bg-white p-2 rounded text-xs overflow-auto mt-1">
                            {formatJSON(task.input)}
                          </pre>
                        </div>
                        <div
                          data-diff={
                            leftTask && isDifferent('output', task.output, leftTask.output)
                          }
                        >
                          <span className="font-medium">Output:</span>
                          <pre className="bg-white p-2 rounded text-xs overflow-auto mt-1">
                            {formatJSON(task.output)}
                          </pre>
                        </div>
                        {task.error && (
                          <div className="text-red-600">
                            <span className="font-medium">Error:</span> {task.error}
                          </div>
                        )}
                        <div>
                          <span className="font-medium">Duration:</span> {task.duration}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </article>
          </div>
        </>
      )}
    </div>
  );
}
