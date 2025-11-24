import type { WorkflowListItem } from '@/types/workflow';
import { formatDuration, getSuccessRateVariant, cn } from '@/lib/utils';
import { Tooltip } from '@/components/ui/tooltip';
import { usePrefetchWorkflowDetail } from '@/lib/api/queries';

interface WorkflowCardProps {
  workflow: WorkflowListItem;
  onClick?: (name: string) => void;
}

export function WorkflowCard({ workflow, onClick }: WorkflowCardProps) {
  const { name, namespace, description, taskCount, stats } = workflow;
  const { totalExecutions, successRate, successRateTrend, avgDurationMs, lastExecuted } = stats;

  const successVariant = getSuccessRateVariant(successRate);
  const isNeverExecuted = totalExecutions === 0;
  const hasTrend = !isNeverExecuted && successRateTrend !== undefined;
  const prefetchWorkflow = usePrefetchWorkflowDetail();

  const handleClick = () => {
    onClick?.(name);
  };

  const handleMouseEnter = () => {
    // Prefetch workflow detail on hover for faster navigation
    prefetchWorkflow(name);
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

  // Generate consistent color for namespace based on hash
  const getNamespaceColor = (ns: string) => {
    const colors = [
      'bg-blue-50 text-blue-700 border-blue-200',
      'bg-purple-50 text-purple-700 border-purple-200',
      'bg-pink-50 text-pink-700 border-pink-200',
      'bg-indigo-50 text-indigo-700 border-indigo-200',
      'bg-cyan-50 text-cyan-700 border-cyan-200',
    ];
    let hash = 0;
    for (let i = 0; i < ns.length; i++) {
      hash = ns.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  return (
    <article
      className={cn(
        'rounded-lg border border-gray-200 bg-white p-6 shadow-sm transition-all duration-200 ease-in-out hover:shadow-md',
        onClick && 'cursor-pointer hover:border-gray-300 hover:-translate-y-1 focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-offset-2'
      )}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      onMouseEnter={handleMouseEnter}
      tabIndex={onClick ? 0 : undefined}
      role="article"
      aria-label={name}
    >
      {/* Header */}
      <div className="mb-3">
        <div className="mb-2 flex items-start justify-between gap-3">
          <h3 className="text-lg font-semibold text-gray-900">{name}</h3>
          <span className={cn(
            "inline-flex shrink-0 rounded-md border px-2 py-1 text-xs font-medium",
            getNamespaceColor(namespace)
          )}>
            {namespace}
          </span>
        </div>
        <p className="text-sm text-gray-600">{description}</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4 border-t border-gray-100 pt-4">
        {/* Success Rate */}
        <div>
          <Tooltip content="Percentage of successful executions in the last 30 days">
            <div className="mb-1 text-xs font-medium text-gray-500">Success Rate</div>
          </Tooltip>
          {isNeverExecuted ? (
            <div className="text-sm font-medium text-gray-400">N/A</div>
          ) : (
            <div className="flex flex-col gap-1">
              <div
                className={cn(
                  'inline-flex rounded-md border px-2 py-1 text-sm font-semibold',
                  badgeColors[successVariant]
                )}
              >
                {successRate.toFixed(1)}%
              </div>
              {hasTrend && (
                <div
                  className={cn(
                    'text-xs font-medium',
                    successRateTrend! > 0 ? 'text-green-600' : 'text-red-600'
                  )}
                >
                  {successRateTrend! > 0 ? '↑' : '↓'} {Math.abs(successRateTrend!).toFixed(1)}%
                </div>
              )}
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
          <Tooltip content="Average time to complete workflow execution">
            <div className="mb-1 text-xs font-medium text-gray-500">Avg Duration</div>
          </Tooltip>
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
      <div className="mt-4 border-t border-gray-100 pt-3 text-xs">
        {isNeverExecuted ? (
          <div className="flex items-center gap-1.5">
            <span className="inline-flex h-2 w-2 rounded-full bg-gray-400"></span>
            <span className="font-medium text-gray-600">Never executed</span>
          </div>
        ) : (
          <span className="text-gray-500">Last executed: {new Date(lastExecuted!).toLocaleString()}</span>
        )}
      </div>
    </article>
  );
}
