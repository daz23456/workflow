import React, { useState, useEffect, useMemo } from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  BackgroundVariant,
  Node,
  Edge,
  MarkerType,
} from '@xyflow/react';
import dagre from 'dagre';

interface WorkflowGraph {
  nodes: Array<{
    id: string;
    type: string;
    label: string;
  }>;
  edges: Array<{
    source: string;
    target: string;
  }>;
  parallelGroups: Array<{
    level: number;
    taskIds: string[];
  }>;
}

interface VsCodeApi {
  postMessage(message: any): void;
  getState(): any;
  setState(state: any): void;
}

declare const acquireVsCodeApi: () => VsCodeApi;

const DEFAULT_NODE_WIDTH = 250;
const DEFAULT_NODE_HEIGHT = 80;

function layoutGraph(nodes: Node[], edges: Edge[]): Node[] {
  if (nodes.length === 0) return [];

  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  dagreGraph.setGraph({ rankdir: 'TB', nodesep: 100, ranksep: 50 });

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, {
      width: DEFAULT_NODE_WIDTH,
      height: DEFAULT_NODE_HEIGHT,
    });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  return nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    return {
      ...node,
      position: {
        x: nodeWithPosition.x - DEFAULT_NODE_WIDTH / 2,
        y: nodeWithPosition.y - DEFAULT_NODE_HEIGHT / 2,
      },
    };
  });
}

function isParallelNode(nodeId: string, parallelGroups: WorkflowGraph['parallelGroups']): boolean {
  return parallelGroups.some((group) => group.taskIds.includes(nodeId));
}

function convertToReactFlow(graph: WorkflowGraph): { nodes: Node[]; edges: Edge[] } {
  const initialNodes: Node[] = graph.nodes.map((node) => {
    const isParallel = isParallelNode(node.id, graph.parallelGroups);

    return {
      id: node.id,
      type: 'default',
      data: { label: node.label, isParallel },
      position: { x: 0, y: 0 },
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

  const layoutedNodes = layoutGraph(initialNodes, edges);

  return { nodes: layoutedNodes, edges };
}

export function WorkflowGraphViewer() {
  const [graph, setGraph] = useState<WorkflowGraph | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { nodes, edges } = useMemo(() => {
    if (!graph || graph.nodes.length === 0) {
      return { nodes: [], edges: [] };
    }
    return convertToReactFlow(graph);
  }, [graph]);

  useEffect(() => {
    const vscode = acquireVsCodeApi();

    window.addEventListener('message', (event) => {
      const message = event.data;

      switch (message.type) {
        case 'updateGraph':
          setGraph(message.graph);
          setError(null);
          break;
        case 'error':
          setError(message.message);
          break;
      }
    });
  }, []);

  if (error) {
    return (
      <div style={{ padding: '20px', color: '#dc2626', fontFamily: 'sans-serif' }}>
        <h2>Error</h2>
        <p>{error}</p>
      </div>
    );
  }

  if (!graph || graph.nodes.length === 0) {
    return (
      <div style={{
        display: 'flex',
        height: '100vh',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'sans-serif',
        color: '#6b7280'
      }}>
        <div style={{ textAlign: 'center' }}>
          <svg
            style={{ margin: '0 auto', height: '48px', width: '48px', color: '#9ca3af' }}
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
          <p style={{ marginTop: '8px', fontSize: '14px' }}>No tasks in this workflow</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
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
