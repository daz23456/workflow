/**
 * Pipeline Builder Canvas Component
 *
 * React Flow-based visual transform pipeline builder.
 * Displays operations as sequential nodes with vertical layout.
 * Supports drag-and-drop from operation palette.
 */

'use client';

import { useCallback, useEffect, useMemo, useState, type DragEvent } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Panel,
  Node,
  Edge,
  useReactFlow,
  type NodeTypes,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { cn } from '@/lib/utils';
import { useTransformBuilderStore } from '@/lib/stores/transform-builder-store';
import type { TransformOperation } from '@/lib/types/transform-dsl';

/**
 * Custom node component for transform operations
 */
function OperationNode({ data }: { data: { label: string; index: number } }) {
  const { selectOperation } = useTransformBuilderStore();

  const handleClick = useCallback(() => {
    selectOperation(data.index);
  }, [data.index, selectOperation]);

  return (
    <div
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          handleClick();
        }
      }}
      tabIndex={0}
      className="px-4 py-2 border-2 border-gray-300 rounded-lg bg-white cursor-pointer hover:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
      role="button"
      aria-label={`Operation: ${data.label}`}
    >
      <div className="font-medium text-gray-900">{data.label}</div>
    </div>
  );
}

const nodeTypes: NodeTypes = {
  operation: OperationNode,
};

/**
 * Create a default operation configuration based on type
 */
function createDefaultOperation(operationType: string): TransformOperation {
  switch (operationType) {
    case 'select':
      return { operation: 'select', fields: {} };
    case 'filter':
      return { operation: 'filter', condition: { field: '', operator: 'eq', value: '' } };
    case 'map':
      return { operation: 'map', mappings: {} };
    case 'flatMap':
      return { operation: 'flatMap', path: '' };
    case 'groupBy':
      return { operation: 'groupBy', key: '', aggregations: {} };
    case 'join':
      return { operation: 'join', leftKey: '', rightKey: '', rightData: [], joinType: 'inner' };
    case 'sortBy':
      return { operation: 'sortBy', field: '', order: 'asc' };
    case 'enrich':
      return { operation: 'enrich', fields: {} };
    case 'aggregate':
      return { operation: 'aggregate', aggregations: {} };
    case 'limit':
      return { operation: 'limit', count: 10 };
    case 'skip':
      return { operation: 'skip', count: 0 };
    default:
      return { operation: operationType } as TransformOperation;
  }
}

/**
 * Pipeline Builder Canvas
 */
export function PipelineBuilder() {
  const { fitView } = useReactFlow();
  const { pipeline, selection, deleteOperation, undo, redo, clearSelection, addOperation } =
    useTransformBuilderStore();
  const [isDragOver, setIsDragOver] = useState(false);

  // Convert pipeline operations to React Flow nodes
  const nodes = useMemo<Node[]>(() => {
    return pipeline.map((operation, index) => ({
      id: `operation-${index}`,
      type: 'operation',
      position: { x: 250, y: index * 150 + 50 },
      data: {
        label: operation.operation,
        index,
      },
      selected: selection.operationIndex === index,
    }));
  }, [pipeline, selection.operationIndex]);

  // Create edges connecting sequential operations
  const edges = useMemo<Edge[]>(() => {
    const edgeList: Edge[] = [];

    for (let i = 0; i < pipeline.length - 1; i++) {
      edgeList.push({
        id: `edge-${i}`,
        source: `operation-${i}`,
        target: `operation-${i + 1}`,
        type: 'smoothstep',
        animated: true,
      });
    }

    return edgeList;
  }, [pipeline.length]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Delete: remove selected operation
      if (e.key === 'Delete' && selection.operationIndex !== -1) {
        deleteOperation(selection.operationIndex);
      }

      // Cmd+Z: undo
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      }

      // Cmd+Shift+Z: redo
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && e.shiftKey) {
        e.preventDefault();
        redo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selection.operationIndex, deleteOperation, undo, redo]);

  // Fit view on mount and when nodes change
  useEffect(() => {
    if (nodes.length > 0) {
      setTimeout(() => fitView({ padding: 0.2 }), 0);
    }
  }, [nodes.length, fitView]);

  // Clear selection on canvas click
  const handlePaneClick = useCallback(() => {
    clearSelection();
  }, [clearSelection]);

  // Handle drag over for drop zone
  const handleDragOver = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }
    setIsDragOver(true);
  }, []);

  // Handle drag leave
  const handleDragLeave = useCallback(() => {
    setIsDragOver(false);
  }, []);

  // Handle drop from operation palette
  const handleDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      setIsDragOver(false);

      const data = event.dataTransfer.getData('application/reactflow');
      if (!data) return;

      try {
        const { operationType } = JSON.parse(data);
        if (!operationType) return;

        // Create default operation and add to pipeline
        const operation = createDefaultOperation(operationType);
        addOperation(operation);
      } catch {
        // Invalid JSON, ignore the drop
      }
    },
    [addOperation]
  );

  return (
    <div
      className={cn(
        'h-full w-full transition-colors',
        isDragOver && 'bg-blue-50 ring-2 ring-blue-400 ring-inset'
      )}
      aria-label="Transform pipeline canvas"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onPaneClick={handlePaneClick}
        fitView
        minZoom={0.1}
        maxZoom={2}
        defaultEdgeOptions={{
          type: 'smoothstep',
          animated: true,
        }}
      >
        <Background />
        <Controls />
        <MiniMap />

        {/* Empty State */}
        {pipeline.length === 0 && (
          <Panel position="top-center">
            <div className="bg-white border border-gray-300 rounded-lg px-6 py-4 shadow-sm">
              <p className="text-gray-600 text-sm">Drag operations here to build your pipeline</p>
            </div>
          </Panel>
        )}
      </ReactFlow>
    </div>
  );
}

/**
 * Wrapper component that provides ReactFlow context
 */
export function PipelineBuilderWrapper() {
  return (
    <div className="h-full w-full">
      <ReactFlow>
        <PipelineBuilder />
      </ReactFlow>
    </div>
  );
}
