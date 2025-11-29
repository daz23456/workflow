/**
 * Join Node Component
 */

'use client';

import { useCallback } from 'react';
import { useTransformBuilderStore } from '@/lib/stores/transform-builder-store';
import type { JoinOperation } from '@/lib/types/transform-dsl';

interface JoinNodeProps {
  operationIndex: number;
}

export function JoinNode({ operationIndex }: JoinNodeProps) {
  const { pipeline, updateOperation } = useTransformBuilderStore();
  const operation = pipeline[operationIndex] as JoinOperation | undefined;

  const handleJoinTypeChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      updateOperation(operationIndex, {
        joinType: e.target.value as 'inner' | 'left' | 'right' | 'outer',
      });
    },
    [operationIndex, updateOperation]
  );

  const handleLeftKeyChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      updateOperation(operationIndex, { leftKey: e.target.value });
    },
    [operationIndex, updateOperation]
  );

  const handleRightKeyChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      updateOperation(operationIndex, { rightKey: e.target.value });
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
        <h3 className="text-lg font-semibold text-gray-900">Join</h3>
        <p className="text-sm text-gray-600">Join with another dataset</p>
      </div>

      <div>
        <label
          htmlFor={`join-type-${operationIndex}`}
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Join Type
        </label>
        <select
          id={`join-type-${operationIndex}`}
          value={operation.joinType}
          onChange={handleJoinTypeChange}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
          aria-label="Join type"
        >
          <option value="inner">Inner Join</option>
          <option value="left">Left Join</option>
          <option value="right">Right Join</option>
          <option value="outer">Outer Join</option>
        </select>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label
            htmlFor={`join-left-${operationIndex}`}
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Left Key
          </label>
          <input
            id={`join-left-${operationIndex}`}
            type="text"
            value={operation.leftKey}
            onChange={handleLeftKeyChange}
            className="w-full px-2 py-1 border border-gray-300 rounded-md font-mono text-sm"
            placeholder="$.id"
            aria-label="Left key"
          />
        </div>

        <div>
          <label
            htmlFor={`join-right-${operationIndex}`}
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Right Key
          </label>
          <input
            id={`join-right-${operationIndex}`}
            type="text"
            value={operation.rightKey}
            onChange={handleRightKeyChange}
            className="w-full px-2 py-1 border border-gray-300 rounded-md font-mono text-sm"
            placeholder="$.userId"
            aria-label="Right key"
          />
        </div>
      </div>
    </div>
  );
}
