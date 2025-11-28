import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  BackgroundVariant,
  Node,
  Edge,
  MarkerType,
  useReactFlow,
  ReactFlowProvider,
  Panel,
} from '@xyflow/react';
import dagre from 'dagre';
import { toPng } from 'html-to-image';

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
        background: isParallel ? '#1e3a8a' : '#1e293b',
        border: isParallel ? '2px solid #3b82f6' : '2px solid #475569',
        borderRadius: '8px',
        padding: '12px 24px',
        fontSize: '14px',
        fontWeight: '500',
        color: '#ffffff',
        minWidth: '200px',
        textAlign: 'center' as const,
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
      color: '#60a5fa',
    },
    style: {
      strokeWidth: 3,
      stroke: '#60a5fa',
    },
  }));

  const layoutedNodes = layoutGraph(initialNodes, edges);

  return { nodes: layoutedNodes, edges };
}

function WorkflowGraphViewerInner() {
  const [graph, setGraph] = useState<WorkflowGraph | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { getNodes } = useReactFlow();

  const { nodes, edges } = useMemo(() => {
    if (!graph || graph.nodes.length === 0) {
      return { nodes: [], edges: [] };
    }
    return convertToReactFlow(graph);
  }, [graph]);

  const downloadImage = useCallback(() => {
    const viewport = document.querySelector('.react-flow__viewport') as HTMLElement;
    if (!viewport) {
      console.error('[WorkflowGraphViewer] Could not find .react-flow__viewport element');
      return;
    }

    console.log('[WorkflowGraphViewer] Starting PNG export...');
    toPng(viewport, {
      backgroundColor: '#0f172a',
      pixelRatio: 2,
      cacheBust: true,
    })
      .then((dataUrl) => {
        console.log('[WorkflowGraphViewer] PNG generated successfully');
        const link = document.createElement('a');
        link.download = `workflow-graph-${Date.now()}.png`;
        link.href = dataUrl;
        link.click();
        console.log('[WorkflowGraphViewer] Download triggered');
      })
      .catch((error) => {
        console.error('[WorkflowGraphViewer] Error generating PNG:', error);
      });
  }, []);

  useEffect(() => {
    const vscode = acquireVsCodeApi();

    const handleMessage = (event: MessageEvent) => {
      const message = event.data;
      console.log('[WorkflowGraphViewer] Received message:', message);

      switch (message.type) {
        case 'updateGraph':
          console.log('[WorkflowGraphViewer] Updating graph with', message.graph.nodes.length, 'nodes');
          setGraph(message.graph);
          setError(null);
          break;
        case 'error':
          console.log('[WorkflowGraphViewer] Error:', message.message);
          setError(message.message);
          break;
        default:
          console.log('[WorkflowGraphViewer] Unknown message type:', message.type);
      }
    };

    console.log('[WorkflowGraphViewer] Component mounted, adding message listener');
    window.addEventListener('message', handleMessage);

    // Signal to the extension that we're ready
    vscode.postMessage({ type: 'webviewReady' });

    return () => {
      console.log('[WorkflowGraphViewer] Component unmounting, removing message listener');
      window.removeEventListener('message', handleMessage);
    };
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
    <div style={{ width: '100vw', height: '100vh', background: '#0f172a' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        fitView
        minZoom={0.1}
        maxZoom={2}
        defaultViewport={{ x: 0, y: 0, zoom: 1 }}
        proOptions={{ hideAttribution: true }}
      >
        <Controls>
          <button
            onClick={downloadImage}
            className="react-flow__controls-button"
            title="Export as PNG"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
          </button>
        </Controls>
        <Background variant={BackgroundVariant.Dots} gap={12} size={1} color="#334155" />
      </ReactFlow>
    </div>
  );
}

export function WorkflowGraphViewer() {
  return (
    <ReactFlowProvider>
      <WorkflowGraphViewerInner />
    </ReactFlowProvider>
  );
}
