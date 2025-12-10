'use client';

import { useMemo, useCallback } from 'react';
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
import { layoutGraph } from '@/lib/utils/graph-layout';
import type { BlastRadiusGraph as BlastRadiusGraphType } from '@/lib/api/types';
import '@xyflow/react/dist/style.css';

interface BlastRadiusGraphProps {
  graph: BlastRadiusGraphType;
  onNodeClick?: (nodeId: string, nodeType: 'task' | 'workflow') => void;
}

/**
 * Node style based on type and depth
 */
function getNodeStyle(type: string, isSource: boolean): React.CSSProperties {
  if (isSource) {
    // Source task - red/highlight
    return {
      background: '#fee2e2',
      border: '2px solid #ef4444',
      borderRadius: '8px',
      padding: '10px 20px',
      fontSize: '14px',
      fontWeight: '600',
    };
  }

  if (type === 'workflow') {
    // Workflow - blue
    return {
      background: '#dbeafe',
      border: '2px solid #3b82f6',
      borderRadius: '8px',
      padding: '10px 20px',
      fontSize: '14px',
      fontWeight: '500',
    };
  }

  // Affected task - orange
  return {
    background: '#ffedd5',
    border: '2px solid #f97316',
    borderRadius: '8px',
    padding: '10px 20px',
    fontSize: '14px',
    fontWeight: '400',
  };
}

/**
 * Edge style based on relationship
 */
function getEdgeStyle(relationship: string): { stroke: string; strokeDasharray?: string } {
  if (relationship === 'usedBy') {
    return { stroke: '#3b82f6' }; // Blue for task -> workflow
  }
  return { stroke: '#f97316', strokeDasharray: '5,5' }; // Orange dashed for workflow -> task
}

/**
 * Convert API graph to ReactFlow format with layout
 */
function convertToReactFlow(
  graph: BlastRadiusGraphType
): { nodes: Node[]; edges: Edge[] } {
  if (!graph?.nodes || graph.nodes.length === 0) {
    return { nodes: [], edges: [] };
  }

  // Convert nodes
  const flowNodes: Node[] = graph.nodes.map((node) => ({
    id: node.id,
    type: 'default',
    data: {
      label: node.name,
      nodeType: node.type,
      isSource: node.isSource,
    },
    position: { x: 0, y: 0 }, // Will be set by layout
    style: getNodeStyle(node.type, node.isSource),
  }));

  // Convert edges
  const flowEdges: Edge[] = (graph.edges || []).map((edge, index) => {
    const edgeStyle = getEdgeStyle(edge.relationship);
    return {
      id: `edge-${edge.source}-${edge.target}-${index}`,
      source: edge.source,
      target: edge.target,
      type: 'smoothstep',
      markerEnd: {
        type: MarkerType.ArrowClosed,
        width: 16,
        height: 16,
      },
      style: {
        strokeWidth: 2,
        stroke: edgeStyle.stroke,
        strokeDasharray: edgeStyle.strokeDasharray,
      },
      animated: false,
    };
  });

  // Apply layout
  const layoutedNodes = layoutGraph(flowNodes, flowEdges, { direction: 'TB' });

  return { nodes: layoutedNodes, edges: flowEdges };
}

/**
 * Displays blast radius as an interactive graph visualization
 * Uses @xyflow/react for rendering and dagre for layout
 */
export function BlastRadiusGraph({ graph, onNodeClick }: BlastRadiusGraphProps) {
  const { nodes, edges } = useMemo(() => {
    return convertToReactFlow(graph);
  }, [graph]);

  const handleNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      if (onNodeClick && node.data) {
        const nodeType = (node.data as { nodeType?: string }).nodeType;
        onNodeClick(node.id, nodeType as 'task' | 'workflow');
      }
    },
    [onNodeClick]
  );

  // Empty state
  if (nodes.length === 0) {
    return (
      <div
        className="flex h-64 items-center justify-center bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg"
        data-testid="empty-graph"
      >
        <div className="text-center text-gray-500 dark:text-gray-400">
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
          <p className="mt-2 text-sm">No impact graph to display</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="h-64 w-full border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden bg-white dark:bg-gray-900"
      data-testid="blast-radius-graph"
    >
      <ReactFlowProvider>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodeClick={handleNodeClick}
          fitView
          fitViewOptions={{ padding: 0.3, maxZoom: 1.5 }}
          minZoom={0.1}
          maxZoom={2}
          proOptions={{ hideAttribution: true }}
          className="bg-white dark:bg-gray-900"
        >
          <Controls className="dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300" />
          <Background
            variant={BackgroundVariant.Dots}
            gap={12}
            size={1}
            className="dark:bg-gray-900"
            color="var(--dot-color, #d1d5db)"
          />
        </ReactFlow>
      </ReactFlowProvider>
    </div>
  );
}

/**
 * Graph legend showing node types
 */
export function BlastRadiusGraphLegend() {
  return (
    <div className="flex gap-4 text-xs text-gray-500 dark:text-gray-400 mt-2" data-testid="graph-legend">
      <div className="flex items-center gap-1">
        <span className="w-3 h-3 rounded bg-red-200 border-2 border-red-500" />
        <span>Source Task</span>
      </div>
      <div className="flex items-center gap-1">
        <span className="w-3 h-3 rounded bg-blue-200 border-2 border-blue-500" />
        <span>Workflow</span>
      </div>
      <div className="flex items-center gap-1">
        <span className="w-3 h-3 rounded bg-orange-200 border-2 border-orange-500" />
        <span>Affected Task</span>
      </div>
    </div>
  );
}
