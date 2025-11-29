'use client';

import { useState } from 'react';

export interface TaskState {
  taskId: string;
  taskName: string;
  status: string;
  input: Record<string, unknown>;
  output: Record<string, unknown>;
  startTime: string;
  endTime: string;
  duration: string;
}

export interface TaskStateInspectorProps {
  taskState: TaskState | null;
  previousState?: TaskState | null;
}

export function TaskStateInspector({ taskState, previousState }: TaskStateInspectorProps) {
  const [viewMode, setViewMode] = useState<'formatted' | 'raw'>('formatted');

  if (!taskState) {
    return (
      <div
        role="region"
        aria-label="task state inspector"
        className="p-4 text-center text-gray-500"
      >
        No task selected. Click on a task event in the timeline to inspect its state.
      </div>
    );
  }

  const handleCopyOutput = async () => {
    await navigator.clipboard.writeText(JSON.stringify(taskState.output, null, 2));
  };

  const toggleViewMode = () => {
    setViewMode((mode) => (mode === 'formatted' ? 'raw' : 'formatted'));
  };

  const formatJSON = (data: Record<string, unknown>) => {
    if (viewMode === 'raw') {
      return JSON.stringify(data);
    }
    return JSON.stringify(data, null, 2);
  };

  const isValueChanged = (key: string, value: unknown): boolean => {
    if (!previousState) return false;
    const prevOutput = previousState.output as Record<string, unknown>;
    return prevOutput[key] !== value;
  };

  const renderValue = (key: string, value: unknown) => {
    const changed = isValueChanged(key, value);
    return (
      <div key={key} data-testid={changed ? 'changed-value' : undefined}>
        <span className={changed ? 'bg-yellow-200' : ''}>{String(value)}</span>
      </div>
    );
  };

  return (
    <div role="region" aria-label="task state inspector" className="p-4 space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center border-b pb-2">
        <div>
          <h3 className="text-lg font-semibold">{taskState.taskName}</h3>
          <span
            className={`text-sm ${taskState.status === 'Succeeded' ? 'text-green-600' : 'text-red-600'}`}
          >
            {taskState.status}
          </span>
        </div>
        <div className="text-sm text-gray-600">
          <div>Duration: {taskState.duration}</div>
        </div>
      </div>

      {/* Input Section */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <h4 className="font-medium">Input</h4>
        </div>
        <pre className="bg-gray-50 p-3 rounded text-sm overflow-auto max-h-64">
          {formatJSON(taskState.input)}
        </pre>
      </div>

      {/* Output Section */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <h4 className="font-medium">Output</h4>
          <div className="space-x-2">
            <button
              onClick={toggleViewMode}
              className="text-sm text-blue-600 hover:underline"
              aria-label={viewMode === 'formatted' ? 'Switch to raw' : 'Switch to formatted'}
            >
              {viewMode === 'formatted' ? 'Raw' : 'Formatted'}
            </button>
            <button
              onClick={handleCopyOutput}
              className="text-sm text-blue-600 hover:underline"
              aria-label="Copy output"
            >
              Copy Output
            </button>
          </div>
        </div>
        <pre className="bg-gray-50 p-3 rounded text-sm overflow-auto max-h-64">
          {formatJSON(taskState.output)}
        </pre>
        {previousState && (
          <div className="space-y-1">
            {Object.entries(taskState.output).map(([key, value]) => renderValue(key, value))}
          </div>
        )}
      </div>

      {/* Timing Info */}
      <div className="text-sm text-gray-600 space-y-1">
        <div>Start: {new Date(taskState.startTime).toLocaleString()}</div>
        <div>End: {new Date(taskState.endTime).toLocaleString()}</div>
      </div>
    </div>
  );
}
