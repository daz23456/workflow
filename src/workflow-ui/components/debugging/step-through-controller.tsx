'use client';

import { useState } from 'react';

export interface ExecutionState {
  executionId: string;
  workflowName: string;
  status: 'Running' | 'Paused' | 'Succeeded' | 'Failed';
  currentTaskId: string | null;
  completedTasks: string[];
  pendingTasks: string[];
}

export interface StepThroughControllerProps {
  executionState: ExecutionState;
  onPause?: () => void;
  onResume?: () => void;
  onStepForward?: () => void;
  onSkipTo?: (taskId: string) => void;
}

export function StepThroughController({
  executionState,
  onPause,
  onResume,
  onStepForward,
  onSkipTo,
}: StepThroughControllerProps) {
  const [showSkipToDropdown, setShowSkipToDropdown] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string>('');

  const { workflowName, status, currentTaskId, completedTasks, pendingTasks } = executionState;

  const totalTasks = completedTasks.length + pendingTasks.length;
  const isRunning = status === 'Running';
  const isPaused = status === 'Paused';
  const isFinished = status === 'Succeeded' || status === 'Failed';

  const handleSkipToClick = () => {
    setShowSkipToDropdown(true);
  };

  const handleConfirmSkipTo = () => {
    if (selectedTaskId && onSkipTo) {
      onSkipTo(selectedTaskId);
      setShowSkipToDropdown(false);
      setSelectedTaskId('');
    }
  };

  const handleCancelSkipTo = () => {
    setShowSkipToDropdown(false);
    setSelectedTaskId('');
  };

  return (
    <div
      role="region"
      aria-label="step-through controller"
      className="p-4 space-y-4 border rounded"
    >
      {/* Header */}
      <div className="flex justify-between items-center border-b pb-2">
        <div>
          <h3 className="text-lg font-semibold">{workflowName}</h3>
          <span
            className={`text-sm ${
              status === 'Succeeded'
                ? 'text-green-600'
                : status === 'Failed'
                  ? 'text-red-600'
                  : status === 'Paused'
                    ? 'text-yellow-600'
                    : 'text-blue-600'
            }`}
          >
            {status}
          </span>
        </div>
        <div className="text-sm text-gray-600">
          Progress: {completedTasks.length} / {totalTasks}
        </div>
      </div>

      {/* Current Task */}
      {currentTaskId && (
        <div className="bg-blue-50 p-3 rounded">
          <div className="font-medium text-sm text-gray-700">Current Task:</div>
          <div className="text-lg">{currentTaskId}</div>
        </div>
      )}

      {/* Controls */}
      {!isFinished && (
        <div className="flex space-x-2">
          {isRunning && (
            <button
              onClick={onPause}
              className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600"
              aria-label="Pause"
            >
              Pause
            </button>
          )}

          {isPaused && (
            <>
              <button
                onClick={onResume}
                className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
                aria-label="Resume"
              >
                Resume
              </button>
              <button
                onClick={onStepForward}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                aria-label="Step Forward"
              >
                Step Forward
              </button>
            </>
          )}

          {!showSkipToDropdown && (
            <button
              onClick={handleSkipToClick}
              className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
              aria-label="Skip to task"
            >
              Skip to Task
            </button>
          )}
        </div>
      )}

      {/* Skip To Dropdown */}
      {showSkipToDropdown && (
        <div className="bg-gray-50 p-3 rounded space-y-2">
          <label htmlFor="task-select" className="block text-sm font-medium text-gray-700">
            Select task:
          </label>
          <select
            id="task-select"
            aria-label="Select task"
            value={selectedTaskId}
            onChange={(e) => setSelectedTaskId(e.target.value)}
            className="w-full px-3 py-2 border rounded"
          >
            <option value="">-- Select a task --</option>
            {pendingTasks.map((taskId) => (
              <option key={taskId} value={taskId}>
                {taskId}
              </option>
            ))}
          </select>
          <div className="flex space-x-2">
            <button
              onClick={handleConfirmSkipTo}
              disabled={!selectedTaskId}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-300"
              aria-label="Confirm"
            >
              Confirm
            </button>
            <button
              onClick={handleCancelSkipTo}
              className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
              aria-label="Cancel"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Task Lists */}
      <div className="grid grid-cols-2 gap-4">
        {/* Completed Tasks */}
        <div>
          <h4 className="font-medium mb-2">Completed Tasks</h4>
          <div className="space-y-1">
            {completedTasks.length === 0 ? (
              <div className="text-sm text-gray-500">No tasks completed yet</div>
            ) : (
              completedTasks.map((taskId) => (
                <div key={taskId} className="p-2 bg-green-50 rounded text-sm">
                  {taskId}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Pending Tasks */}
        <div>
          <h4 className="font-medium mb-2">Pending Tasks</h4>
          <div className="space-y-1">
            {pendingTasks.length === 0 ? (
              <div className="text-sm text-gray-500">No pending tasks</div>
            ) : (
              pendingTasks.map((taskId) => (
                <div
                  key={taskId}
                  className={`p-2 rounded text-sm ${
                    taskId === currentTaskId ? 'bg-blue-100 border border-blue-300' : 'bg-gray-50'
                  }`}
                >
                  {taskId}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
