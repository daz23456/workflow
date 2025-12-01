/**
 * OutputNode - Visual representation of workflow output
 *
 * Displays as the ending point of the workflow with output mapping.
 * Clicking opens the Output Mapping panel in the builder.
 */

'use client';

import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { CheckCircle2, Edit2 } from 'lucide-react';
import type { WorkflowBuilderNodeData } from '@/lib/types/workflow-builder';

interface OutputNodeData extends WorkflowBuilderNodeData {
  onClick?: () => void;
  editable?: boolean;
}

export const OutputNode = memo(function OutputNode({
  data,
  selected,
}: NodeProps & { data: OutputNodeData }) {
  const handleClick = (e: React.MouseEvent) => {
    if (data.onClick) {
      e.stopPropagation();
      data.onClick();
    }
  };

  return (
    <div
      data-testid="output-node"
      onClick={handleClick}
      className={`
        px-4 py-3 rounded-lg border-2 shadow-sm min-w-[160px]
        bg-gradient-to-br from-purple-50 to-purple-100
        ${selected ? 'border-purple-500 ring-2 ring-purple-200' : 'border-purple-300'}
        ${data.onClick ? 'cursor-pointer hover:border-purple-400 hover:shadow-md' : ''}
        transition-all duration-200
      `}
    >
      {/* Input handle (left side) - for horizontal layouts */}
      <Handle
        type="target"
        position={Position.Left}
        id="input"
        className="!w-3 !h-3 !bg-purple-500 !border-2 !border-white"
      />
      {/* Input handle (top) - for vertical layouts */}
      <Handle
        type="target"
        position={Position.Top}
        id="top"
        className="!w-3 !h-3 !bg-purple-500 !border-2 !border-white"
      />

      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <div className="p-1.5 bg-purple-500 rounded-full">
          <CheckCircle2 className="w-4 h-4 text-white" />
        </div>
        <span className="font-semibold text-sm text-purple-800 flex-1">{data.label || 'Output'}</span>
        {data.editable && (
          <Edit2 className="w-3.5 h-3.5 text-purple-600 opacity-60" />
        )}
      </div>

      {/* Output mapping preview */}
      {data.description && (
        <div className="text-xs text-purple-600 mt-1">{data.description}</div>
      )}
    </div>
  );
});
