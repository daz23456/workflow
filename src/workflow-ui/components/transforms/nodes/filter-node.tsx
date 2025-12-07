/**
 * Filter Node Component
 */

'use client';

import { useCallback, useMemo } from 'react';
import { useTransformBuilderStore } from '@/lib/stores/transform-builder-store';
import type { FilterOperation, Condition } from '@/lib/types/transform-dsl';

interface FilterNodeProps {
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

    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      for (const nestedKey of Object.keys(value)) {
        paths.push(`${path}.${nestedKey}`);
      }
    }
  }
  return paths;
}

export function FilterNode({ operationIndex }: FilterNodeProps) {
  const { pipeline, updateOperation, inputData } = useTransformBuilderStore();
  const operation = pipeline[operationIndex] as FilterOperation | undefined;

  // Extract available fields from input data
  const availableFields = useMemo(() => {
    if (inputData.length === 0) return [];
    return extractFieldPaths(inputData[0]);
  }, [inputData]);

  const handleUpdate = useCallback(
    (updates: Partial<Condition>) => {
      if (!operation) return;
      updateOperation(operationIndex, {
        condition: { ...operation.condition, ...updates },
      });
    },
    [operation, operationIndex, updateOperation]
  );

  // Quick select a field from available fields
  const handleQuickSelectField = useCallback(
    (fieldPath: string) => {
      if (!operation) return;
      updateOperation(operationIndex, {
        condition: { ...operation.condition, field: fieldPath },
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

      {/* Available Fields - Quick Select */}
      {availableFields.length > 0 && (
        <div className="bg-blue-50 rounded-lg p-3">
          <p className="text-xs font-medium text-blue-800 mb-2">
            Available fields ({availableFields.length}):
          </p>
          <div className="flex flex-wrap gap-1">
            {availableFields.map((field) => {
              const isSelected = operation.condition.field === field;
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
            className="w-full px-2 py-1 border border-gray-300 rounded-md font-mono text-sm text-gray-900"
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
            className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm text-gray-900"
            aria-label="Value"
          />
        </div>
      </div>
    </div>
  );
}
