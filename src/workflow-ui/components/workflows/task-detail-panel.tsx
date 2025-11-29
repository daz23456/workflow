'use client';

import { useState } from 'react';
import type { TaskDetail } from '@/types/workflow';

interface TaskDetailPanelProps {
  task: TaskDetail;
  onClose?: () => void;
}

export function TaskDetailPanel({ task, onClose }: TaskDetailPanelProps) {
  const [httpExpanded, setHttpExpanded] = useState(true);
  const [inputExpanded, setInputExpanded] = useState(true);

  return (
    <div className="flex h-full flex-col bg-white border-l border-gray-200">
      {/* Header with Close Button */}
      <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
        <h2 className="text-xl font-bold text-gray-900">{task.id}</h2>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label="Close task details"
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
        {/* Task Reference */}
        <div className="mb-4">
          <div className="text-sm font-medium text-gray-500">Task Reference</div>
          <div className="mt-1 text-sm text-gray-900">{task.taskRef}</div>
        </div>

        {/* Description */}
        {task.description && (
          <div className="mb-4">
            <div className="text-sm font-medium text-gray-500">Description</div>
            <div className="mt-1 text-sm text-gray-700">{task.description}</div>
          </div>
        )}

        {/* Configuration */}
        {(task.timeout || task.retryCount !== undefined) && (
          <div className="mb-4">
            <div className="text-sm font-medium text-gray-500 mb-2">Configuration</div>
            <div className="grid grid-cols-2 gap-4">
              {task.timeout && (
                <div>
                  <div className="text-xs text-gray-500">Timeout</div>
                  <div className="text-sm font-medium text-gray-900">{task.timeout}</div>
                </div>
              )}
              {task.retryCount !== undefined && (
                <div>
                  <div className="text-xs text-gray-500">Retries</div>
                  <div className="text-sm font-medium text-gray-900">{task.retryCount}</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Dependencies */}
        <div className="mb-4">
          <div className="text-sm font-medium text-gray-500 mb-2">Dependencies</div>
          {task.dependencies && task.dependencies.length > 0 ? (
            <ul className="space-y-1">
              {task.dependencies.map((dep) => (
                <li
                  key={dep}
                  className="text-sm text-gray-700 rounded-md bg-gray-50 px-3 py-1.5 font-mono"
                >
                  {dep}
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-sm text-gray-500 italic">No dependencies</div>
          )}
        </div>

        {/* Input Mapping */}
        {task.inputMapping && Object.keys(task.inputMapping).length > 0 && (
          <div className="mb-4">
            <button
              type="button"
              onClick={() => setInputExpanded(!inputExpanded)}
              className="flex w-full items-center justify-between text-sm font-medium text-gray-900 mb-2"
              aria-label="Toggle input mapping section"
            >
              <span>Input Mapping</span>
              <svg
                className={`h-5 w-5 transition-transform ${inputExpanded ? 'rotate-0' : '-rotate-90'}`}
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
            {inputExpanded && (
              <div className="space-y-2">
                {Object.entries(task.inputMapping).map(([key, value]) => (
                  <div key={key} className="rounded-md bg-gray-50 px-3 py-2">
                    <div className="text-xs font-medium text-gray-700">{key}</div>
                    <div className="text-sm font-mono text-blue-600">{value}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* HTTP Request */}
        {task.httpRequest && (
          <div className="mb-4">
            <button
              type="button"
              onClick={() => setHttpExpanded(!httpExpanded)}
              className="flex w-full items-center justify-between text-sm font-medium text-gray-900 mb-2"
              aria-label="Toggle HTTP request section"
            >
              <span>HTTP Request</span>
              <svg
                className={`h-5 w-5 transition-transform ${httpExpanded ? 'rotate-0' : '-rotate-90'}`}
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
            {httpExpanded && (
              <div className="space-y-3">
                {/* Method and URL */}
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${getHttpMethodColor(task.httpRequest.method)}`}
                  >
                    {task.httpRequest.method}
                  </span>
                  <span className="text-sm font-mono text-gray-700 break-all">
                    {task.httpRequest.url}
                  </span>
                </div>

                {/* Headers */}
                {Object.keys(task.httpRequest.headers).length > 0 && (
                  <div>
                    <div className="text-xs font-medium text-gray-500 mb-1">Headers</div>
                    <div className="space-y-1">
                      {Object.entries(task.httpRequest.headers).map(([key, value]) => (
                        <div key={key} className="rounded-md bg-gray-50 px-3 py-2">
                          <div className="text-xs font-medium text-gray-700">{key}</div>
                          <div className="text-sm font-mono text-gray-600 break-all">{value}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Body */}
                {task.httpRequest.bodyTemplate && (
                  <div>
                    <div className="text-xs font-medium text-gray-500 mb-1">Body</div>
                    <pre className="rounded-md bg-gray-50 px-3 py-2 text-xs font-mono text-gray-700 overflow-x-auto whitespace-pre-wrap break-words">
                      {task.httpRequest.bodyTemplate}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Output Schema */}
        {task.outputSchema && task.outputSchema.properties && (
          <div className="mb-4">
            <div className="text-sm font-medium text-gray-500 mb-2">Output Schema</div>
            <div className="space-y-2">
              {Object.entries(task.outputSchema.properties).map(([key, prop]) => (
                <div key={key} className="rounded-md bg-gray-50 px-3 py-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-900">{key}</span>
                    <span className="text-xs text-gray-500">{prop.type}</span>
                  </div>
                  {prop.description && (
                    <div className="mt-1 text-xs text-gray-600">{prop.description}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Returns Tailwind classes for HTTP method badge color
 */
function getHttpMethodColor(method: string): string {
  switch (method.toUpperCase()) {
    case 'GET':
      return 'bg-blue-100 text-blue-800 border border-blue-200';
    case 'POST':
      return 'bg-green-100 text-green-800 border border-green-200';
    case 'PUT':
    case 'PATCH':
      return 'bg-yellow-100 text-yellow-800 border border-yellow-200';
    case 'DELETE':
      return 'bg-red-100 text-red-800 border border-red-200';
    default:
      return 'bg-gray-100 text-gray-800 border border-gray-200';
  }
}
