'use client';

import { useState } from 'react';
import { WorkflowDetailHeader } from './workflow-detail-header';
import { WorkflowGraphPanel } from './workflow-graph-panel';
import { ExecutionInputForm } from './execution-input-form';
import { ExecutionHistoryPanel } from './execution-history-panel';
import { TaskDetailPanel } from './task-detail-panel';
import { ExecutionResultPanel } from './execution-result-panel';
import type { WorkflowDetail, TaskDetail } from '@/types/workflow';
import type { ExecutionHistoryItem, WorkflowExecutionResponse } from '@/types/execution';

interface WorkflowDetailTabsProps {
  workflow: WorkflowDetail;
  stats: {
    totalExecutions: number;
    successRate: number;
    avgDurationMs: number;
    lastExecuted?: string;
  };
  executionHistory: ExecutionHistoryItem[];
  onExecute?: (input: Record<string, any>) => Promise<WorkflowExecutionResponse>;
  onTest?: (input: Record<string, any>) => Promise<any>;
  onFetchExecution?: (executionId: string) => Promise<WorkflowExecutionResponse>;
  isExecuting?: boolean;
  isTesting?: boolean;
}

type TabType = 'overview' | 'execute' | 'history';

export function WorkflowDetailTabs({
  workflow,
  stats,
  executionHistory,
  onExecute,
  onTest,
  onFetchExecution,
  isExecuting = false,
  isTesting = false,
}: WorkflowDetailTabsProps) {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [selectedExecution, setSelectedExecution] = useState<WorkflowExecutionResponse | null>(null);
  const [executionResult, setExecutionResult] = useState<WorkflowExecutionResponse | null>(null);

  // Find selected task details
  const selectedTask = selectedTaskId
    ? workflow.tasks.find((task) => task.id === selectedTaskId)
    : null;

  // Handle graph node click
  const handleNodeClick = (taskId: string) => {
    setSelectedTaskId(taskId);
    setSelectedExecution(null); // Close execution result if open
  };

  // Handle execution history item click
  const handleExecutionClick = async (executionId: string) => {
    if (onFetchExecution) {
      const execution = await onFetchExecution(executionId);
      setSelectedExecution(execution);
      setSelectedTaskId(null); // Close task detail if open
    }
  };

  // Handle workflow execution
  const handleExecute = async (input: Record<string, any>) => {
    if (onExecute) {
      const result = await onExecute(input);
      setExecutionResult(result);
    }
  };

  // Handle workflow test
  const handleTest = async (input: Record<string, any>) => {
    if (onTest) {
      await onTest(input);
    }
  };

  // Close task detail panel
  const closeTaskDetail = () => {
    setSelectedTaskId(null);
  };

  // Close execution result panel
  const closeExecutionResult = () => {
    setSelectedExecution(null);
    setExecutionResult(null);
  };

  // Determine if side panel is open
  const isSidePanelOpen = selectedTask !== null || selectedExecution !== null || executionResult !== null;

  return (
    <div className="flex h-screen flex-col bg-gray-50">
      {/* Header */}
      <WorkflowDetailHeader
        workflow={workflow}
        stats={stats}
        onExecute={() => setActiveTab('execute')}
        onTest={() => setActiveTab('execute')}
        isExecuting={isExecuting}
        isTesting={isTesting}
        activeTab={activeTab}
      />

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Side: Tabs and Content */}
        <div className={`flex flex-1 flex-col ${isSidePanelOpen ? 'mr-96' : ''}`}>
          {/* Tab Navigation */}
          <div className="border-b border-gray-200 bg-white">
            <nav className="flex px-6" role="tablist">
              <button
                role="tab"
                aria-selected={activeTab === 'overview'}
                onClick={() => setActiveTab('overview')}
                className={`border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
                  activeTab === 'overview'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                }`}
              >
                Overview
              </button>
              <button
                role="tab"
                aria-selected={activeTab === 'execute'}
                onClick={() => setActiveTab('execute')}
                className={`border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
                  activeTab === 'execute'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                }`}
              >
                Execute
              </button>
              <button
                role="tab"
                aria-selected={activeTab === 'history'}
                onClick={() => setActiveTab('history')}
                className={`border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
                  activeTab === 'history'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                }`}
              >
                History
              </button>
            </nav>
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-auto p-6">
            {activeTab === 'overview' && (
              <div className="h-full">
                <WorkflowGraphPanel
                  graph={workflow.graph || { nodes: [], edges: [], parallelGroups: [] }}
                  onNodeClick={handleNodeClick}
                />
              </div>
            )}

            {activeTab === 'execute' && (
              <div className="mx-auto max-w-2xl">
                <ExecutionInputForm
                  schema={workflow.inputSchema}
                  onSubmit={handleExecute}
                  onTest={handleTest}
                />
                {executionResult && (
                  <div className="mt-4">
                    <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                      <p className="text-sm text-blue-800">
                        Execution completed! View details in the side panel.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'history' && (
              <div className="h-full">
                <ExecutionHistoryPanel
                  executions={executionHistory}
                  onExecutionClick={handleExecutionClick}
                />
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Detail Panels */}
        {isSidePanelOpen && (
          <div className="fixed right-0 top-0 bottom-0 w-96 border-l border-gray-200 bg-white shadow-lg">
            {selectedTask && (
              <TaskDetailPanel task={selectedTask as TaskDetail} onClose={closeTaskDetail} />
            )}
            {(selectedExecution || executionResult) && (
              <ExecutionResultPanel
                execution={(selectedExecution || executionResult)!}
                onClose={closeExecutionResult}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
