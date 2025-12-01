/**
 * InputNode - Visual representation of workflow input
 *
 * Displays as the starting point of the workflow with schema information.
 * Clicking opens the Input Schema panel in the builder.
 */

'use client';

import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { PlayCircle, Edit2 } from 'lucide-react';
import type { WorkflowBuilderNodeData } from '@/lib/types/workflow-builder';

interface InputNodeData extends WorkflowBuilderNodeData {
  onClick?: () => void;
  editable?: boolean;
}

export const InputNode = memo(function InputNode({
  data,
  selected,
}: NodeProps & { data: InputNodeData }) {
  const handleClick = (e: React.MouseEvent) => {
    if (data.onClick) {
      e.stopPropagation();
      data.onClick();
    }
  };

  return (
    <div
      data-testid="input-node"
      onClick={handleClick}
      className={`
        px-4 py-3 rounded-lg border-2 shadow-sm min-w-[160px]
        bg-gradient-to-br from-green-50 to-green-100
        ${selected ? 'border-green-500 ring-2 ring-green-200' : 'border-green-300'}
        ${data.onClick ? 'cursor-pointer hover:border-green-400 hover:shadow-md' : ''}
        transition-all duration-200
      `}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <div className="p-1.5 bg-green-500 rounded-full">
          <PlayCircle className="w-4 h-4 text-white" />
        </div>
        <span className="font-semibold text-sm text-green-800 flex-1">{data.label || 'Input'}</span>
        {data.editable && (
          <Edit2 className="w-3.5 h-3.5 text-green-600 opacity-60" />
        )}
      </div>

      {/* Schema preview */}
      {data.description && (
        <div className="text-xs text-green-600 mt-1">{data.description}</div>
      )}

      {/* Output handle (right side) - for horizontal layouts */}
      <Handle
        type="source"
        position={Position.Right}
        id="output"
        className="!w-3 !h-3 !bg-green-500 !border-2 !border-white"
      />
      {/* Output handle (bottom) - for vertical layouts */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        className="!w-3 !h-3 !bg-green-500 !border-2 !border-white"
      />
    </div>
  );
});
