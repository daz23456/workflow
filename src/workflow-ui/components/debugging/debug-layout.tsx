'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { ExecutionTimeline, type ExecutionEvent } from './execution-timeline';
import { VariableWatcher, type Variable } from './variable-watcher';
import { WorkflowGraphPanel, type ExecutionState } from '@/components/workflows/workflow-graph-panel';
import type { WorkflowGraph } from '@/types/workflow';
import type { ExecutionTraceResponse } from '@/lib/api/types';
import type { WorkflowExecutionResponse } from '@/types/execution';

type DebugTab = 'timeline';

/**
 * Format time in microseconds with appropriate unit display
 * @param microseconds Time value in microseconds
 * @returns Formatted string like "500μs", "1.50ms", or "1.234s"
 */
function formatMicroseconds(microseconds: number): string {
  if (microseconds < 1000) {
    return `${Math.round(microseconds)}μs`;
  }
  if (microseconds < 1_000_000) {
    return `${(microseconds / 1000).toFixed(2)}ms`;
  }
  return `${(microseconds / 1_000_000).toFixed(3)}s`;
}

/**
 * Convert milliseconds to microseconds and format
 */
function formatMillisecondsAsMicroseconds(milliseconds: number): string {
  return formatMicroseconds(milliseconds * 1000);
}

export interface DebugLayoutProps {
  executionId: string;
  workflowName: string;
  executionDetail: WorkflowExecutionResponse;
  executionTrace: ExecutionTraceResponse;
  /** Pre-computed workflow graph from workflow detail (same as workflow overview) */
  workflowGraph?: WorkflowGraph;
}

/**
 * Converts execution trace to timeline events
 */
function traceToEvents(trace: ExecutionTraceResponse): ExecutionEvent[] {
  const events: ExecutionEvent[] = [];

  // Add workflow start event
  events.push({
    id: `workflow-start-${trace.executionId}`,
    type: 'workflow_started',
    timestamp: trace.startedAt,
    workflowName: trace.workflowName,
  });

  // Add task events
  trace.taskTimings.forEach((timing) => {
    events.push({
      id: `task-start-${timing.taskId}`,
      type: 'task_started',
      timestamp: timing.startedAt,
      taskId: timing.taskId,
      taskName: timing.taskRef,
    });

    if (timing.completedAt) {
      events.push({
        id: `task-complete-${timing.taskId}`,
        type: 'task_completed',
        timestamp: timing.completedAt,
        taskId: timing.taskId,
        taskName: timing.taskRef,
        status: timing.success ? 'Succeeded' : 'Failed',
      });
    }
  });

  // Add workflow end event
  if (trace.completedAt) {
    events.push({
      id: `workflow-complete-${trace.executionId}`,
      type: 'workflow_completed',
      timestamp: trace.completedAt,
      workflowName: trace.workflowName,
    });
  }

  // Sort by timestamp
  return events.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
}

/**
 * Converts execution detail and trace to WorkflowGraph format for visualization
 */
function executionToWorkflowGraph(
  detail: WorkflowExecutionResponse,
  trace: ExecutionTraceResponse
): WorkflowGraph {
  const nodes: WorkflowGraph['nodes'] = detail.tasks.map((task, index) => ({
    id: task.taskId,
    type: 'task' as const,
    data: {
      label: task.taskRef || task.taskId,
      taskRef: task.taskRef,
    },
    position: { x: 0, y: index * 100 }, // Will be recalculated by layout
  }));

  // Create edges from dependency order in trace
  const edges: WorkflowGraph['edges'] = [];

  // Build mappings: taskRef -> taskId and taskId -> dependencies
  const taskRefToId = new Map<string, string>();
  detail.tasks.forEach((task) => {
    if (task.taskRef) {
      taskRefToId.set(task.taskRef, task.taskId);
    }
    taskRefToId.set(task.taskId, task.taskId); // Also map taskId to itself
  });

  // Build a map of taskId to dependency info
  const dependencyMap = new Map<string, string[]>();
  trace.dependencyOrder.forEach((dep) => {
    dependencyMap.set(dep.taskId, dep.dependsOn);
  });

  // Create edges from dependencies
  detail.tasks.forEach((task) => {
    const deps = dependencyMap.get(task.taskId) || [];
    deps.forEach((depRef) => {
      // depRef could be either taskId or taskRef, resolve to taskId
      const sourceId = taskRefToId.get(depRef) || depRef;
      edges.push({
        id: `edge-${sourceId}-${task.taskId}`,
        source: sourceId,
        target: task.taskId,
      });
    });
  });

  // If no dependency edges were created, fall back to sequential order
  if (edges.length === 0 && nodes.length > 1) {
    for (let i = 0; i < nodes.length - 1; i++) {
      edges.push({
        id: `edge-${nodes[i].id}-${nodes[i + 1].id}`,
        source: nodes[i].id,
        target: nodes[i + 1].id,
      });
    }
  }

  // Use planned parallel groups from trace
  const parallelGroups: WorkflowGraph['parallelGroups'] = trace.plannedParallelGroups.map(
    (group) => ({
      level: group.level,
      taskIds: group.taskIds,
    })
  );

  return { nodes, edges, parallelGroups };
}

/**
 * Converts trace and detail to execution state for graph
 */
function traceToExecutionState(
  trace: ExecutionTraceResponse,
  detail: WorkflowExecutionResponse,
  currentTimestamp?: string
): ExecutionState {
  const completedTasks: string[] = [];
  const runningTasks: string[] = [];
  const failedTasks: string[] = [];
  const pendingTasks: string[] = [];
  const taskData: Record<string, unknown> = {};
  const taskErrors: Record<string, string> = {};
  const taskTimings: Record<string, { startedAt: string; completedAt?: string; durationMs?: number }> = {};

  // If we have a current timestamp, filter based on it
  const currentTime = currentTimestamp ? new Date(currentTimestamp).getTime() : Date.now();

  trace.taskTimings.forEach((timing) => {
    const startTime = new Date(timing.startedAt).getTime();
    const endTime = timing.completedAt ? new Date(timing.completedAt).getTime() : null;

    // Store timing info
    taskTimings[timing.taskId] = {
      startedAt: timing.startedAt,
      completedAt: timing.completedAt,
      durationMs: timing.durationMs,
    };

    if (startTime > currentTime) {
      pendingTasks.push(timing.taskId);
    } else if (endTime && endTime <= currentTime) {
      if (timing.success) {
        completedTasks.push(timing.taskId);
      } else {
        failedTasks.push(timing.taskId);
      }
    } else {
      runningTasks.push(timing.taskId);
    }
  });

  // Get task outputs from detail
  detail.tasks.forEach((task) => {
    if (task.output) {
      taskData[task.taskId] = task.output;
    }
    if (task.error) {
      taskErrors[task.taskId] = task.error;
    }
  });

  return {
    completedTasks,
    runningTasks,
    failedTasks,
    pendingTasks,
    taskData,
    taskErrors,
    taskTimings,
  };
}

/**
 * Converts execution detail to variables for watcher
 */
function detailToVariables(detail: WorkflowExecutionResponse): Variable[] {
  const variables: Variable[] = [];

  // Add workflow input variables
  if (detail.input) {
    Object.entries(detail.input).forEach(([key, value]) => {
      variables.push({
        name: `input.${key}`,
        value,
        timestamp: detail.startedAt,
      });
    });
  }

  // Add task output variables
  detail.tasks.forEach((task) => {
    if (task.output) {
      Object.entries(task.output as Record<string, unknown>).forEach(([key, value]) => {
        variables.push({
          name: `tasks.${task.taskId}.output.${key}`,
          value,
          timestamp: task.completedAt || detail.startedAt,
        });
      });
    }
  });

  // Add workflow output variables
  if (detail.output) {
    Object.entries(detail.output).forEach(([key, value]) => {
      variables.push({
        name: `output.${key}`,
        value,
        timestamp: detail.completedAt || detail.startedAt,
      });
    });
  }

  return variables;
}

/**
 * Main debug layout component that orchestrates all debugging tools
 */
export function DebugLayout({
  executionId,
  workflowName,
  executionDetail,
  executionTrace,
  workflowGraph: providedGraph,
}: DebugLayoutProps) {
  const [activeTab, setActiveTab] = useState<DebugTab>('timeline');
  const [currentTimestamp, setCurrentTimestamp] = useState<string | null>(null);
  const [pinnedVariables, setPinnedVariables] = useState<string[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  // Convert data for components
  const events = useMemo(() => traceToEvents(executionTrace), [executionTrace]);

  // Use provided graph (from workflow detail) or fall back to reconstructed graph
  const workflowGraph = useMemo(
    () => providedGraph || executionToWorkflowGraph(executionDetail, executionTrace),
    [providedGraph, executionDetail, executionTrace]
  );

  const executionState = useMemo(
    () => traceToExecutionState(executionTrace, executionDetail, currentTimestamp || undefined),
    [executionTrace, executionDetail, currentTimestamp]
  );

  const variables = useMemo(() => detailToVariables(executionDetail), [executionDetail]);

  // Handle timeline time change
  const handleTimeChange = (timestamp: string) => {
    setCurrentTimestamp(timestamp);
  };

  // Handle variable pin toggle
  const handlePinVariable = (variableName: string) => {
    setPinnedVariables((prev) =>
      prev.includes(variableName)
        ? prev.filter((v) => v !== variableName)
        : [...prev, variableName]
    );
  };

  // Handle node click in graph
  const handleNodeClick = (nodeId: string) => {
    // Filter out special visualization nodes (e.g., __input__, __output__)
    if (nodeId.startsWith('__')) return;
    setSelectedNodeId(nodeId);
  };

  // Get selected node details
  const selectedNodeData = useMemo(() => {
    if (!selectedNodeId) return null;

    // When workflowGraph is provided from workflow detail, node IDs are WorkflowTaskStep.id
    // which may differ from taskId (GUID) and taskRef (CRD name).
    // First try direct match on taskId or taskRef
    let task = executionDetail.tasks.find(
      (t) => t.taskId === selectedNodeId || t.taskRef === selectedNodeId
    );

    // If no match, look up the graph node's taskRef and match against that
    if (!task && workflowGraph) {
      const graphNode = workflowGraph.nodes.find((n) => n.id === selectedNodeId);
      if (graphNode?.data?.taskRef) {
        task = executionDetail.tasks.find(
          (t) => t.taskRef === graphNode.data.taskRef || t.taskId === graphNode.data.taskRef
        );
      }
    }

    if (!task) return null;

    // Use task.taskId for lookups since executionState/trace use taskIds, not taskRefs
    const taskId = task.taskId;
    const timing = executionTrace.taskTimings.find(
      (t) => t.taskId === taskId || t.taskRef === task.taskRef
    );

    // Determine status from executionState (uses taskIds)
    let status = 'pending';
    if (executionState.completedTasks?.includes(taskId)) {
      status = task.error ? 'failed' : 'completed';
    } else if (executionState.runningTasks?.includes(taskId)) {
      status = 'running';
    } else if (executionState.failedTasks?.includes(taskId)) {
      status = 'failed';
    }

    return {
      id: selectedNodeId,
      label: task.taskRef || task.taskId,
      status,
      data: task.output,
      error: task.error,
      timing: timing
        ? {
            startedAt: timing.startedAt,
            completedAt: timing.completedAt,
            durationMs: timing.durationMs,
          }
        : undefined,
    };
  }, [selectedNodeId, executionDetail, executionTrace, executionState, workflowGraph]);

  const tabs = [
    { id: 'timeline' as const, label: 'Timeline' },
  ];

  return (
    <div className="flex h-full flex-col bg-gray-50">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href={`/workflows/${encodeURIComponent(workflowName)}`}
              className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 19l-7-7m0 0l7-7m-7 7h18"
                />
              </svg>
              Back to Workflow
            </Link>
            <div className="h-4 w-px bg-gray-300" />
            <h1 className="text-lg font-semibold text-gray-900">
              Debugging: <span className="font-mono text-sm">{executionId.slice(0, 8)}...</span>
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`rounded-full px-3 py-1 text-sm font-medium ${
                executionDetail.success
                  ? 'bg-green-100 text-green-800'
                  : 'bg-red-100 text-red-800'
              }`}
            >
              {executionDetail.success ? 'Succeeded' : 'Failed'}
            </span>
            <span className="text-sm text-gray-500">
              {formatMillisecondsAsMicroseconds(executionDetail.executionTimeMs)}
            </span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel: Graph + Task Details */}
        <div className="w-3/5 border-r border-gray-200 bg-white flex flex-col">
          {/* Graph - takes 50% height */}
          <div className="h-1/2 border-b border-gray-200 p-4">
            <WorkflowGraphPanel
              graph={workflowGraph}
              executionState={executionState}
              direction="TB"
              onNodeClick={handleNodeClick}
            />
          </div>

          {/* Task Details Panel */}
          <div className="h-1/2 overflow-auto p-4">
            {selectedNodeData ? (
              <div className="space-y-4">
                <h4 className="font-semibold text-gray-900">Task Details</h4>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="font-medium text-gray-700">ID:</span>{' '}
                    <span className="font-mono text-gray-600">{selectedNodeData.id}</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Name:</span>{' '}
                    <span className="text-gray-900">{selectedNodeData.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-700">Status:</span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        selectedNodeData.status === 'completed'
                          ? 'bg-green-100 text-green-800'
                          : selectedNodeData.status === 'running'
                            ? 'bg-blue-100 text-blue-800'
                            : selectedNodeData.status === 'failed'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {selectedNodeData.status}
                    </span>
                  </div>

                  {/* Timing information */}
                  {selectedNodeData.timing && (
                    <>
                      <div>
                        <span className="font-medium text-gray-700">Started:</span>{' '}
                        <span className="text-gray-600">
                          {new Date(selectedNodeData.timing.startedAt).toISOString().substring(11, 23)}
                        </span>
                      </div>
                      {selectedNodeData.timing.completedAt && (
                        <div>
                          <span className="font-medium text-gray-700">Completed:</span>{' '}
                          <span className="text-gray-600">
                            {new Date(selectedNodeData.timing.completedAt).toISOString().substring(11, 23)}
                          </span>
                        </div>
                      )}
                      {selectedNodeData.timing.durationMs !== undefined && (
                        <div>
                          <span className="font-medium text-gray-700">Duration:</span>{' '}
                          <span className="text-gray-600">
                            {formatMillisecondsAsMicroseconds(selectedNodeData.timing.durationMs)}
                          </span>
                        </div>
                      )}
                    </>
                  )}

                  {/* Only show data when task is completed */}
                  {selectedNodeData.status === 'completed' && selectedNodeData.data && (
                    <div className="mt-3">
                      <span className="font-medium text-gray-700">Output Data:</span>
                      <pre className="mt-1 bg-gray-50 p-3 rounded-lg text-xs overflow-auto max-h-48 border border-gray-200">
                        {JSON.stringify(selectedNodeData.data, null, 2)}
                      </pre>
                    </div>
                  )}

                  {/* Error message */}
                  {selectedNodeData.error && (
                    <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                      <span className="font-medium text-red-700">Error:</span>
                      <p className="mt-1 text-sm text-red-600">{selectedNodeData.error}</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">
                <p>Click a task node to view details</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Panel: Tools */}
        <div className="w-2/5 flex flex-col overflow-hidden">
          {/* Tabs */}
          <div className="border-b border-gray-200 bg-white px-4">
            <nav className="flex gap-4" aria-label="Debug tools">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`border-b-2 py-3 px-1 text-sm font-medium transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-auto bg-white">
            {activeTab === 'timeline' && (
              <div className="space-y-4">
                <ExecutionTimeline events={events} onTimeChange={handleTimeChange} />
                <div className="border-t border-gray-200">
                  <VariableWatcher
                    variables={variables}
                    pinnedVariables={pinnedVariables}
                    onPin={handlePinVariable}
                    groupBySource={true}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
