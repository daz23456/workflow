import { Metadata } from 'next';
import { WorkflowList } from '@/components/workflows/workflow-list';

export const metadata: Metadata = {
  title: 'Workflows | Workflow Orchestration',
  description: 'Browse and manage workflows',
};

export default function WorkflowsPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Workflows</h1>
        <p className="mt-2 text-gray-600">
          Browse and manage all workflows. Filter by namespace, search by name, or sort by metrics.
        </p>
      </div>

      <WorkflowList />
    </div>
  );
}
