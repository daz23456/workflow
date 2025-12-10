'use client';

import Link from 'next/link';
import { GitBranch, Box } from 'lucide-react';
import type { BlastRadiusSummary as BlastRadiusSummaryType } from '@/lib/api/types';

interface BlastRadiusSummaryProps {
  summary: BlastRadiusSummaryType;
  onWorkflowClick?: (workflowName: string) => void;
  onTaskClick?: (taskName: string) => void;
}

/**
 * Displays blast radius summary in a flat list format
 * Shows affected workflows and tasks organized by depth level
 */
export function BlastRadiusSummary({
  summary,
  onWorkflowClick,
  onTaskClick,
}: BlastRadiusSummaryProps) {
  const { totalAffectedWorkflows, totalAffectedTasks, byDepth } = summary;

  if (totalAffectedWorkflows === 0 && totalAffectedTasks === 0) {
    return (
      <div className="text-center py-6 text-gray-500 dark:text-gray-400" data-testid="no-impact">
        <Box className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No downstream impact detected</p>
        <p className="text-xs mt-1">This task is not used by any workflows</p>
      </div>
    );
  }

  return (
    <div className="space-y-4" data-testid="blast-radius-summary">
      {/* Summary stats */}
      <div className="flex gap-4 text-sm">
        <div className="flex items-center gap-2">
          <GitBranch className="h-4 w-4 text-blue-500" />
          <span className="font-medium">{totalAffectedWorkflows}</span>
          <span className="text-gray-500 dark:text-gray-400">
            {totalAffectedWorkflows === 1 ? 'workflow' : 'workflows'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Box className="h-4 w-4 text-orange-500" />
          <span className="font-medium">{totalAffectedTasks}</span>
          <span className="text-gray-500 dark:text-gray-400">
            {totalAffectedTasks === 1 ? 'task' : 'tasks'}
          </span>
        </div>
      </div>

      {/* Items by depth */}
      <div className="space-y-3" data-testid="depth-levels">
        {byDepth.map((level) => (
          <DepthLevel
            key={level.depth}
            depth={level.depth}
            workflows={level.workflows}
            tasks={level.tasks}
            onWorkflowClick={onWorkflowClick}
            onTaskClick={onTaskClick}
          />
        ))}
      </div>
    </div>
  );
}

interface DepthLevelProps {
  depth: number;
  workflows: string[];
  tasks: string[];
  onWorkflowClick?: (workflowName: string) => void;
  onTaskClick?: (taskName: string) => void;
}

function DepthLevel({
  depth,
  workflows,
  tasks,
  onWorkflowClick,
  onTaskClick,
}: DepthLevelProps) {
  if (workflows.length === 0 && tasks.length === 0) {
    return null;
  }

  return (
    <div className="border-l-2 border-gray-200 dark:border-gray-700 pl-3" data-testid={`depth-${depth}`}>
      <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
        Depth {depth}
      </div>
      <div className="space-y-1">
        {workflows.map((workflow) => (
          <WorkflowItem
            key={`workflow:${workflow}`}
            name={workflow}
            onClick={onWorkflowClick}
          />
        ))}
        {tasks.map((task) => (
          <TaskItem
            key={`task:${task}`}
            name={task}
            onClick={onTaskClick}
          />
        ))}
      </div>
    </div>
  );
}

interface WorkflowItemProps {
  name: string;
  onClick?: (name: string) => void;
}

function WorkflowItem({ name, onClick }: WorkflowItemProps) {
  const content = (
    <div
      className="flex items-center gap-2 py-1 px-2 rounded hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
      onClick={() => onClick?.(name)}
      data-testid={`workflow-item-${name}`}
    >
      <GitBranch className="h-3.5 w-3.5 text-blue-500 flex-shrink-0" />
      <span className="text-sm text-gray-900 dark:text-gray-100 truncate">{name}</span>
      <span className="text-xs px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
        workflow
      </span>
    </div>
  );

  if (onClick) {
    return content;
  }

  return (
    <Link href={`/workflows/${name}`}>
      {content}
    </Link>
  );
}

interface TaskItemProps {
  name: string;
  onClick?: (name: string) => void;
}

function TaskItem({ name, onClick }: TaskItemProps) {
  const content = (
    <div
      className="flex items-center gap-2 py-1 px-2 rounded hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
      onClick={() => onClick?.(name)}
      data-testid={`task-item-${name}`}
    >
      <Box className="h-3.5 w-3.5 text-orange-500 flex-shrink-0" />
      <span className="text-sm text-gray-900 dark:text-gray-100 truncate">{name}</span>
      <span className="text-xs px-1.5 py-0.5 rounded bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300">
        task
      </span>
    </div>
  );

  if (onClick) {
    return content;
  }

  return (
    <Link href={`/tasks/${name}`}>
      {content}
    </Link>
  );
}
