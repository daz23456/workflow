/**
 * WorkflowCanvas - Interactive React Flow Canvas for Workflow Building
 *
 * Features:
 * - Drag-and-drop task creation from palette
 * - Drag-and-drop node repositioning
 * - Edge creation (connect nodes)
 * - Input/Output nodes for workflow visualization
 * - Keyboard shortcuts (Delete, Undo, Redo)
 * - Empty state when no nodes
 * - Integration with Zustand store
 */

'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  Panel,
  useReactFlow,
  type NodeChange,
  type EdgeChange,
  type Connection,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { TaskNode } from './task-node';
import { InputNode } from './input-node';
import { OutputNode } from './output-node';
import { useWorkflowBuilderStore } from '@/lib/stores/workflow-builder-store';
import type { WorkflowBuilderNode, WorkflowBuilderEdge } from '@/lib/types/workflow-builder';

// Register custom node types
const nodeTypes = {
  task: TaskNode,
  input: InputNode,
  output: OutputNode,
} as any; // Type assertion to handle React 19 type incompatibility

function WorkflowCanvasInner() {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { fitView, screenToFlowPosition } = useReactFlow();

  // Track positions of virtual Input/Output nodes (not stored in main store)
  const [virtualNodePositions, setVirtualNodePositions] = useState<{
    input?: { x: number; y: number };
    output?: { x: number; y: number };
  }>({});

  // Get state and actions from Zustand store
  const nodes = useWorkflowBuilderStore((state) => state.graph.nodes);
  const edges = useWorkflowBuilderStore((state) => state.graph.edges);
  const addNode = useWorkflowBuilderStore((state) => state.addNode);
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
  const openPanel = useWorkflowBuilderStore((state) => state.openPanel);

  // Get input schema for display
  const inputSchema = useWorkflowBuilderStore((state) => state.inputSchema);
  const outputMapping = useWorkflowBuilderStore((state) => state.outputMapping);

  // Create Input/Output nodes and enhanced node list with edges
  const { displayNodes, displayEdges } = useMemo(() => {
    // Filter to only task nodes (exclude any existing input/output nodes)
    const taskNodes = nodes.filter((n) => n.type === 'task');

    if (taskNodes.length === 0) {
      // No task nodes - just return original nodes/edges with selection
      return {
        displayNodes: nodes.map((node) => ({
          ...node,
          selected: selectedNodeIds.includes(node.id),
        })),
        displayEdges: edges.map((edge) => ({
          ...edge,
          selected: selectedEdgeIds.includes(edge.id),
        })),
      };
    }

    // Calculate default positions for Input/Output nodes
    const minX = Math.min(...taskNodes.map((n) => n.position.x));
    const maxX = Math.max(...taskNodes.map((n) => n.position.x));
    const avgY = taskNodes.reduce((sum, n) => sum + n.position.y, 0) / taskNodes.length;

    // Find root nodes (no incoming edges from other task nodes)
    const targetIds = new Set(edges.map((e) => e.target));
    const rootNodes = taskNodes.filter((n) => !targetIds.has(n.id));

    // Find leaf nodes (no outgoing edges to other task nodes)
    const sourceIds = new Set(edges.map((e) => e.source));
    const leafNodes = taskNodes.filter((n) => !sourceIds.has(n.id));

    // Use tracked position if available, otherwise calculate default
    const inputPosition = virtualNodePositions.input ?? { x: minX - 220, y: avgY };
    const outputPosition = virtualNodePositions.output ?? { x: maxX + 220, y: avgY };

    // Create Input node
    const inputNode: WorkflowBuilderNode = {
      id: '__input__',
      type: 'input',
      position: inputPosition,
      draggable: true,
      data: {
        label: 'Workflow Input',
        description: Object.keys(inputSchema).length > 0
          ? `${Object.keys(inputSchema).length} parameter(s)`
          : 'Click to define input schema',
        onClick: () => openPanel('input'),
        editable: true,
      },
    };

    // Create Output node
    const outputNode: WorkflowBuilderNode = {
      id: '__output__',
      type: 'output',
      position: outputPosition,
      draggable: true,
      data: {
        label: 'Workflow Output',
        description: Object.keys(outputMapping).length > 0
          ? `${Object.keys(outputMapping).length} output(s)`
          : 'Click to define output mapping',
        onClick: () => openPanel('output'),
        editable: true,
      },
    };

    // Create edges from Input to root nodes
    const inputEdges: WorkflowBuilderEdge[] = rootNodes.map((node) => ({
      id: `__input__-to-${node.id}`,
      source: '__input__',
      sourceHandle: 'output',
      target: node.id,
      targetHandle: 'target-left',
      type: 'dependency',
      animated: true,
      style: { stroke: '#22c55e', strokeWidth: 2 },
    }));

    // Create edges from leaf nodes to Output
    const outputEdges: WorkflowBuilderEdge[] = leafNodes.map((node) => ({
      id: `${node.id}-to-__output__`,
      source: node.id,
      sourceHandle: 'source-right',
      target: '__output__',
      targetHandle: 'input',
      type: 'dependency',
      animated: true,
      style: { stroke: '#a855f7', strokeWidth: 2 },
    }));

    // Combine all nodes with selection
    const allNodes = [inputNode, ...taskNodes, outputNode].map((node) => ({
      ...node,
      selected: selectedNodeIds.includes(node.id),
    }));

    // Combine all edges with selection
    const allEdges = [...inputEdges, ...edges, ...outputEdges].map((edge) => ({
      ...edge,
      selected: selectedEdgeIds.includes(edge.id),
    }));

    return { displayNodes: allNodes, displayEdges: allEdges };
  }, [nodes, edges, selectedNodeIds, selectedEdgeIds, inputSchema, outputMapping, openPanel, virtualNodePositions]);

  // Helper to check if an ID is a virtual node (Input/Output)
  const isVirtualNode = (id: string) => id === '__input__' || id === '__output__';
  const isVirtualEdge = (id: string) => id.startsWith('__input__-to-') || id.endsWith('-to-__output__');

  // Handle node changes (position, selection, etc.)
  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      changes.forEach((change) => {
        if (change.type === 'position' && change.position && 'id' in change) {
          // Handle virtual node positions separately
          if (change.id === '__input__') {
            setVirtualNodePositions((prev) => ({
              ...prev,
              input: change.position,
            }));
          } else if (change.id === '__output__') {
            setVirtualNodePositions((prev) => ({
              ...prev,
              output: change.position,
            }));
          } else {
            // Update regular node position in store
            updateNode(change.id, {
              position: change.position,
            });
          }
        } else if (change.type === 'select' && 'id' in change) {
          // Handle virtual node clicks - open their panels
          if (change.id === '__input__' && change.selected) {
            openPanel('input');
            return;
          }
          if (change.id === '__output__' && change.selected) {
            openPanel('output');
            return;
          }

          if (change.selected) {
            // Single select: only select the clicked node
            selectNodes([change.id]);
            // Switch to task panel when selecting a task node
            openPanel('task', change.id);
          } else {
            // Deselect: remove from selection
            const newSelection = selectedNodeIds.filter((id) => id !== change.id);
            selectNodes(newSelection);
          }
        }
      });
    },
    [updateNode, selectNodes, selectedNodeIds, openPanel]
  );

  // Handle edge changes (selection, deletion, etc.)
  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      changes.forEach((change) => {
        // Skip changes for virtual edges (Input → task, task → Output)
        if ('id' in change && isVirtualEdge(change.id)) return;

        if (change.type === 'select') {
          // Update selection in store (filter out virtual edges)
          const selectedIds = displayEdges
            .filter((e) => !isVirtualEdge(e.id) && (e.selected || (e.id === change.id && change.selected)))
            .map((e) => e.id);
          selectEdges(selectedIds);
        } else if (change.type === 'remove') {
          // Delete edge from store
          deleteEdge(change.id);
        }
      });
    },
    [selectEdges, deleteEdge, displayEdges]
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

  // Handle drag over (allow drop)
  const onDragOver = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  // Handle drop from task palette
  const onDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();

      const data = event.dataTransfer.getData('application/reactflow');
      if (!data) return;

      try {
        const dragData = JSON.parse(data);
        if (dragData.type !== 'task') return;

        // Get drop position in flow coordinates
        const position = screenToFlowPosition({
          x: event.clientX,
          y: event.clientY,
        });

        // Generate unique ID for the new node
        const nodeId = `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        // Create the new task node
        const newNode: WorkflowBuilderNode = {
          id: nodeId,
          type: 'task',
          position,
          data: {
            label: dragData.label || 'New Task',
            taskRef: dragData.taskRef,
            description: dragData.description,
          },
        };

        addNode(newNode);
      } catch (error) {
        console.error('Failed to parse drag data:', error);
      }
    },
    [screenToFlowPosition, addNode]
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

  // Only fit view on initial mount, not when nodes change
  // This prevents the canvas from jumping around when adding/removing nodes
  useEffect(() => {
    if (nodes.length > 0) {
      // One-time fit on first render with nodes
      setTimeout(() => fitView({ padding: 0.2 }), 100);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty deps = only on mount

  return (
    <div
      ref={reactFlowWrapper}
      className="w-full h-full"
      aria-label="Workflow canvas"
      tabIndex={0}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      <ReactFlow
        nodes={displayNodes}
        edges={displayEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        nodesDraggable
        nodesConnectable
        elementsSelectable
        selectNodesOnDrag={false}
        snapToGrid
        snapGrid={[15, 15]}
        defaultEdgeOptions={{
          type: 'smoothstep',
          animated: true,
          style: { strokeWidth: 2 },
        }}
        edgesFocusable
        edgesReconnectable={false}
      >
        <Background color="#aaa" gap={16} />
        <Controls />

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
