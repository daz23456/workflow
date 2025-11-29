/**
 * WorkflowCanvas - Interactive React Flow Canvas for Workflow Building
 *
 * Features:
 * - Drag-and-drop node repositioning
 * - Edge creation (connect nodes)
 * - Keyboard shortcuts (Delete, Undo, Redo)
 * - Empty state when no nodes
 * - Integration with Zustand store
 */

'use client';

import { useCallback, useEffect, useMemo } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  Panel,
  useReactFlow,
  type NodeChange,
  type EdgeChange,
  type Connection,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { TaskNode } from './task-node';
import { useWorkflowBuilderStore } from '@/lib/stores/workflow-builder-store';

// Register custom node types
const nodeTypes = {
  task: TaskNode,
} as any; // Type assertion to handle React 19 type incompatibility

function WorkflowCanvasInner() {
  const { fitView } = useReactFlow();

  // Get state and actions from Zustand store
  const nodes = useWorkflowBuilderStore((state) => state.graph.nodes);
  const edges = useWorkflowBuilderStore((state) => state.graph.edges);
  const selectedNodeIds = useWorkflowBuilderStore((state) => state.selection.nodeIds);
  const selectedEdgeIds = useWorkflowBuilderStore((state) => state.selection.edgeIds);

  const updateNode = useWorkflowBuilderStore((state) => state.updateNode);
  const deleteNode = useWorkflowBuilderStore((state) => state.deleteNode);
  const addEdge = useWorkflowBuilderStore((state) => state.addEdge);
  const deleteEdge = useWorkflowBuilderStore((state) => state.deleteEdge);
  const selectNodes = useWorkflowBuilderStore((state) => state.selectNodes);
  const selectEdges = useWorkflowBuilderStore((state) => state.selectEdges);
  const undo = useWorkflowBuilderStore((state) => state.undo);
  const redo = useWorkflowBuilderStore((state) => state.redo);
  const canUndo = useWorkflowBuilderStore((state) => state.canUndo);
  const canRedo = useWorkflowBuilderStore((state) => state.canRedo);

  // Mark nodes as selected based on store selection
  const nodesWithSelection = useMemo(() => {
    return nodes.map((node) => ({
      ...node,
      selected: selectedNodeIds.includes(node.id),
    }));
  }, [nodes, selectedNodeIds]);

  // Mark edges as selected based on store selection
  const edgesWithSelection = useMemo(() => {
    return edges.map((edge) => ({
      ...edge,
      selected: selectedEdgeIds.includes(edge.id),
    }));
  }, [edges, selectedEdgeIds]);

  // Handle node changes (position, selection, etc.)
  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      changes.forEach((change) => {
        if (change.type === 'position' && change.position && !change.dragging) {
          // Update node position in store when drag ends
          updateNode(change.id, {
            position: change.position,
          });
        } else if (change.type === 'select') {
          // Update selection in store
          const selectedIds = nodesWithSelection
            .filter((n) => n.selected || (n.id === change.id && change.selected))
            .map((n) => n.id);
          selectNodes(selectedIds);
        }
      });
    },
    [updateNode, selectNodes, nodesWithSelection]
  );

  // Handle edge changes (selection, deletion, etc.)
  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      changes.forEach((change) => {
        if (change.type === 'select') {
          // Update selection in store
          const selectedIds = edgesWithSelection
            .filter((e) => e.selected || (e.id === change.id && change.selected))
            .map((e) => e.id);
          selectEdges(selectedIds);
        } else if (change.type === 'remove') {
          // Delete edge from store
          deleteEdge(change.id);
        }
      });
    },
    [selectEdges, deleteEdge, edgesWithSelection]
  );

  // Handle new edge connection
  const onConnect = useCallback(
    (connection: Connection) => {
      if (connection.source && connection.target) {
        const newEdge = {
          id: `${connection.source}-to-${connection.target}`,
          source: connection.source,
          target: connection.target,
          type: 'dependency' as const,
        };
        addEdge(newEdge);
      }
    },
    [addEdge]
  );

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Delete selected nodes/edges
      if (event.key === 'Backspace' || event.key === 'Delete') {
        // Don't delete if user is typing in an input
        if (
          document.activeElement?.tagName === 'INPUT' ||
          document.activeElement?.tagName === 'TEXTAREA'
        ) {
          return;
        }

        event.preventDefault();

        // Delete selected nodes
        selectedNodeIds.forEach((nodeId) => {
          deleteNode(nodeId);
        });

        // Delete selected edges
        selectedEdgeIds.forEach((edgeId) => {
          deleteEdge(edgeId);
        });
      }

      // Undo (Cmd+Z or Ctrl+Z)
      if (event.key === 'z' && (event.metaKey || event.ctrlKey) && !event.shiftKey) {
        if (canUndo()) {
          event.preventDefault();
          undo();
        }
      }

      // Redo (Cmd+Shift+Z or Ctrl+Shift+Z)
      if (event.key === 'z' && (event.metaKey || event.ctrlKey) && event.shiftKey) {
        if (canRedo()) {
          event.preventDefault();
          redo();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selectedNodeIds, selectedEdgeIds, deleteNode, deleteEdge, undo, redo, canUndo, canRedo]);

  // Fit view when nodes change
  useEffect(() => {
    if (nodes.length > 0) {
      // Delay to ensure layout is complete
      setTimeout(() => fitView({ padding: 0.2 }), 100);
    }
  }, [nodes.length, fitView]);

  return (
    <div className="w-full h-full" aria-label="Workflow canvas" tabIndex={0}>
      <ReactFlow
        nodes={nodesWithSelection}
        edges={edgesWithSelection}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        fitView
        snapToGrid
        snapGrid={[15, 15]}
        defaultEdgeOptions={{
          type: 'smoothstep',
          animated: true,
          style: { strokeWidth: 2 },
        }}
      >
        <Background color="#aaa" gap={16} />
        <Controls />
        <MiniMap />

        {/* Empty state */}
        {nodes.length === 0 && (
          <Panel position="top-center">
            <div className="bg-white rounded-lg shadow-lg p-6 text-center max-w-md">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Get Started</h3>
              <p className="text-sm text-gray-600">
                Drag and drop tasks from the palette on the left to create your workflow
              </p>
            </div>
          </Panel>
        )}
      </ReactFlow>
    </div>
  );
}

// Export wrapped with ReactFlowProvider
export function WorkflowCanvas() {
  return (
    <ReactFlowProvider>
      <WorkflowCanvasInner />
    </ReactFlowProvider>
  );
}
