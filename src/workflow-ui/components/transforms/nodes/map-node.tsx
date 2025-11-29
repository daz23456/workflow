/**
 * Map Node Component
 */

'use client';

import { useCallback } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { useTransformBuilderStore } from '@/lib/stores/transform-builder-store';
import type { MapOperation } from '@/lib/types/transform-dsl';

interface MapNodeProps {
  operationIndex: number;
}

export function MapNode({ operationIndex }: MapNodeProps) {
  const { pipeline, updateOperation } = useTransformBuilderStore();
  const operation = pipeline[operationIndex] as MapOperation | undefined;

  const handleAddMapping = useCallback(() => {
    if (!operation) return;

    const existingKeys = Object.keys(operation.mappings);
    const newKey = `field${existingKeys.length + 1}`;

    updateOperation(operationIndex, {
      mappings: { ...operation.mappings, [newKey]: '$.value' },
    });
  }, [operation, operationIndex, updateOperation]);

  const handleRemoveMapping = useCallback(
    (key: string) => {
      if (!operation) return;
      const newMappings = { ...operation.mappings };
      delete newMappings[key];
      updateOperation(operationIndex, { mappings: newMappings });
    },
    [operation, operationIndex, updateOperation]
  );

  const handleUpdateMappingPath = useCallback(
    (key: string, path: string) => {
      if (!operation) return;
      updateOperation(operationIndex, {
        mappings: { ...operation.mappings, [key]: path },
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
        <h3 className="text-lg font-semibold text-gray-900">Map</h3>
        <p className="text-sm text-gray-600">Remap fields to new names</p>
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">Field Mappings</label>
        {Object.entries(operation.mappings).map(([fieldName, path]) => (
          <div key={fieldName} className="flex gap-2 items-center p-2 border rounded">
            <span className="px-2 py-1 bg-gray-100 rounded text-sm font-medium">{fieldName}</span>
            <span className="text-gray-500">←</span>
            <input
              type="text"
              value={path}
              onChange={(e) => handleUpdateMappingPath(fieldName, e.target.value)}
              className="flex-1 px-2 py-1 border rounded font-mono text-sm"
              placeholder="$.originalField"
            />
            <button
              onClick={() => handleRemoveMapping(fieldName)}
              className="p-1 text-red-600 hover:bg-red-50 rounded"
              aria-label="Remove mapping"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
        <button
          onClick={handleAddMapping}
          className="flex items-center gap-2 px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded"
          aria-label="Add mapping"
        >
          <Plus className="w-4 h-4" />
          Add Mapping
        </button>
      </div>

      <div className="bg-gray-50 rounded-lg p-3 text-sm">
        <p className="text-gray-700">
          Will create <strong>{Object.keys(operation.mappings).length}</strong> new field
          {Object.keys(operation.mappings).length !== 1 ? 's' : ''}
        </p>
      </div>
    </div>
  );
}
