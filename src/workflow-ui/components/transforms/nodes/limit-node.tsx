/**
 * Limit Node Component
 *
 * Visual editor for limit operation (restricts record count).
 */

'use client';

import { useCallback, useState } from 'react';
import { useTransformBuilderStore } from '@/lib/stores/transform-builder-store';
import type { LimitOperation } from '@/lib/types/transform-dsl';

interface LimitNodeProps {
  operationIndex: number;
}

export function LimitNode({ operationIndex }: LimitNodeProps) {
  const { pipeline, updateOperation } = useTransformBuilderStore();
  const [validationError, setValidationError] = useState<string>('');

  const operation = pipeline[operationIndex] as LimitOperation | undefined;

  const handleCountChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = parseInt(e.target.value, 10);

      if (isNaN(value) || value <= 0) {
        setValidationError('Count must be greater than 0');
        return;
      }

      setValidationError('');
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
        <h3 className="text-lg font-semibold text-gray-900">Limit</h3>
        <p className="text-sm text-gray-600">Limit the number of records returned</p>
      </div>

      {/* Count Input */}
      <div>
        <label
          htmlFor={`limit-count-${operationIndex}`}
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Limit Count
        </label>
        <input
          type="number"
          id={`limit-count-${operationIndex}`}
          value={operation.count}
          onChange={handleCountChange}
          min={1}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label="Limit count"
        />
        {validationError && <p className="mt-1 text-sm text-red-600">{validationError}</p>}
      </div>

      {/* Preview */}
      <div className="bg-gray-50 rounded-lg p-3 text-sm">
        <p className="text-gray-700">
          Will return the first <strong>{operation.count}</strong> records
        </p>
      </div>
    </div>
  );
}
