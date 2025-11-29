'use client';

import { useMemo } from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  BackgroundVariant,
  Node,
  Edge,
  MarkerType,
} from '@xyflow/react';
import type { WorkflowGraph } from '@/types/workflow';
import { layoutGraph, type LayoutDirection } from '@/lib/utils/graph-layout';
import '@xyflow/react/dist/style.css';

interface WorkflowGraphPanelProps {
  graph: WorkflowGraph;
  direction?: LayoutDirection;
  onNodeClick?: (nodeId: string) => void;
}

/**
 * Converts graph node type to React Flow node type
 */
function getReactFlowNodeType(nodeType: string): string {
  switch (nodeType) {
    case 'start':
      return 'input';
    case 'end':
      return 'output';
    case 'task':
    default:
      return 'default';
  }
}

/**
 * Checks if a node is part of any parallel group
 */
function isParallelNode(nodeId: string, parallelGroups: WorkflowGraph['parallelGroups']): boolean {
  return parallelGroups.some((group) => group.taskIds.includes(nodeId));
}

/**
 * Converts workflow graph to React Flow nodes and edges with layout
 */
function convertToReactFlow(
  graph: WorkflowGraph,
  direction: LayoutDirection = 'TB'
): { nodes: Node[]; edges: Edge[] } {
  // Null safety: handle missing or empty nodes/edges
  if (!graph?.nodes || graph.nodes.length === 0) {
    return { nodes: [], edges: [] };
  }
  if (!graph.edges) {
    graph.edges = [];
  }

  // Convert graph nodes to React Flow nodes
  const initialNodes: Node[] = graph.nodes.map((node) => {
    const isParallel = isParallelNode(node.id, graph.parallelGroups);

    return {
      id: node.id,
      type: getReactFlowNodeType(node.type),
      data: {
        label: node.data.label, // ← Fixed: access label from node.data
        isParallel,
      },
      position: { x: 0, y: 0 }, // Will be set by layout
      style: {
        background: isParallel ? '#e0f2fe' : '#ffffff',
        border: isParallel ? '2px solid #0284c7' : '1px solid #d1d5db',
        borderRadius: '8px',
        padding: '10px 20px',
        fontSize: '14px',
        fontWeight: isParallel ? '600' : '400',
      },
    };
  });

  // Convert graph edges to React Flow edges
  console.log(`Graph has ${graph.edges.length} edges:`, graph.edges);
  const edges: Edge[] = graph.edges.map((edge, index) => ({
    id: `edge-${edge.source}-${edge.target}-${index}`,
    source: edge.source,
    target: edge.target,
    type: 'smoothstep',
    animated: false,
    markerEnd: {
      type: MarkerType.ArrowClosed,
      width: 20,
      height: 20,
    },
    style: {
      strokeWidth: 2,
      stroke: '#9ca3af',
    },
  }));
  console.log(`Converted to ${edges.length} React Flow edges:`, edges);

  // Apply auto-layout to position nodes
  const layoutedNodes = layoutGraph(initialNodes, edges, { direction });

  return { nodes: layoutedNodes, edges };
}

export function WorkflowGraphPanel({
  graph,
  direction = 'TB',
  onNodeClick,
}: WorkflowGraphPanelProps) {
  const { nodes, edges } = useMemo(() => {
    if (graph.nodes.length === 0) {
      return { nodes: [], edges: [] };
    }
    return convertToReactFlow(graph, direction);
  }, [graph, direction]);

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
    <div className="h-full w-full border border-gray-200 rounded-lg overflow-hidden">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodeClick={handleNodeClick}
        fitView
        minZoom={0.1}
        maxZoom={2}
        defaultViewport={{ x: 0, y: 0, zoom: 1 }}
        proOptions={{ hideAttribution: true }}
      >
        <Controls />
        <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
      </ReactFlow>
    </div>
  );
}
