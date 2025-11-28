'use client';

import { use } from 'react';
import Link from 'next/link';
import {
  useWorkflowDetail,
  useWorkflowExecutions,
  useExecuteWorkflow,
  useDryRun,
  useExecutionDetail
} from '@/lib/api/queries';
import { WorkflowDetailTabs } from '@/components/workflows/workflow-detail-tabs';
import { WorkflowDurationTrendsSection } from '@/components/analytics/workflow-duration-trends-section';
import { buildGraphFromTasks } from '@/lib/utils/build-graph-from-tasks';
import type { WorkflowExecutionResponse } from '@/types/execution';

export default function WorkflowDetailPage({
  params,
}: {
  params: Promise<{ name: string }>;
}) {
  const { name: workflowName } = use(params);

  // Fetch workflow data using TanStack Query
  const { data: workflow, isLoading, error } = useWorkflowDetail(workflowName);
  const { data: executionsData } = useWorkflowExecutions(workflowName, { limit: 10, offset: 0 });

  // Mutations for execute and dry-run
  const executeWorkflow = useExecuteWorkflow(workflowName);
  const dryRunWorkflow = useDryRun(workflowName);

  // Handle workflow execution
  const handleExecute = async (input: Record<string, any>): Promise<WorkflowExecutionResponse> => {
    const result = await executeWorkflow.mutateAsync(input);
    return result;
  };

  // Handle workflow test (dry-run)
  const handleTest = async (input: Record<string, any>) => {
    const result = await dryRunWorkflow.mutateAsync(input);
    return result;
  };

  // Fetch execution details
  const handleFetchExecution = async (executionId: string): Promise<WorkflowExecutionResponse> => {
    // Note: This could be wrapped in a query hook, but since it's called on-demand
    // from the tabs component, we'll keep it as a manual fetch for now
    const res = await fetch(`/api/executions/${executionId}`);
    if (!res.ok) {
      throw new Error(`Failed to fetch execution: ${res.statusText}`);
    }
    return res.json();
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
          <p className="mt-4 text-gray-600">Loading workflow details...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !workflow) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <svg
            className="mx-auto h-16 w-16 text-red-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <h2 className="mt-4 text-xl font-semibold text-gray-900">Workflow Not Found</h2>
          <p className="mt-2 text-gray-600">
            {error instanceof Error ? error.message : `Workflow "${workflowName}" does not exist`}
          </p>
          <Link
            href="/workflows"
            className="mt-4 inline-block rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            Back to Workflows
          </Link>
        </div>
      </div>
    );
  }

  // Build graph if backend doesn't provide it
  const workflowWithGraph = {
    ...workflow,
    graph: workflow.graph || (workflow.tasks ? buildGraphFromTasks(workflow.tasks) : undefined),
  };

  // Mock stats for now (will be replaced with real stats from backend)
  const stats = {
    totalExecutions: executionsData?.total || 0,
    successRate: 0, // TODO: Calculate from execution history
    avgDurationMs: 0, // TODO: Calculate from execution history
  };

  // Render workflow detail page
  return (
    <div>
      {/* Workflow Detail Tabs */}
      <WorkflowDetailTabs
        workflow={workflowWithGraph}
        stats={stats}
        executionHistory={executionsData?.executions || []}
        onExecute={handleExecute}
        onTest={handleTest}
        onFetchExecution={handleFetchExecution}
      />

      {/* Duration Trends Section */}
      <div className="container mx-auto px-6 pb-6">
        <WorkflowDurationTrendsSection workflowName={workflowName} />
      </div>
    </div>
  );
}
