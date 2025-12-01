'use client';

import { useState } from 'react';

export interface GraphNode {
  id: string;
  label: string;
  type: string;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface ExecutionState {
  completedTasks?: string[];
  runningTasks?: string[];
  failedTasks?: string[];
  pendingTasks?: string[];
  taskData?: Record<string, any>;
  taskErrors?: Record<string, string>;
  taskTimings?: Record<string, { startedAt: string; completedAt?: string; durationMs?: number }>;
}

export interface WorkflowGraphDebuggerProps {
  graphData: GraphData;
  executionState?: ExecutionState;
  showDataFlow?: boolean;
  highlightPath?: boolean;
}

export function WorkflowGraphDebugger({
  graphData,
  executionState,
  showDataFlow = false,
  highlightPath = false,
}: WorkflowGraphDebuggerProps) {
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [showLayoutMenu, setShowLayoutMenu] = useState(false);
  const [layout, setLayout] = useState<'horizontal' | 'vertical'>('horizontal');

  if (graphData.nodes.length === 0) {
    return (
      <div role="region" aria-label="workflow graph" className="p-4 text-center text-gray-500">
        No workflow graph available
      </div>
    );
  }

  const getNodeStatus = (nodeId: string): string => {
    if (executionState?.completedTasks?.includes(nodeId)) return 'completed';
    if (executionState?.runningTasks?.includes(nodeId)) return 'running';
    if (executionState?.failedTasks?.includes(nodeId)) return 'failed';
    return 'pending';
  };

  const getNodeColor = (status: string): string => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 border-green-500';
      case 'running':
        return 'bg-blue-100 border-blue-500';
      case 'failed':
        return 'bg-red-100 border-red-500';
      default:
        return 'bg-gray-100 border-gray-300';
    }
  };

  const handleNodeClick = (nodeId: string) => {
    // Filter out special visualization nodes (e.g., __input__, __output__)
    if (nodeId.startsWith('__')) return;
    setSelectedNode(nodeId);
  };

  const handleZoomIn = () => {
    setZoom((z) => Math.min(z + 0.1, 2));
  };

  const handleZoomOut = () => {
    setZoom((z) => Math.max(z - 0.1, 0.5));
  };

  const handleResetZoom = () => {
    setZoom(1);
  };

  const handleFitToView = () => {
    setZoom(1);
  };

  const handleLayoutChange = (newLayout: 'horizontal' | 'vertical') => {
    setLayout(newLayout);
    setShowLayoutMenu(false);
  };

  const isEdgeInPath = (edge: GraphEdge): boolean => {
    if (!highlightPath || !executionState) return false;
    const sourceCompleted = executionState.completedTasks?.includes(edge.source);
    const targetStarted =
      executionState.completedTasks?.includes(edge.target) ||
      executionState.runningTasks?.includes(edge.target);
    return !!sourceCompleted && !!targetStarted;
  };

  const selectedNodeData = selectedNode
    ? {
        id: selectedNode,
        label: graphData.nodes.find((n) => n.id === selectedNode)?.label,
        status: getNodeStatus(selectedNode),
        data: executionState?.taskData?.[selectedNode],
        error: executionState?.taskErrors?.[selectedNode],
        timing: executionState?.taskTimings?.[selectedNode],
      }
    : null;

  return (
    <div role="region" aria-label="workflow graph" className="p-4 space-y-4">
      {/* Controls */}
      <div className="flex justify-between items-center border-b pb-2">
        <h3 className="text-lg font-semibold">Workflow Graph</h3>
        <div className="flex space-x-2">
          <button
            onClick={handleZoomIn}
            className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300 text-sm"
            aria-label="Zoom in"
          >
            +
          </button>
          <button
            onClick={handleZoomOut}
            className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300 text-sm"
            aria-label="Zoom out"
          >
            -
          </button>
          <button
            onClick={handleResetZoom}
            className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300 text-sm"
            aria-label="Reset zoom"
          >
            Reset
          </button>
          <button
            onClick={handleFitToView}
            className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300 text-sm"
            aria-label="Fit to view"
          >
            Fit
          </button>
          <div className="relative">
            <button
              onClick={() => setShowLayoutMenu(!showLayoutMenu)}
              className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300 text-sm"
              aria-label="Layout"
            >
              Layout
            </button>
            {showLayoutMenu && (
              <div className="absolute right-0 mt-1 bg-white border rounded shadow-lg z-10">
                <button
                  onClick={() => handleLayoutChange('horizontal')}
                  className="block w-full px-4 py-2 text-left hover:bg-gray-100 text-sm"
                >
                  Horizontal
                </button>
                <button
                  onClick={() => handleLayoutChange('vertical')}
                  className="block w-full px-4 py-2 text-left hover:bg-gray-100 text-sm"
                >
                  Vertical
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Graph visualization */}
      <div
        className="border rounded p-4 bg-gray-50 overflow-auto"
        style={{ transform: `scale(${zoom})`, transformOrigin: 'top left' }}
      >
        <div
          className={`flex ${layout === 'horizontal' ? 'flex-row' : 'flex-col'} items-center space-x-8 space-y-4`}
        >
          {graphData.nodes.map((node, index) => {
            const status = getNodeStatus(node.id);
            const error = executionState?.taskErrors?.[node.id];

            return (
              <div key={node.id}>
                <div
                  data-node-id={node.id}
                  data-status={status}
                  className={`relative p-4 border-2 rounded cursor-pointer hover:shadow-lg transition-shadow ${getNodeColor(status)}`}
                  onClick={() => handleNodeClick(node.id)}
                >
                  <div className="font-medium">{node.label}</div>
                  <div className="text-xs text-gray-600">{node.id}</div>

                  {error && <div className="mt-2 text-xs text-red-600">{error}</div>}

                  {/* Status indicator */}
                  {status === 'running' && (
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
                  )}
                </div>

                {/* Edge to next node */}
                {index < graphData.nodes.length - 1 && (
                  <div
                    className={`flex ${layout === 'horizontal' ? 'flex-row' : 'flex-col'} items-center`}
                  >
                    <div
                      data-testid={graphData.edges[index]?.id}
                      data-in-path={isEdgeInPath(
                        graphData.edges[index] || { id: '', source: '', target: '' }
                      )}
                      className={`${layout === 'horizontal' ? 'w-8 h-0.5' : 'w-0.5 h-8'} ${
                        isEdgeInPath(graphData.edges[index] || { id: '', source: '', target: '' })
                          ? 'bg-blue-500'
                          : 'bg-gray-300'
                      }`}
                      onMouseEnter={() => {
                        if (showDataFlow) {
                          // Data flow tooltip would appear here
                        }
                      }}
                    ></div>
                    {showDataFlow && <div className="text-xs text-gray-500">Data flow</div>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Task Details Panel */}
      {selectedNodeData && (
        <div className="border rounded p-4 bg-white">
          <h4 className="font-medium mb-2">Task Details</h4>
          <div className="space-y-2 text-sm">
            <div>
              <span className="font-medium">ID:</span> {selectedNodeData.id}
            </div>
            <div>
              <span className="font-medium">Name:</span> {selectedNodeData.label}
            </div>
            <div>
              <span className="font-medium">Status:</span> {selectedNodeData.status}
            </div>
            {/* Timing information */}
            {selectedNodeData.timing && (
              <>
                <div>
                  <span className="font-medium">Started:</span>{' '}
                  {new Date(selectedNodeData.timing.startedAt).toISOString().substring(11, 23)}
                </div>
                {selectedNodeData.timing.completedAt && (
                  <div>
                    <span className="font-medium">Completed:</span>{' '}
                    {new Date(selectedNodeData.timing.completedAt).toISOString().substring(11, 23)}
                  </div>
                )}
                {selectedNodeData.timing.durationMs !== undefined && (
                  <div>
                    <span className="font-medium">Duration:</span>{' '}
                    {selectedNodeData.timing.durationMs < 1000
                      ? `${selectedNodeData.timing.durationMs}ms`
                      : `${(selectedNodeData.timing.durationMs / 1000).toFixed(3)}s`}
                  </div>
                )}
              </>
            )}
            {/* Only show data when task is completed */}
            {selectedNodeData.status === 'completed' && selectedNodeData.data && (
              <div>
                <span className="font-medium">Data:</span>
                <pre className="bg-gray-50 p-2 rounded text-xs overflow-auto mt-1">
                  {JSON.stringify(selectedNodeData.data, null, 2)}
                </pre>
              </div>
            )}
            {selectedNodeData.error && (
              <div className="text-red-600">
                <span className="font-medium">Error:</span> {selectedNodeData.error}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
