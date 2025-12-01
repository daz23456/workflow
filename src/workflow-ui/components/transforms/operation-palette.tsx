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
      className="w-full h-full bg-white border-r border-gray-200 flex flex-col overflow-hidden"
      aria-label="Operation palette"
    >
      {/* Search */}
      <div className="p-4 border-b border-gray-200">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search operations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Search operations"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 transform -translate-y-1/2"
              aria-label="Clear search"
            >
              <X className="w-4 h-4 text-gray-400 hover:text-gray-600" />
            </button>
          )}
        </div>
      </div>

      {/* Operations List */}
      <div className="flex-1 overflow-y-auto p-4">
        {!hasResults ? (
          <div className="text-center py-8 text-gray-500">
            <p className="text-sm">No operations found</p>
          </div>
        ) : (
          <div className="space-y-6">
            {CATEGORIES.map((category) => {
              const operations = operationsByCategory[category];
              if (!operations || operations.length === 0) return null;

              return (
                <div key={category}>
                  {/* Category Header */}
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                    {category}
                  </h3>

                  {/* Operation Cards */}
                  <div className="space-y-2">
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
                            'p-3 border rounded-lg cursor-move transition-all',
                            isDragging && 'opacity-50 border-blue-400 bg-blue-50',
                            !isDragging && 'border-gray-200 hover:border-blue-400 hover:shadow-md bg-white'
                          )}
                          aria-label={`Drag ${operation.label} operation to canvas`}
                          tabIndex={0}
                          role="button"
                        >
                          <div className="flex items-start gap-3">
                            <div className="flex-shrink-0 p-2 bg-blue-50 rounded-lg">
                              <Icon className="w-4 h-4 text-blue-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-sm text-gray-900">
                                {operation.label}
                              </div>
                              <div className="text-xs text-gray-500 mt-0.5">
                                {operation.description}
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
