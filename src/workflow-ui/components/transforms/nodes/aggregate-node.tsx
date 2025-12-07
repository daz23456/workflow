/**
 * Aggregate Node Component
 *
 * Visual editor for aggregate operation (sum, avg, min, max, count).
 */

'use client';

import { useCallback, useMemo, useState } from 'react';
import { Trash2, Plus } from 'lucide-react';
import { useTransformBuilderStore } from '@/lib/stores/transform-builder-store';
import type { AggregateOperation, Aggregation } from '@/lib/types/transform-dsl';

interface AggregateNodeProps {
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

export function AggregateNode({ operationIndex }: AggregateNodeProps) {
  const { pipeline, updateOperation, inputData } = useTransformBuilderStore();

  const operation = pipeline[operationIndex] as AggregateOperation | undefined;

  // Extract available fields from input data
  const availableFields = useMemo(() => {
    if (inputData.length === 0) return [];
    return extractFieldPaths(inputData[0]);
  }, [inputData]);

  // Track which aggregation is being edited for field quick-select
  const [activeAggKey, setActiveAggKey] = useState<string | null>(null);

  const handleAddAggregation = useCallback(() => {
    if (!operation) return;

    const newAggregation: Aggregation = {
      function: 'sum',
      field: '$.value',
    };

    // Generate unique key for the aggregation
    const existingKeys = Object.keys(operation.aggregations);
    const newKey = `result${existingKeys.length + 1}`;

    updateOperation(operationIndex, {
      aggregations: { ...operation.aggregations, [newKey]: newAggregation },
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
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900">Aggregate</h3>
        <p className="text-sm text-gray-600">
          Apply aggregation functions (sum, avg, min, max, count)
        </p>
      </div>

      {/* Available Fields - Quick Select */}
      {availableFields.length > 0 && (
        <div className="bg-blue-50 rounded-lg p-3">
          <p className="text-xs font-medium text-blue-800 mb-2">
            Available fields ({availableFields.length}):
          </p>
          <div className="flex flex-wrap gap-1">
            {availableFields.map((field) => (
              <button
                key={field}
                onClick={() => {
                  // If there's an active aggregation being edited, update its field
                  if (activeAggKey && operation) {
                    handleUpdateAggregation(activeAggKey, { field });
                  }
                }}
                className={`px-2 py-1 text-xs font-mono rounded transition-colors ${
                  activeAggKey
                    ? 'bg-white text-blue-700 hover:bg-blue-100 border border-blue-200'
                    : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                }`}
                disabled={!activeAggKey}
                title={activeAggKey ? `Set field for ${activeAggKey}` : 'Click an aggregation field first'}
              >
                {field.replace('$.', '')}
              </button>
            ))}
          </div>
          {!activeAggKey && (
            <p className="text-xs text-blue-600 mt-1">Click a field input below to enable quick selection</p>
          )}
        </div>
      )}

      {/* Aggregations List */}
      <div className="space-y-3">
        {Object.entries(operation.aggregations).map(([key, aggregation]) => (
          <div key={key} className="flex gap-2 items-start p-3 border border-gray-200 rounded-lg">
            <div className="flex-1 space-y-2">
              {/* Result Field Name */}
              <div>
                <label
                  htmlFor={`agg-key-${operationIndex}-${key}`}
                  className="block text-xs font-medium text-gray-700 mb-1"
                >
                  Result Field Name
                </label>
                <input
                  type="text"
                  id={`agg-key-${operationIndex}-${key}`}
                  value={key}
                  disabled
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md bg-gray-50 text-gray-600 font-mono"
                  aria-label="Result field name"
                />
              </div>

              {/* Function Selector */}
              <div>
                <label
                  htmlFor={`agg-function-${operationIndex}-${key}`}
                  className="block text-xs font-medium text-gray-700 mb-1"
                >
                  Function
                </label>
                <select
                  id={`agg-function-${operationIndex}-${key}`}
                  value={aggregation.function}
                  onChange={(e) =>
                    handleUpdateAggregation(key, {
                      function: e.target.value as Aggregation['function'],
                    })
                  }
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  aria-label="Function"
                >
                  <option value="sum">Sum</option>
                  <option value="avg">Average</option>
                  <option value="min">Min</option>
                  <option value="max">Max</option>
                  <option value="count">Count</option>
                </select>
              </div>

              {/* Field Input */}
              <div>
                <label
                  htmlFor={`agg-field-${operationIndex}-${key}`}
                  className="block text-xs font-medium text-gray-700 mb-1"
                >
                  Field (JSONPath)
                </label>
                <input
                  type="text"
                  id={`agg-field-${operationIndex}-${key}`}
                  value={aggregation.field}
                  onChange={(e) => handleUpdateAggregation(key, { field: e.target.value })}
                  onFocus={() => setActiveAggKey(key)}
                  onBlur={() => setActiveAggKey(null)}
                  placeholder="$.fieldName"
                  className={`w-full px-2 py-1 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-gray-900 ${
                    activeAggKey === key ? 'border-blue-400 bg-blue-50' : 'border-gray-300'
                  }`}
                  aria-label="Field (JSONPath)"
                />
              </div>
            </div>

            {/* Remove Button */}
            <button
              onClick={() => handleRemoveAggregation(key)}
              className="p-1 text-red-600 hover:bg-red-50 rounded"
              aria-label="Remove aggregation"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      {/* Add Button */}
      <button
        onClick={handleAddAggregation}
        className="flex items-center gap-2 px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg"
        aria-label="Add aggregation"
      >
        <Plus className="w-4 h-4" />
        Add Aggregation
      </button>

      {/* Preview */}
      <div className="bg-gray-50 rounded-lg p-3 text-sm">
        <p className="text-gray-700">
          Will apply <strong>{Object.keys(operation.aggregations).length}</strong> aggregation
          {Object.keys(operation.aggregations).length !== 1 ? 's' : ''}
        </p>
      </div>
    </div>
  );
}
