/**
 * Sort Node Component
 *
 * Visual editor for sortBy operation.
 */

'use client';

import { useCallback, useMemo } from 'react';
import { useTransformBuilderStore } from '@/lib/stores/transform-builder-store';
import type { SortByOperation } from '@/lib/types/transform-dsl';

interface SortNodeProps {
  operationIndex: number;
}

/**
 * Extract field names from an object, handling nested objects
 */
function extractFieldPaths(obj: unknown, prefix = '$'): string[] {
  if (typeof obj !== 'object' || obj === null) {
    return [];
  }

  const paths: string[] = [];
  for (const [key, value] of Object.entries(obj)) {
    const path = `${prefix}.${key}`;
    paths.push(path);

    // For nested objects, add nested paths too (one level deep)
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      for (const nestedKey of Object.keys(value)) {
        paths.push(`${path}.${nestedKey}`);
      }
    }
  }
  return paths;
}

export function SortNode({ operationIndex }: SortNodeProps) {
  const { pipeline, updateOperation, inputData } = useTransformBuilderStore();

  const operation = pipeline[operationIndex] as SortByOperation | undefined;

  // Extract available fields from input data
  const availableFields = useMemo(() => {
    if (inputData.length === 0) return [];
    return extractFieldPaths(inputData[0]);
  }, [inputData]);

  const handleFieldChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      updateOperation(operationIndex, { field: e.target.value });
    },
    [operationIndex, updateOperation]
  );

  // Quick select a field from available fields
  const handleQuickSelectField = useCallback(
    (fieldPath: string) => {
      updateOperation(operationIndex, { field: fieldPath });
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

      {/* Available Fields - Quick Select */}
      {availableFields.length > 0 && (
        <div className="bg-blue-50 rounded-lg p-3">
          <p className="text-xs font-medium text-blue-800 mb-2">
            Available fields ({availableFields.length}):
          </p>
          <div className="flex flex-wrap gap-1">
            {availableFields.map((field) => {
              const isSelected = operation.field === field;
              return (
                <button
                  key={field}
                  onClick={() => handleQuickSelectField(field)}
                  className={`px-2 py-1 text-xs font-mono rounded transition-colors ${
                    isSelected
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-blue-700 hover:bg-blue-100 border border-blue-200'
                  }`}
                >
                  {field.replace('$.', '')}
                </button>
              );
            })}
          </div>
        </div>
      )}

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
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-gray-900"
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
