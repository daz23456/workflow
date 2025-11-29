'use client';

import { useState, useEffect } from 'react';

export interface ExecutionSummary {
  id: string;
  workflowName: string;
  status: string;
  startedAt: string;
  duration: string;
}

export interface TaskExecution {
  taskId: string;
  taskName: string;
  status: string;
  startTime: string;
  endTime: string;
  duration: string;
  input: Record<string, unknown>;
  output: Record<string, unknown>;
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

export interface ExecutionReplayProps {
  workflowName: string;
  onReplay?: (execution: ExecutionDetails) => void;
}

export function ExecutionReplay({ workflowName, onReplay }: ExecutionReplayProps) {
  const [executions, setExecutions] = useState<ExecutionSummary[]>([]);
  const [filteredExecutions, setFilteredExecutions] = useState<ExecutionSummary[]>([]);
  const [selectedExecution, setSelectedExecution] = useState<ExecutionDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [currentPage, setCurrentPage] = useState(1);
  const executionsPerPage = 10;

  useEffect(() => {
    loadExecutions();
  }, [workflowName]);

  useEffect(() => {
    if (statusFilter === 'All') {
      setFilteredExecutions(executions);
    } else {
      setFilteredExecutions(executions.filter((e) => e.status === statusFilter));
    }
    setCurrentPage(1);
  }, [statusFilter, executions]);

  const loadExecutions = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/v1/workflows/${workflowName}/executions`);
      if (!response.ok) {
        throw new Error('Failed to load executions');
      }
      const data = await response.json();
      setExecutions(data);
      setFilteredExecutions(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load executions');
    } finally {
      setLoading(false);
    }
  };

  const loadExecutionDetails = async (executionId: string) => {
    try {
      const response = await fetch(`/api/v1/executions/${executionId}`);
      if (!response.ok) {
        throw new Error('Failed to load execution details');
      }
      const data = await response.json();
      setSelectedExecution(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load execution details');
    }
  };

  const handleExecutionClick = (execution: ExecutionSummary) => {
    loadExecutionDetails(execution.id);
  };

  const handleReplay = () => {
    if (selectedExecution && onReplay) {
      onReplay(selectedExecution);
    }
  };

  const handleStatusFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setStatusFilter(e.target.value);
  };

  const handleNextPage = () => {
    setCurrentPage((page) => Math.min(page + 1, totalPages));
  };

  const handlePrevPage = () => {
    setCurrentPage((page) => Math.max(page - 1, 1));
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
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

  // Pagination
  const totalPages = Math.ceil(filteredExecutions.length / executionsPerPage);
  const startIndex = (currentPage - 1) * executionsPerPage;
  const endIndex = startIndex + executionsPerPage;
  const currentExecutions = filteredExecutions.slice(startIndex, endIndex);

  if (loading) {
    return (
      <div role="region" aria-label="execution replay" className="p-4 text-center">
        Loading executions...
      </div>
    );
  }

  if (error) {
    return (
      <div role="region" aria-label="execution replay" className="p-4 text-center text-red-600">
        {error}
      </div>
    );
  }

  return (
    <div role="region" aria-label="execution replay" className="p-4 space-y-4">
      {/* Header and Filters */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Execution History</h3>
        <div>
          <label htmlFor="status-filter" className="sr-only">
            Filter by status
          </label>
          <select
            id="status-filter"
            aria-label="Filter by status"
            value={statusFilter}
            onChange={handleStatusFilterChange}
            className="px-3 py-2 border rounded text-sm"
          >
            <option value="All">All</option>
            <option value="Succeeded">Succeeded</option>
            <option value="Failed">Failed</option>
            <option value="Running">Running</option>
          </select>
        </div>
      </div>

      {/* Executions List */}
      {filteredExecutions.length === 0 ? (
        <div className="text-center text-gray-500">No executions found</div>
      ) : (
        <>
          <div className="space-y-2">
            {currentExecutions.map((execution) => (
              <div
                key={execution.id}
                className="p-3 border rounded cursor-pointer hover:bg-gray-50"
                onClick={() => handleExecutionClick(execution)}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-medium">{execution.id}</div>
                    <div className="text-sm text-gray-600">
                      {formatTimestamp(execution.startedAt)}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span
                      className={`text-xs px-2 py-1 rounded border ${getStatusColor(execution.status)}`}
                    >
                      {execution.status}
                    </span>
                    <span className="text-sm text-gray-500">{execution.duration}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-between items-center">
              <button
                onClick={handlePrevPage}
                disabled={currentPage === 1}
                className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 disabled:bg-gray-100 disabled:text-gray-400"
                aria-label="Previous page"
              >
                Previous
              </button>
              <span className="text-sm text-gray-600">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={handleNextPage}
                disabled={currentPage === totalPages}
                className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 disabled:bg-gray-100 disabled:text-gray-400"
                aria-label="Next"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}

      {/* Execution Details */}
      {selectedExecution && (
        <div className="border-t pt-4 space-y-3">
          <div className="flex justify-between items-center">
            <h4 className="font-medium">Execution Details</h4>
            <button
              onClick={handleReplay}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              aria-label="Replay"
            >
              Replay
            </button>
          </div>

          <div className="bg-gray-50 p-3 rounded space-y-2">
            <div>
              <span className="font-medium">ID:</span> {selectedExecution.id}
            </div>
            <div>
              <span className="font-medium">Status:</span>{' '}
              <span
                className={`text-xs px-2 py-1 rounded border ${getStatusColor(selectedExecution.status)}`}
              >
                {selectedExecution.status}
              </span>
            </div>
            <div>
              <span className="font-medium">Started:</span>{' '}
              {formatTimestamp(selectedExecution.startedAt)}
            </div>
            <div>
              <span className="font-medium">Completed:</span>{' '}
              {formatTimestamp(selectedExecution.completedAt)}
            </div>
            <div>
              <span className="font-medium">Duration:</span> {selectedExecution.duration}
            </div>
          </div>

          {/* Task List */}
          <div>
            <h5 className="font-medium mb-2">Tasks:</h5>
            <div className="space-y-2">
              {selectedExecution.tasks.map((task) => (
                <div key={task.taskId} className="bg-white p-3 border rounded">
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
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
