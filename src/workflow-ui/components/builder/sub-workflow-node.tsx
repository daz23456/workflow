/**
 * SubWorkflowNode - Custom React Flow Node for Sub-Workflow References
 *
 * Features:
 * - Displays sub-workflow reference with nested icon
 * - Task count badge showing internal complexity
 * - Expand/collapse functionality to drill into sub-workflow
 * - Execution status indicators (idle/running/success/failed)
 * - Cycle detection warning display
 * - Connection handles (source/target)
 * - Keyboard accessible
 */

'use client';

import { memo, useState } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import {
  AlertCircle,
  CheckCircle,
  AlertTriangle,
  Trash2,
  ChevronDown,
  ChevronUp,
  Layers,
  RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useWorkflowBuilderStore } from '@/lib/stores/workflow-builder-store';
import type { SubWorkflowNodeData } from '@/lib/types/workflow-builder';

interface SubWorkflowNodeProps extends NodeProps {
  onExpand?: (nodeId: string, workflowRef: string) => void;
}

export const SubWorkflowNode = memo(
  ({ id, data, selected, isConnectable, dragging, onExpand }: SubWorkflowNodeProps) => {
    const nodeData = data as SubWorkflowNodeData;
    const [isHovered, setIsHovered] = useState(false);

    const deleteNode = useWorkflowBuilderStore((state) => state.deleteNode);

    // Determine validation state
    const getValidationState = (): 'error' | 'valid' => {
      if (!nodeData.workflowRef) {
        return 'error';
      }
      return 'valid';
    };

    const validationState = getValidationState();

    const getValidationMessage = (): string => {
      if (!nodeData.workflowRef) {
        return 'workflowRef is required';
      }
      return 'Sub-workflow configuration is valid';
    };

    // Handle expand/collapse
    const handleExpand = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (onExpand && nodeData.workflowRef) {
        onExpand(id, nodeData.workflowRef);
      }
    };

    // Handle delete
    const handleDelete = (e: React.MouseEvent) => {
      e.stopPropagation();
      deleteNode(id);
    };

    // Get execution status styles
    const getStatusStyles = () => {
      switch (nodeData.executionStatus) {
        case 'running':
          return 'bg-blue-500 animate-pulse';
        case 'success':
          return 'bg-green-500';
        case 'failed':
          return 'bg-red-500';
        default:
          return 'bg-gray-400';
      }
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
          'relative px-4 py-3 rounded-lg border-2 bg-gradient-to-br from-indigo-50 to-purple-50 shadow-md transition-all min-w-[220px]',
          selected && 'ring-4 ring-indigo-400 ring-opacity-50',
          isHovered && 'shadow-lg hover:border-indigo-400',
          dragging && 'opacity-50',
          validationState === 'error' && 'border-red-300',
          validationState === 'valid' && 'border-indigo-300'
        )}
        data-selected={selected}
        data-dragging={dragging}
        data-node-type="subworkflow"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        role="article"
        aria-label={`Sub-workflow: ${nodeData.label}`}
        tabIndex={0}
      >
        {/* Target Handle - Top */}
        <Handle
          type="target"
          position={Position.Top}
          id="target"
          isConnectable={isConnectable}
          data-connectable={isConnectable}
          className={cn(
            'w-3 h-3 !bg-indigo-500 !border-2 !border-white',
            !isConnectable && 'opacity-50 cursor-not-allowed'
          )}
        />

        {/* Target Handle - Left */}
        <Handle
          type="target"
          position={Position.Left}
          id="target-left"
          isConnectable={isConnectable}
          className="w-3 h-3 !bg-green-500 !border-2 !border-white"
        />

        {/* Validation indicator */}
        <ValidationIcon />

        {/* Cycle warning indicator */}
        {nodeData.cycleWarning && (
          <div
            data-testid="cycle-warning"
            className="absolute -top-2 left-1/2 transform -translate-x-1/2 bg-orange-500 rounded-full p-1 cursor-help"
            title={nodeData.cycleWarning}
          >
            <RefreshCw className="w-4 h-4 text-white" />
          </div>
        )}

        {/* Delete button (visible on hover when selected) */}
        {selected && isHovered && (
          <button
            data-testid="delete-node-button"
            onClick={handleDelete}
            className="absolute -top-2 -left-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 transition-colors"
            title="Delete sub-workflow"
            aria-label="Delete sub-workflow"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}

        {/* Header with icon and label */}
        <div className="flex items-center gap-2 mb-2">
          <div data-testid="subworkflow-icon" className="text-indigo-600">
            <Layers className="w-5 h-5" />
          </div>
          <div className="font-semibold text-gray-900 text-sm flex-1">{nodeData.label}</div>
          <div
            data-testid="execution-status"
            data-status={nodeData.executionStatus || 'idle'}
            className={cn('w-3 h-3 rounded-full', getStatusStyles())}
            title={`Status: ${nodeData.executionStatus || 'idle'}`}
          />
        </div>

        {/* WorkflowRef */}
        <div className="text-xs text-indigo-700 mb-1 font-mono bg-indigo-100 px-2 py-1 rounded">
          {nodeData.workflowRef || <span className="text-red-500">No workflowRef</span>}
        </div>

        {/* Task count badge */}
        {nodeData.taskCount !== undefined && nodeData.taskCount > 0 && (
          <div className="text-xs text-gray-600 mb-2">
            <span className="bg-indigo-200 text-indigo-800 px-2 py-0.5 rounded-full">
              {nodeData.taskCount} tasks
            </span>
          </div>
        )}

        {/* Description */}
        {nodeData.description && (
          <div className="text-xs text-gray-600 mt-2 border-t border-indigo-200 pt-2">
            {nodeData.description}
          </div>
        )}

        {/* Expand/Collapse button */}
        <div className="mt-2 pt-2 border-t border-indigo-200">
          {nodeData.isExpanded ? (
            <button
              data-testid="collapse-subworkflow-button"
              onClick={handleExpand}
              className="w-full flex items-center justify-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 transition-colors"
            >
              <ChevronUp className="w-4 h-4" />
              Collapse
            </button>
          ) : (
            <button
              data-testid="expand-subworkflow-button"
              onClick={handleExpand}
              className="w-full flex items-center justify-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 transition-colors"
            >
              <ChevronDown className="w-4 h-4" />
              Expand
            </button>
          )}
        </div>

        {/* Source Handle - Bottom */}
        <Handle
          type="source"
          position={Position.Bottom}
          id="source"
          isConnectable={isConnectable}
          data-connectable={isConnectable}
          className={cn(
            'w-3 h-3 !bg-indigo-500 !border-2 !border-white',
            !isConnectable && 'opacity-50 cursor-not-allowed'
          )}
        />

        {/* Source Handle - Right */}
        <Handle
          type="source"
          position={Position.Right}
          id="source-right"
          isConnectable={isConnectable}
          className="w-3 h-3 !bg-purple-500 !border-2 !border-white"
        />

        {/* Screen reader announcements for cycle warnings */}
        {nodeData.cycleWarning && (
          <div role="alert" className="sr-only">
            {nodeData.cycleWarning}
          </div>
        )}
      </div>
    );
  }
);

SubWorkflowNode.displayName = 'SubWorkflowNode';
