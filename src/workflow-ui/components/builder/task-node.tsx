/**
 * TaskNode - Custom React Flow Node for Workflow Tasks
 *
 * Features:
 * - Editable label (double-click or Enter to edit)
 * - Validation indicators (error/warning/valid)
 * - Delete button on hover
 * - Connection handles (source/target)
 * - Keyboard accessible
 */

'use client';

import { memo, useState, useRef, useEffect } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { AlertCircle, CheckCircle, AlertTriangle, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useWorkflowBuilderStore } from '@/lib/stores/workflow-builder-store';
import type { WorkflowBuilderNodeData } from '@/lib/types/workflow-builder';

export const TaskNode = memo(({ id, data, selected, isConnectable, dragging }: NodeProps) => {
  // Type-safe data access (WorkflowBuilderNodeData extends Record<string, unknown>)
  const nodeData = data as WorkflowBuilderNodeData;

  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(nodeData.label);
  const [isHovered, setIsHovered] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const updateNode = useWorkflowBuilderStore((state) => state.updateNode);
  const deleteNode = useWorkflowBuilderStore((state) => state.deleteNode);

  // Focus input when entering edit mode
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  // Determine validation state
  const getValidationState = (): 'error' | 'warning' | 'valid' => {
    if (!nodeData.taskRef) {
      return 'error';
    }
    if (!nodeData.description) {
      return 'warning';
    }
    return 'valid';
  };

  const validationState = getValidationState();

  const getValidationMessage = (): string => {
    if (!nodeData.taskRef) {
      return 'taskRef is required';
    }
    if (!nodeData.description) {
      return 'Description is recommended for clarity';
    }
    return 'Task configuration is valid';
  };

  // Enter edit mode
  const handleDoubleClick = () => {
    setIsEditing(true);
    setEditValue(nodeData.label);
  };

  // Enter edit mode with keyboard
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isEditing) {
      setIsEditing(true);
      setEditValue(nodeData.label);
    }
  };

  // Save changes
  const saveEdit = () => {
    if (editValue.trim() !== '') {
      updateNode(id, {
        data: {
          ...nodeData,
          label: editValue.trim(),
        },
      });
    } else {
      // Revert to original if empty
      setEditValue(nodeData.label);
    }
    setIsEditing(false);
  };

  // Cancel edit
  const cancelEdit = () => {
    setEditValue(nodeData.label);
    setIsEditing(false);
  };

  // Handle input key events
  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      saveEdit();
    } else if (e.key === 'Escape') {
      cancelEdit();
    }
  };

  // Handle delete
  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    deleteNode(id);
  };

  // Validation icon
  const ValidationIcon = () => {
    switch (validationState) {
      case 'error':
        return (
          <div
            data-testid="validation-error"
            data-validation="error"
            className="absolute -top-2 -right-2 bg-red-500 rounded-full p-1"
            title={getValidationMessage()}
          >
            <AlertCircle className="w-4 h-4 text-white" />
          </div>
        );
      case 'warning':
        return (
          <div
            data-validation="warning"
            className="absolute -top-2 -right-2 bg-yellow-500 rounded-full p-1"
            title={getValidationMessage()}
          >
            <AlertTriangle className="w-4 h-4 text-white" />
          </div>
        );
      case 'valid':
        return (
          <div
            data-validation="valid"
            className="absolute -top-2 -right-2 bg-green-500 rounded-full p-1"
            title={getValidationMessage()}
          >
            <CheckCircle className="w-4 h-4 text-white" />
          </div>
        );
    }
  };

  return (
    <div
      className={cn(
        'relative px-4 py-3 rounded-lg border-2 bg-white shadow-md transition-all min-w-[200px]',
        selected && 'ring-4 ring-blue-400 ring-opacity-50',
        isHovered && 'shadow-lg hover:border-blue-400',
        dragging && 'opacity-50',
        validationState === 'error' && 'border-red-300',
        validationState === 'warning' && 'border-yellow-300',
        validationState === 'valid' && 'border-green-300'
      )}
      data-selected={selected}
      data-dragging={dragging}
      data-node-type="task"
      onDoubleClick={handleDoubleClick}
      onKeyDown={handleKeyDown}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      role="article"
      aria-label={`Task: ${nodeData.label}`}
      tabIndex={0}
    >
      {/* Target Handle (incoming edges) */}
      <Handle
        type="target"
        position={Position.Top}
        id="target"
        isConnectable={isConnectable}
        data-connectable={isConnectable}
        className={cn(
          'w-3 h-3 !bg-blue-500 !border-2 !border-white',
          !isConnectable && 'opacity-50 cursor-not-allowed'
        )}
      />

      {/* Validation indicator */}
      <ValidationIcon />

      {/* Delete button (visible on hover when selected) */}
      {selected && isHovered && (
        <button
          data-testid="delete-node-button"
          onClick={handleDelete}
          className="absolute -top-2 -left-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 transition-colors"
          title="Delete task"
          aria-label="Delete task"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      )}

      {/* Label (editable) */}
      <div className="mb-2">
        {isEditing ? (
          <input
            ref={inputRef}
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={saveEdit}
            onKeyDown={handleInputKeyDown}
            className="w-full px-2 py-1 border border-blue-400 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
            aria-label="Edit task label"
          />
        ) : (
          <div className="font-semibold text-gray-900 text-sm">{nodeData.label}</div>
        )}
      </div>

      {/* TaskRef (read-only) */}
      <div className="text-xs text-gray-500 mb-1 font-mono">
        {nodeData.taskRef || <span className="text-red-500">No taskRef</span>}
      </div>

      {/* Description (optional) */}
      {nodeData.description && (
        <div className="text-xs text-gray-600 mt-2 border-t border-gray-200 pt-2">
          {nodeData.description}
        </div>
      )}

      {/* Source Handle (outgoing edges) */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="source"
        isConnectable={isConnectable}
        data-connectable={isConnectable}
        className={cn(
          'w-3 h-3 !bg-blue-500 !border-2 !border-white',
          !isConnectable && 'opacity-50 cursor-not-allowed'
        )}
      />

      {/* Screen reader announcements for validation */}
      {validationState === 'error' && (
        <div role="alert" className="sr-only">
          {getValidationMessage()}
        </div>
      )}
    </div>
  );
});

TaskNode.displayName = 'TaskNode';
