/**
 * FlatMap Node Component
 */

'use client';

import { useCallback, useMemo } from 'react';
import { useTransformBuilderStore } from '@/lib/stores/transform-builder-store';
import type { FlatMapOperation } from '@/lib/types/transform-dsl';

interface FlatMapNodeProps {
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

export function FlatMapNode({ operationIndex }: FlatMapNodeProps) {
  const { pipeline, updateOperation, inputData } = useTransformBuilderStore();
  const operation = pipeline[operationIndex] as FlatMapOperation | undefined;

  // Extract available fields from input data
  const availableFields = useMemo(() => {
    if (inputData.length === 0) return [];
    return extractFieldPaths(inputData[0]);
  }, [inputData]);

  // Quick select a field for the array path
  const handleQuickSelectPath = useCallback(
    (fieldPath: string) => {
      updateOperation(operationIndex, { path: fieldPath });
    },
    [operationIndex, updateOperation]
  );

  const handlePathChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      updateOperation(operationIndex, { path: e.target.value });
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
      <div>
        <h3 className="text-lg font-semibold text-gray-900">FlatMap</h3>
        <p className="text-sm text-gray-600">Flatten arrays into individual records</p>
      </div>

      {/* Available Fields - Quick Select */}
      {availableFields.length > 0 && (
        <div className="bg-blue-50 rounded-lg p-3">
          <p className="text-xs font-medium text-blue-800 mb-2">
            Available fields ({availableFields.length}):
          </p>
          <div className="flex flex-wrap gap-1">
            {availableFields.map((field) => {
              const isSelected = operation.path === field;
              return (
                <button
                  key={field}
                  onClick={() => handleQuickSelectPath(field)}
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
          htmlFor={`flatmap-path-${operationIndex}`}
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Array Path (JSONPath)
        </label>
        <input
          id={`flatmap-path-${operationIndex}`}
          type="text"
          value={operation.path}
          onChange={handlePathChange}
          className="w-full px-3 py-2 border border-gray-300 rounded-md font-mono text-gray-900"
          placeholder="$.items"
        />
      </div>

      <div className="bg-gray-50 rounded-lg p-3 text-sm">
        <p className="text-gray-700">
          Each element in the array at <code className="bg-white px-1">{operation.path}</code> will
          become a separate record
        </p>
      </div>
    </div>
  );
}
