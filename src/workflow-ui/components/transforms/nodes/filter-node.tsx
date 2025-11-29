/**
 * Filter Node Component
 */

'use client';

import { useCallback } from 'react';
import { useTransformBuilderStore } from '@/lib/stores/transform-builder-store';
import type { FilterOperation, Condition } from '@/lib/types/transform-dsl';

interface FilterNodeProps {
  operationIndex: number;
}

export function FilterNode({ operationIndex }: FilterNodeProps) {
  const { pipeline, updateOperation } = useTransformBuilderStore();
  const operation = pipeline[operationIndex] as FilterOperation | undefined;

  const handleUpdate = useCallback(
    (updates: Partial<Condition>) => {
      if (!operation) return;
      updateOperation(operationIndex, {
        condition: { ...operation.condition, ...updates },
      });
    },
    [operation, operationIndex, updateOperation]
  );

  if (!operation) {
    return (
      <div className="p-4 text-red-600">
        <p>Operation not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-gray-900">Filter</h3>
        <p className="text-sm text-gray-600">Keep only records matching a condition</p>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div>
          <label
            htmlFor={`filter-field-${operationIndex}`}
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Field
          </label>
          <input
            id={`filter-field-${operationIndex}`}
            type="text"
            value={operation.condition.field}
            onChange={(e) => handleUpdate({ field: e.target.value })}
            className="w-full px-2 py-1 border border-gray-300 rounded-md font-mono text-sm"
            placeholder="$.field"
          />
        </div>

        <div>
          <label
            htmlFor={`filter-op-${operationIndex}`}
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Operator
          </label>
          <select
            id={`filter-op-${operationIndex}`}
            value={operation.condition.operator}
            onChange={(e) => handleUpdate({ operator: e.target.value as Condition['operator'] })}
            className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm"
            aria-label="Operator"
          >
            <option value="eq">Equals</option>
            <option value="ne">Not Equals</option>
            <option value="gt">Greater Than</option>
            <option value="lt">Less Than</option>
            <option value="gte">≥</option>
            <option value="lte">≤</option>
            <option value="contains">Contains</option>
            <option value="startsWith">Starts With</option>
            <option value="endsWith">Ends With</option>
          </select>
        </div>

        <div>
          <label
            htmlFor={`filter-val-${operationIndex}`}
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Value
          </label>
          <input
            id={`filter-val-${operationIndex}`}
            type="text"
            value={String(operation.condition.value ?? '')}
            onChange={(e) => handleUpdate({ value: e.target.value })}
            className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm"
            aria-label="Value"
          />
        </div>
      </div>
    </div>
  );
}
