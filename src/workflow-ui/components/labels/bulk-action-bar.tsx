'use client';

import { cn } from '@/lib/utils';
import { X, Tags, Trash2 } from 'lucide-react';

interface BulkActionBarProps {
  selectedCount: number;
  entityType: 'workflow' | 'task';
  onClearSelection: () => void;
  onEditLabels: () => void;
  onDelete?: () => void;
  isLoading?: boolean;
  className?: string;
}

export function BulkActionBar({
  selectedCount,
  entityType,
  onClearSelection,
  onEditLabels,
  onDelete,
  isLoading = false,
  className,
}: BulkActionBarProps) {
  if (selectedCount === 0) {
    return null;
  }

  const entityLabel = entityType === 'workflow'
    ? selectedCount === 1 ? 'workflow' : 'workflows'
    : selectedCount === 1 ? 'task' : 'tasks';

  return (
    <div
      className={cn(
        'fixed bottom-4 left-1/2 -translate-x-1/2 z-50',
        'flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg',
        'bg-gray-900 dark:bg-gray-800 text-white',
        'animate-slide-up',
        className
      )}
    >
      {/* Selection count */}
      <span className="text-sm font-medium">
        {selectedCount} {entityLabel} selected
      </span>

      {/* Divider */}
      <div className="h-4 w-px bg-gray-600" />

      {/* Actions */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onEditLabels}
          disabled={isLoading}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
            'bg-blue-600 hover:bg-blue-700 text-white',
            'disabled:opacity-50 disabled:cursor-not-allowed'
          )}
        >
          <Tags className="h-4 w-4" />
          Edit Labels
        </button>

        {onDelete && (
          <button
            type="button"
            onClick={onDelete}
            disabled={isLoading}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
              'bg-red-600 hover:bg-red-700 text-white',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </button>
        )}
      </div>

      {/* Clear selection */}
      <button
        type="button"
        onClick={onClearSelection}
        className={cn(
          'flex items-center gap-1 px-2 py-1 rounded text-sm transition-colors',
          'text-gray-300 hover:text-white hover:bg-gray-700'
        )}
      >
        <X className="h-4 w-4" />
        Clear
      </button>
    </div>
  );
}
