'use client';

import { useState, useCallback } from 'react';
import { Copy, Check, Code, Timer } from 'lucide-react';
import { WorkflowDetailHeader } from './workflow-detail-header';
import { WorkflowGraphPanel } from './workflow-graph-panel';
import { ExecutionHistoryPanel } from './execution-history-panel';
import { TaskDetailPanel } from './task-detail-panel';
import { ExecutionResultPanel } from './execution-result-panel';
import { ExecuteModal } from './execute-modal';
import { WorkflowDurationTrendsSection } from '../analytics/workflow-duration-trends-section';
import { useWorkflowVersions } from '@/lib/api/queries';
import type { WorkflowDetail, TaskDetail } from '@/types/workflow';
import type { ExecutionHistoryItem, WorkflowExecutionResponse } from '@/types/execution';

interface BenchmarkResult {
  graphBuildDurationMicros: number;
  timestamp: Date;
}

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

type TabType = 'overview' | 'history' | 'analytics' | 'yaml';

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
  const [selectedExecution, setSelectedExecution] = useState<WorkflowExecutionResponse | null>(
    null
  );
  const [executionResult, setExecutionResult] = useState<WorkflowExecutionResponse | null>(null);
  const [modalState, setModalState] = useState<{ isOpen: boolean; mode: 'execute' | 'test' }>({
    isOpen: false,
    mode: 'execute',
  });
  const [yamlCopied, setYamlCopied] = useState(false);

  // Benchmark state - lifted up to survive header re-renders
  const [isBenchmarking, setIsBenchmarking] = useState(false);
  const [benchmarkResult, setBenchmarkResult] = useState<BenchmarkResult | null>(null);

  // Fetch workflow versions (includes YAML definition)
  const { data: versionsData, isLoading: versionsLoading } = useWorkflowVersions(workflow.name, {
    enabled: activeTab === 'yaml',
  });

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
      try {
        const execution = await onFetchExecution(executionId);
        setSelectedExecution(execution);
        setSelectedTaskId(null); // Close task detail if open
      } catch (error) {
        console.error('Failed to fetch execution details:', error);
        // Could show a toast/notification here in the future
      }
    }
  };

  // Open execute modal
  const openExecuteModal = () => {
    setModalState({ isOpen: true, mode: 'execute' });
  };

  // Open test modal
  const openTestModal = () => {
    setModalState({ isOpen: true, mode: 'test' });
  };

  // Close modal
  const closeModal = () => {
    setModalState({ isOpen: false, mode: 'execute' });
  };

  // Handle workflow execution from modal
  const handleExecute = async (input: Record<string, any>) => {
    if (onExecute) {
      try {
        const result = await onExecute(input);
        setExecutionResult(result);
        setSelectedTaskId(null); // Close task panel to show result
      } catch (error) {
        // Create an error result to display in the result panel
        const errorMessage = error instanceof Error ? error.message : 'Execution failed';
        setExecutionResult({
          executionId: `error-${Date.now()}`,
          workflowName: workflow.name,
          success: false,
          output: {},
          executionTimeMs: 0,
          startedAt: new Date().toISOString(),
          error: errorMessage,
        });
        setSelectedTaskId(null); // Close task panel to show error result
      }
    }
  };

  // Handle workflow test from modal
  const handleTest = async (input: Record<string, any>) => {
    if (onTest) {
      try {
        const result = await onTest(input);
        if (result) {
          setExecutionResult(result);
          setSelectedTaskId(null);
        }
      } catch (error) {
        // Create an error result to display in the result panel
        const errorMessage = error instanceof Error ? error.message : 'Test failed';
        setExecutionResult({
          executionId: `test-error-${Date.now()}`,
          workflowName: workflow.name,
          success: false,
          output: {},
          executionTimeMs: 0,
          startedAt: new Date().toISOString(),
          error: errorMessage,
        });
        setSelectedTaskId(null);
      }
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

  // Handle graph benchmark - direct API call to avoid state side effects
  const handleBenchmark = useCallback(async () => {
    setIsBenchmarking(true);
    setBenchmarkResult(null);

    try {
      // Direct fetch to test endpoint to measure graph build time
      // Using empty input - validation may fail but graph build timing is still returned
      const response = await fetch(`/api/workflows/${workflow.name}/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      if (response.ok) {
        const result = await response.json();
        if (result?.graphBuildDurationMicros !== undefined) {
          setBenchmarkResult({
            graphBuildDurationMicros: result.graphBuildDurationMicros,
            timestamp: new Date(),
          });
        }
      }
    } catch (error) {
      console.error('Benchmark failed:', error);
    } finally {
      setIsBenchmarking(false);
    }
  }, [workflow.name]);

  // Get current YAML definition from versions
  const currentYaml = versionsData?.versions?.[0]?.definitionSnapshot || '';

  // Copy YAML to clipboard
  const handleCopyYaml = async () => {
    try {
      await navigator.clipboard.writeText(currentYaml);
      setYamlCopied(true);
      setTimeout(() => setYamlCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = currentYaml;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setYamlCopied(true);
      setTimeout(() => setYamlCopied(false), 2000);
    }
  };

  // Determine if side panel is open
  const isSidePanelOpen =
    selectedTask !== null || selectedExecution !== null || executionResult !== null;

  return (
    <div className="flex h-screen flex-col bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <WorkflowDetailHeader
        workflow={workflow}
        stats={stats}
        onExecute={openExecuteModal}
        onTest={openTestModal}
        onBenchmark={handleBenchmark}
        isBenchmarking={isBenchmarking}
        benchmarkResult={benchmarkResult}
        isExecuting={isExecuting}
        isTesting={isTesting}
      />

      {/* Execute/Test Modal */}
      <ExecuteModal
        isOpen={modalState.isOpen}
        onClose={closeModal}
        workflowName={workflow.name}
        schema={workflow.inputSchema}
        onExecute={handleExecute}
        onTest={handleTest}
        mode={modalState.mode}
      />

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Side: Tabs and Content */}
        <div className={`flex flex-1 flex-col ${isSidePanelOpen ? 'mr-96' : ''}`}>
          {/* Tab Navigation */}
          <div className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
            <nav className="flex px-6" role="tablist">
              <button
                role="tab"
                aria-selected={activeTab === 'overview'}
                onClick={() => setActiveTab('overview')}
                className={`border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
                  activeTab === 'overview'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                Overview
              </button>
              <button
                role="tab"
                aria-selected={activeTab === 'history'}
                onClick={() => setActiveTab('history')}
                className={`border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
                  activeTab === 'history'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                History
              </button>
              <button
                role="tab"
                aria-selected={activeTab === 'analytics'}
                onClick={() => setActiveTab('analytics')}
                className={`border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
                  activeTab === 'analytics'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                Analytics
              </button>
              <button
                role="tab"
                aria-selected={activeTab === 'yaml'}
                onClick={() => setActiveTab('yaml')}
                className={`border-b-2 px-4 py-3 text-sm font-medium transition-colors flex items-center gap-1.5 ${
                  activeTab === 'yaml'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                <Code className="w-4 h-4" />
                YAML
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

            {activeTab === 'history' && (
              <div className="h-full">
                <ExecutionHistoryPanel
                  executions={executionHistory}
                  onExecutionClick={handleExecutionClick}
                  totalCount={stats?.totalExecutions}
                />
              </div>
            )}

            {activeTab === 'analytics' && (
              <div className="h-full">
                <WorkflowDurationTrendsSection workflowName={workflow.name} />
              </div>
            )}

            {activeTab === 'yaml' && (
              <div className="h-full flex flex-col">
                <div className="bg-gray-900 rounded-lg overflow-hidden flex flex-col h-full">
                  {/* Header */}
                  <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700 bg-gray-800">
                    <div className="flex items-center gap-3">
                      <Code className="w-4 h-4 text-purple-400" />
                      <span className="font-medium text-sm text-gray-100">Workflow Definition</span>
                      {versionsData?.versions?.[0] && (
                        <span className="text-xs text-gray-400">
                          Last updated: {new Date(versionsData.versions[0].createdAt).toLocaleString()}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={handleCopyYaml}
                      disabled={!currentYaml}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-gray-700 hover:bg-gray-600 rounded transition-colors text-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {yamlCopied ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-green-400" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          Copy
                        </>
                      )}
                    </button>
                  </div>
                  {/* Content */}
                  <div className="flex-1 overflow-auto">
                    {versionsLoading ? (
                      <div className="flex items-center justify-center h-full text-gray-400">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-400"></div>
                      </div>
                    ) : currentYaml ? (
                      <pre className="p-4 text-sm font-mono text-gray-100 whitespace-pre-wrap">
                        {currentYaml}
                      </pre>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full text-gray-400 p-8">
                        <Code className="w-12 h-12 mb-4 opacity-50" />
                        <p className="text-sm">No YAML definition available</p>
                        <p className="text-xs mt-2 text-gray-500">
                          The workflow definition will appear here once the workflow has been deployed.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Detail Panels */}
        {isSidePanelOpen && (
          <div className="fixed right-0 top-0 bottom-0 w-96 border-l border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg">
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
