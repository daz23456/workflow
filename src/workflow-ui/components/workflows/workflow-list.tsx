'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useWorkflows } from '@/lib/api/queries';
import { WorkflowFilters } from './workflow-filters';
import { WorkflowCard } from './workflow-card';
import { EmptyState } from './empty-state';

interface WorkflowListProps {
  defaultFilters?: {
    search?: string;
    namespace?: string;
    sort?: string;
  };
}

export function WorkflowList({ defaultFilters }: WorkflowListProps) {
  const router = useRouter();
  const [filters, setFilters] = useState({
    search: defaultFilters?.search || '',
    namespace: defaultFilters?.namespace,
    sort: defaultFilters?.sort || 'name',
  });

  const { data, isLoading, error } = useWorkflows(filters);

  const workflows = data?.workflows || [];

  // Extract unique namespaces from workflows
  const namespaces = workflows.length > 0
    ? Array.from(new Set(workflows.map((w) => w.namespace))).sort()
    : [];

  const handleCardClick = (workflowName: string) => {
    router.push(`/workflows/${workflowName}`);
  };

  if (error) {
    return (
      <div className="p-8">
        <EmptyState
          title="Error loading workflows"
          description="Failed to load workflows. Please try again later."
        />
      </div>
    );
  }

  return (
    <div>
      {/* Filters */}
      <WorkflowFilters
        namespaces={namespaces}
        onFilterChange={setFilters}
        defaultValues={defaultFilters}
        isLoading={isLoading}
      />

      {/* Loading State */}
      {isLoading && (
        <div className="py-12 text-center text-gray-600">
          <p>Loading workflows...</p>
        </div>
      )}

      {/* Empty State - No Workflows */}
      {!isLoading && workflows.length === 0 && !filters.search && !filters.namespace && (
        <EmptyState
          title="No workflows yet"
          description="Get started by creating your first workflow."
        />
      )}

      {/* Empty State - No Results */}
      {!isLoading && workflows.length === 0 && (filters.search || filters.namespace) && (
        <EmptyState
          title="No workflows found"
          description="Try adjusting your filters to find what you're looking for."
        />
      )}

      {/* Workflow Grid */}
      {!isLoading && workflows.length > 0 && (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {workflows.map((workflow) => (
            <WorkflowCard
              key={workflow.name}
              workflow={workflow}
              onClick={() => handleCardClick(workflow.name)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
