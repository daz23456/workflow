'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { WorkflowDetailTabs } from '@/components/workflows/workflow-detail-tabs';
import { buildGraphFromTasks } from '@/lib/utils/build-graph-from-tasks';
import type { WorkflowDetail } from '@/types/workflow';
import type { ExecutionHistoryItem, WorkflowExecutionResponse } from '@/types/execution';

export default function WorkflowDetailPage() {
  const params = useParams();
  const workflowName = params.name as string;

  const [workflow, setWorkflow] = useState<WorkflowDetail | null>(null);
  const [stats, setStats] = useState<any>(null);
  const [executionHistory, setExecutionHistory] = useState<ExecutionHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch workflow details
  useEffect(() => {
    const fetchWorkflowDetails = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Fetch workflow definition
        const workflowRes = await fetch(`/api/workflows/${workflowName}`);
        if (!workflowRes.ok) {
          throw new Error(`Failed to fetch workflow: ${workflowRes.statusText}`);
        }
        const workflowData = await workflowRes.json();

        // Build graph if backend doesn't provide it
        if (!workflowData.graph && workflowData.tasks) {
          workflowData.graph = buildGraphFromTasks(workflowData.tasks);
        }

        setWorkflow(workflowData);

        // Fetch workflow stats (mock for now)
        setStats({
          totalExecutions: 0,
          successRate: 0,
          avgDurationMs: 0,
        });

        // Fetch execution history
        try {
          const historyRes = await fetch(`/api/workflows/${workflowName}/executions`);
          if (historyRes.ok) {
            const historyData = await historyRes.json();
            setExecutionHistory(historyData);
          }
        } catch (err) {
          console.warn('Failed to fetch execution history:', err);
          setExecutionHistory([]);
        }
      } catch (err) {
        console.error('Error fetching workflow details:', err);
        setError(err instanceof Error ? err.message : 'Failed to load workflow');
      } finally {
        setIsLoading(false);
      }
    };

    if (workflowName) {
      fetchWorkflowDetails();
    }
  }, [workflowName]);

  // Handle workflow execution
  const handleExecute = async (input: Record<string, any>): Promise<WorkflowExecutionResponse> => {
    const res = await fetch(`/api/workflows/${workflowName}/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });

    if (!res.ok) {
      throw new Error(`Execution failed: ${res.statusText}`);
    }

    const result = await res.json();

    // Refresh execution history after execution
    try {
      const historyRes = await fetch(`/api/workflows/${workflowName}/executions`);
      if (historyRes.ok) {
        const historyData = await historyRes.json();
        setExecutionHistory(historyData);
      }
    } catch (err) {
      console.warn('Failed to refresh execution history:', err);
    }

    return result;
  };

  // Handle workflow test (dry-run)
  const handleTest = async (input: Record<string, any>) => {
    const res = await fetch(`/api/workflows/${workflowName}/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });

    if (!res.ok) {
      throw new Error(`Test failed: ${res.statusText}`);
    }

    return res.json();
  };

  // Fetch execution details
  const handleFetchExecution = async (executionId: string): Promise<WorkflowExecutionResponse> => {
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
          <p className="mt-2 text-gray-600">{error || `Workflow "${workflowName}" does not exist`}</p>
          <a
            href="/workflows"
            className="mt-4 inline-block rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            Back to Workflows
          </a>
        </div>
      </div>
    );
  }

  // Render workflow detail page
  return (
    <WorkflowDetailTabs
      workflow={workflow}
      stats={stats}
      executionHistory={executionHistory}
      onExecute={handleExecute}
      onTest={handleTest}
      onFetchExecution={handleFetchExecution}
    />
  );
}
