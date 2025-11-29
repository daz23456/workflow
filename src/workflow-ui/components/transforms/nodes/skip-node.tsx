/**
 * Skip Node Component
 *
 * Visual editor for skip operation (skips first N records).
 */

'use client';

import { useCallback } from 'react';
import { useTransformBuilderStore } from '@/lib/stores/transform-builder-store';
import type { SkipOperation } from '@/lib/types/transform-dsl';

interface SkipNodeProps {
  operationIndex: number;
}

export function SkipNode({ operationIndex }: SkipNodeProps) {
  const { pipeline, updateOperation } = useTransformBuilderStore();

  const operation = pipeline[operationIndex] as SkipOperation | undefined;

  const handleCountChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = parseInt(e.target.value, 10);

      if (isNaN(value) || value < 0) {
        return;
      }

      updateOperation(operationIndex, { count: value });
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
        <h3 className="text-lg font-semibold text-gray-900">Skip</h3>
        <p className="text-sm text-gray-600">Skip the first N records (useful for pagination)</p>
      </div>

      {/* Count Input */}
      <div>
        <label
          htmlFor={`skip-count-${operationIndex}`}
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Skip Count
        </label>
        <input
          type="number"
          id={`skip-count-${operationIndex}`}
          value={operation.count}
          onChange={handleCountChange}
          min={0}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label="Skip count"
        />
      </div>

      {/* Preview */}
      <div className="bg-gray-50 rounded-lg p-3 text-sm">
        <p className="text-gray-700">
          {operation.count === 0 ? (
            <span>Will not skip any records</span>
          ) : (
            <span>
              Will skip the first <strong>{operation.count}</strong> records
            </span>
          )}
        </p>
      </div>
    </div>
  );
}
