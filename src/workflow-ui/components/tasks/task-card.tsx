import type { Task } from '@/types/task';
import { ResourceCard } from '@/components/ui/resource-card';
import { usePrefetchTaskDetail } from '@/lib/api/queries';

interface TaskCardProps {
  task: Task;
  onClick?: (name: string) => void;
  onTagClick?: (tag: string) => void;
  onCategoryClick?: (category: string) => void;
}

export function TaskCard({ task, onClick, onTagClick, onCategoryClick }: TaskCardProps) {
  const { name, namespace, description, tags, category } = task;
  const prefetchTask = usePrefetchTaskDetail();

  // Handle missing stats gracefully
  const hasStats = 'stats' in task && task.stats !== undefined;

  const handleMouseEnter = () => {
    prefetchTask(name);
  };

  return (
    <ResourceCard
      name={name}
      namespace={namespace}
      description={description}
      tags={tags}
      categories={category ? [category] : undefined}
      stats={
        hasStats
          ? {
              totalExecutions: task.stats.totalExecutions,
              successRate: task.stats.successRate,
              avgDurationMs: task.stats.avgDurationMs,
              lastExecuted: task.stats.lastExecuted,
            }
          : undefined
      }
      secondaryStat={{
        label: 'Used By',
        value: hasStats ? task.stats.usedByWorkflows : 0,
        suffix: 'workflows',
        singularSuffix: 'workflow',
      }}
      onClick={onClick}
      onMouseEnter={handleMouseEnter}
      onTagClick={onTagClick}
      onCategoryClick={onCategoryClick}
    />
  );
}
