/**
 * FlatMap Node Component
 */

'use client';

import { useCallback } from 'react';
import { useTransformBuilderStore } from '@/lib/stores/transform-builder-store';
import type { FlatMapOperation } from '@/lib/types/transform-dsl';

interface FlatMapNodeProps {
  operationIndex: number;
}

export function FlatMapNode({ operationIndex }: FlatMapNodeProps) {
  const { pipeline, updateOperation } = useTransformBuilderStore();
  const operation = pipeline[operationIndex] as FlatMapOperation | undefined;

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
          className="w-full px-3 py-2 border border-gray-300 rounded-md font-mono"
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
