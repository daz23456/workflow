import Link from 'next/link';
import type { WorkflowDetail } from '@/types/workflow';

interface WorkflowStats {
  totalExecutions: number;
  successRate: number;
  avgDurationMs: number;
  lastExecuted?: string;
}

interface WorkflowDetailHeaderProps {
  workflow: WorkflowDetail;
  stats: WorkflowStats;
  onExecute?: () => void;
  onTest?: () => void;
  isExecuting?: boolean;
  isTesting?: boolean;
  activeTab?: string;
}

export function WorkflowDetailHeader({
  workflow,
  stats,
  onExecute,
  onTest,
  isExecuting = false,
  isTesting = false,
  activeTab = 'overview',
}: WorkflowDetailHeaderProps) {
  const taskCount = workflow.tasks.length;
  const hasExecutions = stats.totalExecutions > 0;

  return (
    <div className="bg-white border-b border-gray-200">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Breadcrumb Navigation */}
        <nav className="mb-4">
          <Link
            href="/"
            className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 transition-colors duration-150"
          >
            <span className="mr-2">←</span>
            <span>Back to workflows</span>
          </Link>
        </nav>

        {/* Header Content */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          {/* Left: Title and Description */}
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold text-gray-900">{workflow.name}</h1>
              <span
                className={`inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-medium ${getNamespaceColor(
                  workflow.namespace
                )}`}
              >
                {workflow.namespace}
              </span>
            </div>

            <p className="text-gray-600 mb-4">{workflow.description}</p>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {/* Task Count */}
              <div>
                <div className="text-sm text-gray-500">Tasks</div>
                <div className="text-lg font-semibold text-gray-900">
                  {taskCount} {taskCount === 1 ? 'task' : 'tasks'}
                </div>
              </div>

              {/* Success Rate */}
              <div>
                <div className="text-sm text-gray-500">Success Rate</div>
                <div>
                  {hasExecutions ? (
                    <span
                      className={`inline-flex items-center rounded-md px-2 py-0.5 text-sm font-medium ${getSuccessRateBadgeColor(
                        stats.successRate
                      )}`}
                    >
                      {stats.successRate.toFixed(1)}%
                    </span>
                  ) : (
                    <span className="text-lg font-semibold text-gray-400">N/A</span>
                  )}
                </div>
              </div>

              {/* Total Executions */}
              <div>
                <div className="text-sm text-gray-500">Total Executions</div>
                <div className="text-lg font-semibold text-gray-900">
                  {stats.totalExecutions.toLocaleString()}
                </div>
              </div>

              {/* Average Duration */}
              <div>
                <div className="text-sm text-gray-500">Avg Duration</div>
                <div className="text-lg font-semibold text-gray-900">
                  {hasExecutions ? formatDuration(stats.avgDurationMs) : 'N/A'}
                </div>
              </div>
            </div>
          </div>

          {/* Right: Action Buttons - Hidden on Execute tab since form has its own button */}
          {activeTab !== 'execute' && (
            <div className="flex flex-col gap-2 sm:ml-6 sm:flex-shrink-0">
              <button
                onClick={onExecute}
                disabled={isExecuting || isTesting}
                className="inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors duration-150 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed"
                aria-label={isExecuting ? 'Executing workflow' : 'Execute workflow'}
              >
                {isExecuting ? 'Executing...' : 'Execute'}
              </button>

              <button
                onClick={onTest}
                disabled={isExecuting || isTesting}
                className="inline-flex items-center justify-center rounded-md bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm border border-gray-300 transition-colors duration-150 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
                aria-label={isTesting ? 'Testing workflow (dry-run)' : 'Test workflow (dry-run)'}
              >
                {isTesting ? 'Testing...' : 'Test (Dry-run)'}
              </button>
            </div>
          )}
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
 * Returns Tailwind classes for namespace badge color
 */
function getNamespaceColor(namespace: string): string {
  const colors = [
    'bg-blue-50 text-blue-700 border border-blue-200',
    'bg-purple-50 text-purple-700 border border-purple-200',
    'bg-pink-50 text-pink-700 border border-pink-200',
    'bg-indigo-50 text-indigo-700 border border-indigo-200',
    'bg-cyan-50 text-cyan-700 border border-cyan-200',
  ];

  // Hash function for consistent color
  let hash = 0;
  for (let i = 0; i < namespace.length; i++) {
    hash = namespace.charCodeAt(i) + ((hash << 5) - hash);
  }

  return colors[Math.abs(hash) % colors.length];
}

/**
 * Returns Tailwind classes for success rate badge color
 */
function getSuccessRateBadgeColor(successRate: number): string {
  if (successRate >= 90) {
    return 'bg-green-100 text-green-800 border border-green-200';
  }
  if (successRate >= 70) {
    return 'bg-yellow-100 text-yellow-800 border border-yellow-200';
  }
  return 'bg-red-100 text-red-800 border border-red-200';
}
