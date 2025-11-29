import { Metadata } from 'next';
import { TaskList } from '@/components/tasks/task-list';

export const metadata: Metadata = {
  title: 'Tasks | Workflow Orchestration',
  description: 'Browse and manage workflow tasks',
};

export default function TasksPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Tasks</h1>
        <p className="mt-2 text-gray-600">
          Browse and manage all workflow tasks. Filter by namespace, search by name, or sort by
          metrics.
        </p>
      </div>

      <TaskList />
    </div>
  );
}
