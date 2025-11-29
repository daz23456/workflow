import { Metadata } from 'next';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { WorkflowList } from '@/components/workflows/workflow-list';

export const metadata: Metadata = {
  title: 'Workflows | Workflow Orchestration',
  description: 'Browse and manage workflows',
};

export default function WorkflowsPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Workflows</h1>
          <p className="mt-2 text-gray-600">
            Browse and manage all workflows. Filter by namespace, search by name, or sort by metrics.
          </p>
        </div>
        <Link
          href="/workflows/new"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors inline-flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Create New Workflow
        </Link>
      </div>

      <WorkflowList />
    </div>
  );
}
