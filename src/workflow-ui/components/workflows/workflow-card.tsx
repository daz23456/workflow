import type { WorkflowListItem } from '@/types/workflow';
import { ResourceCard } from '@/components/ui/resource-card';
import { usePrefetchWorkflowDetail } from '@/lib/api/queries';

interface WorkflowCardProps {
  workflow: WorkflowListItem;
  onClick?: (name: string) => void;
}

export function WorkflowCard({ workflow, onClick }: WorkflowCardProps) {
  const { name, namespace, description, taskCount, stats } = workflow;
  const prefetchWorkflow = usePrefetchWorkflowDetail();

  const handleMouseEnter = () => {
    prefetchWorkflow(name);
  };

  return (
    <ResourceCard
      name={name}
      namespace={namespace}
      description={description}
      stats={
        stats
          ? {
              totalExecutions: stats.totalExecutions,
              successRate: stats.successRate,
              successRateTrend: stats.successRateTrend,
              avgDurationMs: stats.avgDurationMs,
              lastExecuted: stats.lastExecuted,
            }
          : undefined
      }
      secondaryStat={{
        label: 'Tasks',
        value: taskCount,
        suffix: 'tasks',
        singularSuffix: 'task',
      }}
      onClick={onClick}
      onMouseEnter={handleMouseEnter}
    />
  );
}
