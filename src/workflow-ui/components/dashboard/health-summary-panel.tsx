'use client';

import { useState } from 'react';
import { RefreshCw, CheckCircle, AlertTriangle, XCircle, HelpCircle, ChevronDown, ChevronRight } from 'lucide-react';
import { useHealthSummary } from '@/lib/api/queries';
import type { HealthState, WorkflowHealthStatus, TaskHealthStatus } from '@/lib/api/types';

// ============================================================================
// Health Indicator Component
// ============================================================================

interface HealthIndicatorProps {
  status: Lowercase<HealthState>;
  count: number;
  label: string;
}

function HealthIndicator({ status, count, label }: HealthIndicatorProps) {
  const config = {
    healthy: {
      bg: 'bg-green-100 dark:bg-green-900/30',
      text: 'text-green-800 dark:text-green-200',
      Icon: CheckCircle,
    },
    degraded: {
      bg: 'bg-yellow-100 dark:bg-yellow-900/30',
      text: 'text-yellow-800 dark:text-yellow-200',
      Icon: AlertTriangle,
    },
    unhealthy: {
      bg: 'bg-red-100 dark:bg-red-900/30',
      text: 'text-red-800 dark:text-red-200',
      Icon: XCircle,
    },
    unknown: {
      bg: 'bg-gray-100 dark:bg-gray-700/30',
      text: 'text-gray-800 dark:text-gray-200',
      Icon: HelpCircle,
    },
  };

  const { bg, text, Icon } = config[status];

  return (
    <div
      className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg ${bg}`}
      data-testid={`health-indicator-${status}`}
    >
      <Icon className={`h-5 w-5 ${text}`} aria-hidden="true" />
      <span className={`text-xl font-bold ${text}`}>{count}</span>
      <span className={`text-xs ${text} opacity-80`}>{label}</span>
    </div>
  );
}

// ============================================================================
// Workflow Health Row Component
// ============================================================================

interface WorkflowHealthRowProps {
  workflow: WorkflowHealthStatus;
  isExpanded: boolean;
  onToggle: () => void;
}

function WorkflowHealthRow({ workflow, isExpanded, onToggle }: WorkflowHealthRowProps) {
  const statusColors = {
    Healthy: 'text-green-600 dark:text-green-400',
    Degraded: 'text-yellow-600 dark:text-yellow-400',
    Unhealthy: 'text-red-600 dark:text-red-400',
    Unknown: 'text-gray-600 dark:text-gray-400',
  };

  const statusIcons = {
    Healthy: CheckCircle,
    Degraded: AlertTriangle,
    Unhealthy: XCircle,
    Unknown: HelpCircle,
  };

  const Icon = statusIcons[workflow.overallHealth];

  return (
    <div className="border-b border-gray-100 dark:border-gray-700 last:border-b-0">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 py-2 px-1 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
        aria-expanded={isExpanded}
        data-testid={`workflow-row-${workflow.workflowName}`}
      >
        {isExpanded ? (
          <ChevronDown className="h-4 w-4 text-gray-400" />
        ) : (
          <ChevronRight className="h-4 w-4 text-gray-400" />
        )}
        <Icon className={`h-4 w-4 ${statusColors[workflow.overallHealth]}`} aria-hidden="true" />
        <span className="flex-1 text-sm text-left text-gray-900 dark:text-gray-100 truncate">
          {workflow.workflowName}
        </span>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {workflow.tasks.length} {workflow.tasks.length === 1 ? 'endpoint' : 'endpoints'}
        </span>
      </button>

      {isExpanded && workflow.tasks.length > 0 && (
        <div className="pl-8 pr-2 pb-2 space-y-1" data-testid={`task-list-${workflow.workflowName}`}>
          {workflow.tasks.map((task) => (
            <TaskHealthItem key={task.taskId} task={task} />
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Task Health Item Component
// ============================================================================

interface TaskHealthItemProps {
  task: TaskHealthStatus;
}

function TaskHealthItem({ task }: TaskHealthItemProps) {
  const statusColors = {
    Healthy: 'bg-green-500',
    Degraded: 'bg-yellow-500',
    Unhealthy: 'bg-red-500',
    Unknown: 'bg-gray-500',
  };

  return (
    <div
      className="flex items-center gap-2 text-xs py-1 px-2 rounded bg-gray-50 dark:bg-gray-800/50"
      data-testid={`task-item-${task.taskId}`}
    >
      <span className={`w-2 h-2 rounded-full ${statusColors[task.status]}`} aria-hidden="true" />
      <span className="flex-1 text-gray-700 dark:text-gray-300 truncate" title={task.url}>
        {task.taskRef}
      </span>
      {task.reachable && task.statusCode && (
        <span className="text-gray-500 dark:text-gray-400">{task.statusCode}</span>
      )}
      <span className="text-gray-500 dark:text-gray-400">{task.latencyMs}ms</span>
      {task.errorMessage && (
        <span className="text-red-500 dark:text-red-400 truncate max-w-32" title={task.errorMessage}>
          {task.errorMessage}
        </span>
      )}
    </div>
  );
}

// ============================================================================
// Workflow Health List Component
// ============================================================================

interface WorkflowHealthListProps {
  workflows: WorkflowHealthStatus[];
  maxItems?: number;
}

function WorkflowHealthList({ workflows, maxItems = 5 }: WorkflowHealthListProps) {
  const [expanded, setExpanded] = useState<string | null>(null);

  if (workflows.length === 0) {
    return (
      <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4" data-testid="no-workflows-message">
        No workflows with health data
      </p>
    );
  }

  const visibleWorkflows = workflows.slice(0, maxItems);
  const remainingCount = workflows.length - maxItems;

  return (
    <div className="divide-y divide-gray-100 dark:divide-gray-700" data-testid="workflow-health-list">
      {visibleWorkflows.map((wf) => (
        <WorkflowHealthRow
          key={wf.workflowName}
          workflow={wf}
          isExpanded={expanded === wf.workflowName}
          onToggle={() => setExpanded(expanded === wf.workflowName ? null : wf.workflowName)}
        />
      ))}
      {remainingCount > 0 && (
        <p className="text-xs text-gray-500 dark:text-gray-400 py-2 text-center" data-testid="more-workflows-count">
          +{remainingCount} more {remainingCount === 1 ? 'workflow' : 'workflows'}
        </p>
      )}
    </div>
  );
}

// ============================================================================
// Skeleton Loading Component
// ============================================================================

export function HealthSummaryPanelSkeleton() {
  return (
    <div className="theme-card overflow-hidden animate-pulse" data-testid="health-panel-skeleton">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-32" />
      </div>
      <div className="p-4">
        <div className="grid grid-cols-4 gap-2 mb-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 bg-gray-200 dark:bg-gray-700 rounded-lg" />
          ))}
        </div>
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-10 bg-gray-200 dark:bg-gray-700 rounded" />
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Presentational Component (for Storybook)
// ============================================================================

export interface HealthSummaryPanelContentProps {
  data?: {
    healthyCount: number;
    degradedCount: number;
    unhealthyCount: number;
    unknownCount: number;
    workflows: WorkflowHealthStatus[];
    generatedAt?: string;
  };
  isFetching?: boolean;
  onRefresh?: () => void;
}

export function HealthSummaryPanelContent({
  data,
  isFetching = false,
  onRefresh,
}: HealthSummaryPanelContentProps) {
  return (
    <div className="theme-card overflow-hidden" data-testid="health-summary-panel">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Service Health</h2>
        <button
          onClick={onRefresh}
          disabled={isFetching}
          className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
          title="Refresh health status"
          aria-label="Refresh health status"
          data-testid="refresh-button"
        >
          <RefreshCw className={`h-4 w-4 text-gray-600 dark:text-gray-400 ${isFetching ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Health status indicators */}
        <div className="grid grid-cols-4 gap-2 mb-4" data-testid="health-indicators">
          <HealthIndicator status="healthy" count={data?.healthyCount ?? 0} label="Healthy" />
          <HealthIndicator status="degraded" count={data?.degradedCount ?? 0} label="Degraded" />
          <HealthIndicator status="unhealthy" count={data?.unhealthyCount ?? 0} label="Unhealthy" />
          <HealthIndicator status="unknown" count={data?.unknownCount ?? 0} label="Unknown" />
        </div>

        {/* Workflow health list */}
        <WorkflowHealthList workflows={data?.workflows ?? []} />

        {/* Last updated timestamp */}
        {data?.generatedAt && (
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-3 text-right" data-testid="last-updated">
            Last updated: {new Date(data.generatedAt).toLocaleTimeString()}
          </p>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Main Health Summary Panel Component
// ============================================================================

export function HealthSummaryPanel() {
  const { data, isLoading, refetch, isFetching } = useHealthSummary();

  if (isLoading) {
    return <HealthSummaryPanelSkeleton />;
  }

  return (
    <HealthSummaryPanelContent
      data={data}
      isFetching={isFetching}
      onRefresh={() => refetch()}
    />
  );
}
