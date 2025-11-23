import type { WorkflowListItem } from '@/types/workflow';
import { formatDuration, getSuccessRateVariant, cn } from '@/lib/utils';

interface WorkflowCardProps {
  workflow: WorkflowListItem;
  onClick?: (name: string) => void;
}

export function WorkflowCard({ workflow, onClick }: WorkflowCardProps) {
  const { name, namespace, description, taskCount, stats } = workflow;
  const { totalExecutions, successRate, avgDurationMs, lastExecuted } = stats;

  const successVariant = getSuccessRateVariant(successRate);
  const isNeverExecuted = totalExecutions === 0;

  const handleClick = () => {
    onClick?.(name);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && onClick) {
      onClick(name);
    }
  };

  const badgeColors = {
    success: 'bg-green-100 text-green-800 border-green-200',
    warning: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    destructive: 'bg-red-100 text-red-800 border-red-200',
  };

  return (
    <article
      className={cn(
        'rounded-lg border border-gray-200 bg-white p-6 shadow-sm transition-all hover:shadow-md',
        onClick && 'cursor-pointer hover:border-gray-300'
      )}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex={onClick ? 0 : undefined}
      role="article"
      aria-label={name}
    >
      {/* Header */}
      <div className="mb-3">
        <div className="mb-2 flex items-start justify-between gap-3">
          <h3 className="text-lg font-semibold text-gray-900">{name}</h3>
          <span className="inline-flex shrink-0 rounded-md border bg-gray-50 px-2 py-1 text-xs font-medium text-gray-700">
            {namespace}
          </span>
        </div>
        <p className="text-sm text-gray-600">{description}</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4 border-t border-gray-100 pt-4">
        {/* Success Rate */}
        <div>
          <div className="mb-1 text-xs font-medium text-gray-500">Success Rate</div>
          {isNeverExecuted ? (
            <div className="text-sm font-medium text-gray-400">N/A</div>
          ) : (
            <div
              className={cn(
                'inline-flex rounded-md border px-2 py-1 text-sm font-semibold',
                badgeColors[successVariant]
              )}
            >
              {successRate.toFixed(1)}%
            </div>
          )}
        </div>

        {/* Executions */}
        <div>
          <div className="mb-1 text-xs font-medium text-gray-500">Executions</div>
          <div className="text-sm font-medium text-gray-900">
            {totalExecutions.toLocaleString()}
          </div>
        </div>

        {/* Average Duration */}
        <div>
          <div className="mb-1 text-xs font-medium text-gray-500">Avg Duration</div>
          <div className="text-sm font-medium text-gray-900">
            {formatDuration(avgDurationMs)}
          </div>
        </div>

        {/* Tasks */}
        <div>
          <div className="mb-1 text-xs font-medium text-gray-500">Tasks</div>
          <div className="text-sm font-medium text-gray-900">{taskCount} tasks</div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-4 border-t border-gray-100 pt-3 text-xs text-gray-500">
        {isNeverExecuted ? (
          'Never executed'
        ) : (
          <>Last executed: {new Date(lastExecuted!).toLocaleString()}</>
        )}
      </div>
    </article>
  );
}
