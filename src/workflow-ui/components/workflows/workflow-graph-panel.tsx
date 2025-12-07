'use client';

import { useMemo } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  Controls,
  Background,
  BackgroundVariant,
  Node,
  Edge,
  MarkerType,
} from '@xyflow/react';
import type { WorkflowGraph } from '@/types/workflow';
import { layoutGraph, type LayoutDirection } from '@/lib/utils/graph-layout';
import { InputNode } from '@/components/builder/input-node';
import { OutputNode } from '@/components/builder/output-node';
import '@xyflow/react/dist/style.css';

// Register custom node types for Input/Output visualization
const nodeTypes = {
  input: InputNode,
  output: OutputNode,
} as any;

export interface ExecutionState {
  completedTasks?: string[];
  runningTasks?: string[];
  failedTasks?: string[];
  pendingTasks?: string[];
  /** Task output data keyed by task ID (used for debugging views) */
  taskData?: Record<string, unknown>;
  /** Task error messages keyed by task ID (used for debugging views) */
  taskErrors?: Record<string, string>;
  /** Task timing info keyed by task ID (used for debugging views) */
  taskTimings?: Record<string, { startedAt: string; completedAt?: string; durationMs?: number }>;
}

interface WorkflowGraphPanelProps {
  graph: WorkflowGraph;
  direction?: LayoutDirection;
  onNodeClick?: (nodeId: string) => void;
  executionState?: ExecutionState;
  /** Whether to show Input/Output nodes. Defaults to true. */
  showInputOutput?: boolean;
}

/**
 * Checks if a node is part of any parallel group
 */
function isParallelNode(nodeId: string, parallelGroups: WorkflowGraph['parallelGroups']): boolean {
  return parallelGroups.some((group) => group.taskIds.includes(nodeId));
}

/**
 * Gets node status from execution state
 */
function getNodeStatus(nodeId: string, executionState?: ExecutionState): string {
  if (!executionState) return 'default';
  if (executionState.completedTasks?.includes(nodeId)) return 'completed';
  if (executionState.runningTasks?.includes(nodeId)) return 'running';
  if (executionState.failedTasks?.includes(nodeId)) return 'failed';
  if (executionState.pendingTasks?.includes(nodeId)) return 'pending';
  return 'default';
}

/**
 * Gets node style based on execution status
 */
function getNodeStatusStyle(status: string, isParallel: boolean): React.CSSProperties {
  const baseStyle: React.CSSProperties = {
    borderRadius: '8px',
    padding: '10px 20px',
    fontSize: '14px',
    fontWeight: isParallel ? '600' : '400',
  };

  switch (status) {
    case 'completed':
      return { ...baseStyle, background: '#dcfce7', border: '2px solid #22c55e' };
    case 'running':
      return { ...baseStyle, background: '#dbeafe', border: '2px solid #3b82f6' };
    case 'failed':
      return { ...baseStyle, background: '#fee2e2', border: '2px solid #ef4444' };
    case 'pending':
      return { ...baseStyle, background: '#f3f4f6', border: '1px solid #d1d5db' };
    default:
      return {
        ...baseStyle,
        background: isParallel ? '#e0f2fe' : '#ffffff',
        border: isParallel ? '2px solid #0284c7' : '1px solid #d1d5db',
      };
  }
}

/**
 * Gets edge style based on execution state
 */
function getEdgeStatusStyle(
  sourceId: string,
  targetId: string,
  executionState?: ExecutionState
): { stroke: string; strokeWidth: number; animated: boolean } {
  if (!executionState) {
    return { stroke: '#9ca3af', strokeWidth: 2, animated: false };
  }

  const sourceCompleted = executionState.completedTasks?.includes(sourceId);
  const targetStarted =
    executionState.runningTasks?.includes(targetId) ||
    executionState.completedTasks?.includes(targetId) ||
    executionState.failedTasks?.includes(targetId);

  if (sourceCompleted && targetStarted) {
    // Data has flowed through this edge
    return { stroke: '#22c55e', strokeWidth: 3, animated: false };
  } else if (sourceCompleted) {
    // Source done, waiting for target to start
    return { stroke: '#3b82f6', strokeWidth: 2, animated: true };
  } else {
    // Not yet reached
    return { stroke: '#d1d5db', strokeWidth: 1, animated: false };
  }
}

/**
 * Converts workflow graph to React Flow nodes and edges with layout
 * Optionally adds Input and Output nodes for visualization
 */
function convertToReactFlow(
  graph: WorkflowGraph,
  direction: LayoutDirection = 'TB',
  executionState?: ExecutionState,
  showInputOutput: boolean = true
): { nodes: Node[]; edges: Edge[] } {
  // Null safety: handle missing or empty nodes/edges
  if (!graph?.nodes || graph.nodes.length === 0) {
    return { nodes: [], edges: [] };
  }
  if (!graph.edges) {
    graph.edges = [];
  }

  // Filter to only task nodes (exclude any existing input/output nodes)
  const taskNodes = graph.nodes.filter((n) => n.type === 'task' || !n.type);

  // Find root nodes (no incoming edges)
  const targetIds = new Set(graph.edges.map((e) => e.target));
  const rootNodeIds = taskNodes.filter((n) => !targetIds.has(n.id)).map((n) => n.id);

  // Find leaf nodes (no outgoing edges)
  const sourceIds = new Set(graph.edges.map((e) => e.source));
  const leafNodeIds = taskNodes.filter((n) => !sourceIds.has(n.id)).map((n) => n.id);

  // Convert graph nodes to React Flow nodes
  const taskFlowNodes: Node[] = taskNodes.map((node) => {
    const isParallel = isParallelNode(node.id, graph.parallelGroups);
    const status = getNodeStatus(node.id, executionState);

    return {
      id: node.id,
      type: 'default', // Use default for task nodes
      data: {
        label: node.data.label,
        isParallel,
      },
      position: { x: 0, y: 0 }, // Will be set by layout
      style: getNodeStatusStyle(status, isParallel),
      className: status === 'running' ? 'animate-pulse' : undefined,
    };
  });

  // Create Input node
  const inputNode: Node = {
    id: '__input__',
    type: 'input',
    data: {
      label: 'Workflow Input',
      description: 'Input parameters',
    },
    position: { x: 0, y: 0 },
  };

  // Create Output node
  const outputNode: Node = {
    id: '__output__',
    type: 'output',
    data: {
      label: 'Workflow Output',
      description: 'Output mapping',
    },
    position: { x: 0, y: 0 },
  };

  // Combine nodes: optionally include Input/Output
  const allNodes = showInputOutput
    ? [inputNode, ...taskFlowNodes, outputNode]
    : taskFlowNodes;

  // Convert graph edges to React Flow edges
  const taskEdges: Edge[] = graph.edges.map((edge, index) => {
    const edgeStyle = getEdgeStatusStyle(edge.source, edge.target, executionState);
    return {
      id: `edge-${edge.source}-${edge.target}-${index}`,
      source: edge.source,
      target: edge.target,
      type: 'smoothstep',
      animated: edgeStyle.animated,
      markerEnd: {
        type: MarkerType.ArrowClosed,
        width: 20,
        height: 20,
      },
      style: {
        strokeWidth: edgeStyle.strokeWidth,
        stroke: edgeStyle.stroke,
      },
    };
  });

  // Create edges from Input to root nodes (vertical connection via smoothstep)
  const inputEdges: Edge[] = rootNodeIds.map((nodeId) => {
    // For input edges, check if target has started
    const targetStarted =
      executionState?.runningTasks?.includes(nodeId) ||
      executionState?.completedTasks?.includes(nodeId) ||
      executionState?.failedTasks?.includes(nodeId);

    return {
      id: `__input__-to-${nodeId}`,
      source: '__input__',
      target: nodeId,
      type: 'smoothstep',
      animated: executionState ? !targetStarted : true,
      markerEnd: {
        type: MarkerType.ArrowClosed,
        width: 20,
        height: 20,
      },
      style: {
        strokeWidth: targetStarted ? 3 : 2,
        stroke: '#22c55e', // Green for input
      },
    };
  });

  // Create edges from leaf nodes to Output (vertical connection via smoothstep)
  const outputEdges: Edge[] = leafNodeIds.map((nodeId) => {
    // For output edges, check if source has completed
    const sourceCompleted = executionState?.completedTasks?.includes(nodeId);

    return {
      id: `${nodeId}-to-__output__`,
      source: nodeId,
      target: '__output__',
      type: 'smoothstep',
      animated: executionState ? !sourceCompleted : true,
      markerEnd: {
        type: MarkerType.ArrowClosed,
        width: 20,
        height: 20,
      },
      style: {
        strokeWidth: sourceCompleted ? 3 : 2,
        stroke: sourceCompleted ? '#a855f7' : '#d1d5db', // Purple when complete, gray when pending
      },
    };
  });

  // Combine edges: optionally include input/output edges
  const allEdges = showInputOutput
    ? [...inputEdges, ...taskEdges, ...outputEdges]
    : taskEdges;

  // Apply auto-layout to position nodes
  const layoutedNodes = layoutGraph(allNodes, allEdges, { direction });

  return { nodes: layoutedNodes, edges: allEdges };
}

export function WorkflowGraphPanel({
  graph,
  direction = 'TB',
  onNodeClick,
  executionState,
  showInputOutput = true,
}: WorkflowGraphPanelProps) {
  const { nodes, edges } = useMemo(() => {
    if (graph.nodes.length === 0) {
      return { nodes: [], edges: [] };
    }
    return convertToReactFlow(graph, direction, executionState, showInputOutput);
  }, [graph, direction, executionState, showInputOutput]);

  const handleNodeClick = (_event: React.MouseEvent, node: Node) => {
    if (onNodeClick) {
      onNodeClick(node.id);
    }
  };

  // Empty state
  if (graph.nodes.length === 0) {
    return (
      <div className="flex h-full items-center justify-center bg-gray-50 border border-gray-200 rounded-lg">
        <div className="text-center text-gray-500">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <p className="mt-2 text-sm">No tasks in this workflow</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden bg-white dark:bg-gray-900">
      <ReactFlowProvider>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodeClick={handleNodeClick}
          fitView
          fitViewOptions={{ padding: 0.2, maxZoom: 1.5 }}
          minZoom={0.1}
          maxZoom={2}
          proOptions={{ hideAttribution: true }}
          className="bg-white dark:bg-gray-900"
        >
          <Controls className="dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300" />
          <Background variant={BackgroundVariant.Dots} gap={12} size={1} className="dark:bg-gray-900" color="var(--dot-color, #d1d5db)" />
        </ReactFlow>
      </ReactFlowProvider>
    </div>
  );
}
