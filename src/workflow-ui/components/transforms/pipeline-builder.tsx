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
  Panel,
  Node,
  Edge,
  Handle,
  Position,
  useReactFlow,
  type NodeTypes,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Trash2, ChevronUp, ChevronDown, CheckCircle2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTransformBuilderStore } from '@/lib/stores/transform-builder-store';
import type { TransformOperation, SelectOperation, MapOperation, FilterOperation } from '@/lib/types/transform-dsl';

/**
 * Check if an operation is properly configured
 */
function isOperationConfigured(operation: TransformOperation): boolean {
  switch (operation.operation) {
    case 'select': {
      const op = operation as SelectOperation;
      return Object.keys(op.fields || {}).length > 0;
    }
    case 'map': {
      const op = operation as MapOperation;
      return Object.keys(op.mappings || {}).length > 0;
    }
    case 'filter': {
      const op = operation as FilterOperation;
      return !!(op.condition?.field && op.condition?.operator);
    }
    case 'limit':
    case 'skip':
      return true; // Always valid with defaults
    case 'sortBy':
      return !!(operation as any).field;
    case 'groupBy':
      return !!(operation as any).key;
    case 'flatMap':
      return !!(operation as any).path;
    case 'aggregate':
      return Object.keys((operation as any).aggregations || {}).length > 0;
    case 'enrich':
      return Object.keys((operation as any).fields || {}).length > 0;
    case 'join':
      return !!(
        (operation as any).leftKey &&
        (operation as any).rightKey &&
        (operation as any).rightData?.length > 0
      );
    default:
      return false;
  }
}

/**
 * Custom node component for transform operations
 */
function OperationNode({ data }: {
  data: {
    label: string;
    index: number;
    isFirst: boolean;
    isLast: boolean;
    isConfigured: boolean;
    totalCount: number;
  }
}) {
  const { selectOperation, selection, deleteOperation, moveOperation } = useTransformBuilderStore();
  const isSelected = selection.operationIndex === data.index;

  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    selectOperation(data.index);
  }, [data.index, selectOperation]);

  const handleDelete = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    deleteOperation(data.index);
  }, [data.index, deleteOperation]);

  const handleMoveUp = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (data.index > 0) {
      moveOperation(data.index, data.index - 1);
    }
  }, [data.index, moveOperation]);

  const handleMoveDown = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (data.index < data.totalCount - 1) {
      moveOperation(data.index, data.index + 1);
    }
  }, [data.index, data.totalCount, moveOperation]);

  return (
    <div
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          selectOperation(data.index);
        }
        if (e.key === 'Delete') {
          deleteOperation(data.index);
        }
      }}
      tabIndex={0}
      className={cn(
        'relative px-3 py-2 border-2 rounded-lg bg-white cursor-pointer transition-all min-w-[140px]',
        'hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500',
        isSelected ? 'border-blue-500 bg-blue-50 shadow-md' : 'border-gray-300',
        !data.isConfigured && 'border-orange-400 bg-orange-50'
      )}
      role="button"
      aria-label={`Operation: ${data.label}`}
    >
      {/* Input handle (top) - not shown for first node */}
      {!data.isFirst && (
        <Handle
          type="target"
          position={Position.Top}
          className="!bg-gray-400 !w-2 !h-2"
        />
      )}

      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {/* Status indicator */}
          {data.isConfigured ? (
            <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-orange-500 flex-shrink-0" />
          )}
          <span className="font-medium text-sm text-gray-900 capitalize">{data.label}</span>
        </div>

        {/* Action buttons - only show when selected */}
        {isSelected && (
          <div className="flex items-center gap-0.5">
            <button
              onClick={handleMoveUp}
              disabled={data.isFirst}
              className="p-0.5 text-gray-500 hover:text-blue-600 disabled:opacity-30 disabled:cursor-not-allowed"
              aria-label="Move up"
            >
              <ChevronUp className="w-4 h-4" />
            </button>
            <button
              onClick={handleMoveDown}
              disabled={data.isLast}
              className="p-0.5 text-gray-500 hover:text-blue-600 disabled:opacity-30 disabled:cursor-not-allowed"
              aria-label="Move down"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
            <button
              onClick={handleDelete}
              className="p-0.5 text-gray-500 hover:text-red-600"
              aria-label="Delete operation"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Output handle (bottom) - not shown for last node */}
      {!data.isLast && (
        <Handle
          type="source"
          position={Position.Bottom}
          className="!bg-blue-500 !w-2 !h-2"
        />
      )}
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
      position: { x: 100, y: index * 80 + 30 },
      data: {
        label: operation.operation,
        index,
        isFirst: index === 0,
        isLast: index === pipeline.length - 1,
        isConfigured: isOperationConfigured(operation),
        totalCount: pipeline.length,
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
        minZoom={0.5}
        maxZoom={1.5}
        panOnDrag
        zoomOnScroll={false}
        preventScrolling={false}
        defaultEdgeOptions={{
          type: 'smoothstep',
          animated: true,
        }}
        proOptions={{ hideAttribution: true }}
      >
        <Background gap={20} size={1} />
        <Controls showInteractive={false} className="!shadow-none !border-gray-200" />

        {/* Empty State */}
        {pipeline.length === 0 && (
          <Panel position="top-center">
            <div className="bg-white border border-dashed border-gray-300 rounded-lg px-4 py-3 shadow-sm">
              <p className="text-gray-500 text-sm">Drag operations here</p>
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
