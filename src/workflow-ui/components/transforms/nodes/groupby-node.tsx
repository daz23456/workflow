/**
 * GroupBy Node Component
 */

'use client';

import { useCallback, useMemo } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { useTransformBuilderStore } from '@/lib/stores/transform-builder-store';
import type { GroupByOperation, Aggregation } from '@/lib/types/transform-dsl';

interface GroupByNodeProps {
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

export function GroupByNode({ operationIndex }: GroupByNodeProps) {
  const { pipeline, updateOperation, inputData } = useTransformBuilderStore();
  const operation = pipeline[operationIndex] as GroupByOperation | undefined;

  // Extract available fields from input data
  const availableFields = useMemo(() => {
    if (inputData.length === 0) return [];
    return extractFieldPaths(inputData[0]);
  }, [inputData]);

  const handleKeyChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      updateOperation(operationIndex, { key: e.target.value });
    },
    [operationIndex, updateOperation]
  );

  // Quick select a field for the group key
  const handleQuickSelectKey = useCallback(
    (fieldPath: string) => {
      updateOperation(operationIndex, { key: fieldPath });
    },
    [operationIndex, updateOperation]
  );

  const handleAddAggregation = useCallback(() => {
    if (!operation) return;
    const newAgg: Aggregation = { function: 'count', field: '$.id' };

    // Generate unique key for the aggregation
    const existingKeys = Object.keys(operation.aggregations);
    const newKey = `agg${existingKeys.length + 1}`;

    updateOperation(operationIndex, {
      aggregations: { ...operation.aggregations, [newKey]: newAgg },
    });
  }, [operation, operationIndex, updateOperation]);

  const handleRemoveAggregation = useCallback(
    (key: string) => {
      if (!operation) return;
      const newAggregations = { ...operation.aggregations };
      delete newAggregations[key];
      updateOperation(operationIndex, { aggregations: newAggregations });
    },
    [operation, operationIndex, updateOperation]
  );

  const handleUpdateAggregation = useCallback(
    (key: string, updates: Partial<Aggregation>) => {
      if (!operation) return;
      const newAggregations = {
        ...operation.aggregations,
        [key]: { ...operation.aggregations[key], ...updates },
      };
      updateOperation(operationIndex, { aggregations: newAggregations });
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
        <h3 className="text-lg font-semibold text-gray-900">Group By</h3>
        <p className="text-sm text-gray-600">Group records by a field and apply aggregations</p>
      </div>

      {/* Available Fields - Quick Select */}
      {availableFields.length > 0 && (
        <div className="bg-blue-50 rounded-lg p-3">
          <p className="text-xs font-medium text-blue-800 mb-2">
            Available fields ({availableFields.length}):
          </p>
          <div className="flex flex-wrap gap-1">
            {availableFields.map((field) => {
              const isSelected = operation.key === field;
              return (
                <button
                  key={field}
                  onClick={() => handleQuickSelectKey(field)}
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

      <div>
        <label
          htmlFor={`groupby-key-${operationIndex}`}
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Group By Key
        </label>
        <input
          id={`groupby-key-${operationIndex}`}
          type="text"
          value={operation.key}
          onChange={handleKeyChange}
          className="w-full px-3 py-2 border border-gray-300 rounded-md font-mono text-gray-900"
          placeholder="$.category"
        />
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">Aggregations</label>
        {Object.entries(operation.aggregations).map(([key, agg]) => (
          <div key={key} className="flex gap-2 p-2 border rounded">
            <select
              value={agg.function}
              onChange={(e) => handleUpdateAggregation(key, { function: e.target.value as any })}
              className="px-2 py-1 border rounded text-sm"
            >
              <option value="sum">Sum</option>
              <option value="avg">Avg</option>
              <option value="min">Min</option>
              <option value="max">Max</option>
              <option value="count">Count</option>
            </select>
            <input
              type="text"
              value={agg.field}
              onChange={(e) => handleUpdateAggregation(key, { field: e.target.value })}
              className="flex-1 px-2 py-1 border rounded font-mono text-sm text-gray-900"
              placeholder="$.field"
            />
            <button onClick={() => handleRemoveAggregation(key)} className="p-1 text-red-600">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
        <button
          onClick={handleAddAggregation}
          className="flex items-center gap-2 px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded"
          aria-label="Add aggregation"
        >
          <Plus className="w-4 h-4" />
          Add Aggregation
        </button>
      </div>
    </div>
  );
}
