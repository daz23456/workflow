/**
 * Operation Palette - Drag-and-Drop Operation Palette for Transform Builder
 *
 * Features:
 * - Display available transform operations with search/filter
 * - Drag-and-drop operations to pipeline canvas
 * - Category grouping
 * - Accessible keyboard navigation
 */

'use client';

import { useState, useMemo } from 'react';
import {
  Search,
  X,
  Columns,
  ArrowRightLeft,
  Plus,
  Filter,
  Hash,
  SkipForward,
  Group,
  Calculator,
  Layers,
  ArrowUpDown,
  Merge,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Operation metadata with categories
interface OperationDefinition {
  type: string;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  category: string;
}

// All 11 core operations organized by category
const OPERATIONS: OperationDefinition[] = [
  // Data Extraction
  { type: 'select', label: 'Select', description: 'Extract specific fields from objects', icon: Columns, category: 'Data Extraction' },
  { type: 'map', label: 'Map', description: 'Remap and rename fields', icon: ArrowRightLeft, category: 'Data Extraction' },
  { type: 'enrich', label: 'Enrich', description: 'Add computed fields to records', icon: Plus, category: 'Data Extraction' },

  // Filtering
  { type: 'filter', label: 'Filter', description: 'Keep matching records by condition', icon: Filter, category: 'Filtering' },
  { type: 'limit', label: 'Limit', description: 'Take first N records', icon: Hash, category: 'Filtering' },
  { type: 'skip', label: 'Skip', description: 'Skip first N records', icon: SkipForward, category: 'Filtering' },

  // Aggregation
  { type: 'groupBy', label: 'Group By', description: 'Group records and aggregate', icon: Group, category: 'Aggregation' },
  { type: 'aggregate', label: 'Aggregate', description: 'Aggregate entire dataset', icon: Calculator, category: 'Aggregation' },

  // Transformation
  { type: 'flatMap', label: 'Flatten', description: 'Flatten nested arrays', icon: Layers, category: 'Transformation' },
  { type: 'sortBy', label: 'Sort', description: 'Sort records by field', icon: ArrowUpDown, category: 'Transformation' },
  { type: 'join', label: 'Join', description: 'Join two datasets by key', icon: Merge, category: 'Transformation' },
];

// Group operations by category
const CATEGORIES = ['Data Extraction', 'Filtering', 'Aggregation', 'Transformation'];

export function OperationPalette() {
  const [searchQuery, setSearchQuery] = useState('');
  const [draggingOperation, setDraggingOperation] = useState<string | null>(null);

  // Filter operations by search query
  const filteredOperations = useMemo(() => {
    if (!searchQuery.trim()) return OPERATIONS;

    const query = searchQuery.toLowerCase();
    return OPERATIONS.filter(
      (op) =>
        op.label.toLowerCase().includes(query) ||
        op.description.toLowerCase().includes(query) ||
        op.type.toLowerCase().includes(query)
    );
  }, [searchQuery]);

  // Group filtered operations by category
  const operationsByCategory = useMemo(() => {
    const grouped: Record<string, OperationDefinition[]> = {};
    for (const category of CATEGORIES) {
      const ops = filteredOperations.filter((op) => op.category === category);
      if (ops.length > 0) {
        grouped[category] = ops;
      }
    }
    return grouped;
  }, [filteredOperations]);

  // Handle drag start
  const handleDragStart = (operation: OperationDefinition, event: React.DragEvent<HTMLDivElement>) => {
    setDraggingOperation(operation.type);

    if (!event.dataTransfer) return;

    const dragData = {
      operationType: operation.type,
      label: operation.label,
      description: operation.description,
    };

    event.dataTransfer.setData('application/reactflow', JSON.stringify(dragData));
    event.dataTransfer.effectAllowed = 'move';
  };

  // Handle drag end
  const handleDragEnd = () => {
    setDraggingOperation(null);
  };

  const hasResults = filteredOperations.length > 0;

  return (
    <div
      data-testid="operation-palette"
      className="w-full h-full bg-white dark:bg-gray-800 flex flex-col overflow-hidden"
      aria-label="Operation palette"
    >
      {/* Search - compact */}
      <div className="flex-shrink-0 p-2 border-b border-gray-100 dark:border-gray-700">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-3 h-3 text-gray-400" />
          <input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-7 pr-7 py-1.5 text-xs border border-gray-200 dark:border-gray-600 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white dark:bg-gray-700 dark:text-gray-100"
            aria-label="Search operations"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 transform -translate-y-1/2"
              aria-label="Clear search"
            >
              <X className="w-3 h-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" />
            </button>
          )}
        </div>
      </div>

      {/* Operations List */}
      <div className="flex-1 overflow-y-auto p-2">
        {!hasResults ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <p className="text-sm">No operations found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {CATEGORIES.map((category) => {
              const operations = operationsByCategory[category];
              if (!operations || operations.length === 0) return null;

              return (
                <div key={category}>
                  {/* Category Header */}
                  <h3 className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1.5 px-1">
                    {category}
                  </h3>

                  {/* Operation Cards - compact */}
                  <div className="space-y-1">
                    {operations.map((operation) => {
                      const Icon = operation.icon;
                      const isDragging = draggingOperation === operation.type;

                      return (
                        <div
                          key={operation.type}
                          data-testid={`operation-card-${operation.type}`}
                          draggable
                          onDragStart={(e) => handleDragStart(operation, e)}
                          onDragEnd={handleDragEnd}
                          data-dragging={isDragging ? 'true' : 'false'}
                          className={cn(
                            'p-2 border rounded cursor-move transition-all',
                            isDragging && 'opacity-50 border-blue-400 bg-blue-50 dark:bg-blue-900/30',
                            !isDragging && 'border-gray-100 dark:border-gray-600 hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 bg-white dark:bg-gray-700'
                          )}
                          aria-label={`Drag ${operation.label} operation to canvas`}
                          tabIndex={0}
                          role="button"
                        >
                          <div className="flex items-center gap-2">
                            <div className="flex-shrink-0 p-1 bg-blue-50 dark:bg-blue-900/50 rounded">
                              <Icon className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-xs text-gray-900 dark:text-gray-100">
                                {operation.label}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
