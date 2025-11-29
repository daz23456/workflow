/**
 * Sort Node Component
 *
 * Visual editor for sortBy operation.
 */

'use client';

import { useCallback } from 'react';
import { useTransformBuilderStore } from '@/lib/stores/transform-builder-store';
import type { SortByOperation } from '@/lib/types/transform-dsl';

interface SortNodeProps {
  operationIndex: number;
}

export function SortNode({ operationIndex }: SortNodeProps) {
  const { pipeline, updateOperation } = useTransformBuilderStore();

  const operation = pipeline[operationIndex] as SortByOperation | undefined;

  const handleFieldChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      updateOperation(operationIndex, { field: e.target.value });
    },
    [operationIndex, updateOperation]
  );

  const handleOrderChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      updateOperation(operationIndex, {
        order: e.target.value as 'asc' | 'desc',
      });
    },
    [operationIndex, updateOperation]
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
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900">Sort By</h3>
        <p className="text-sm text-gray-600">
          Sort records by a field in ascending or descending order
        </p>
      </div>

      {/* Field Input */}
      <div>
        <label
          htmlFor={`sort-field-${operationIndex}`}
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Field (JSONPath)
        </label>
        <input
          type="text"
          id={`sort-field-${operationIndex}`}
          value={operation.field}
          onChange={handleFieldChange}
          placeholder="$.fieldName"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
        />
      </div>

      {/* Order Selector */}
      <div>
        <label
          htmlFor={`sort-order-${operationIndex}`}
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Order
        </label>
        <select
          id={`sort-order-${operationIndex}`}
          value={operation.order}
          onChange={handleOrderChange}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="asc">Ascending (A→Z, 0→9)</option>
          <option value="desc">Descending (Z→A, 9→0)</option>
        </select>
      </div>

      {/* Preview */}
      <div className="bg-gray-50 rounded-lg p-3 text-sm">
        <p className="text-gray-700">
          Will sort by <code className="bg-white px-1 py-0.5 rounded">{operation.field}</code> in{' '}
          <strong>{operation.order === 'asc' ? 'ascending' : 'descending'}</strong> order
        </p>
      </div>
    </div>
  );
}
