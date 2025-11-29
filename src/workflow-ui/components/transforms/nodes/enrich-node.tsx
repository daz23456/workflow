/**
 * Enrich Node Component
 */

'use client';

import { useCallback } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { useTransformBuilderStore } from '@/lib/stores/transform-builder-store';
import type { EnrichOperation } from '@/lib/types/transform-dsl';

interface EnrichNodeProps {
  operationIndex: number;
}

export function EnrichNode({ operationIndex }: EnrichNodeProps) {
  const { pipeline, updateOperation } = useTransformBuilderStore();
  const operation = pipeline[operationIndex] as EnrichOperation | undefined;

  const handleAddField = useCallback(() => {
    if (!operation) return;
    const newFieldName = `field${Object.keys(operation.fields).length + 1}`;
    updateOperation(operationIndex, {
      fields: {
        ...operation.fields,
        [newFieldName]: '$.value',
      },
    });
  }, [operation, operationIndex, updateOperation]);

  const handleRemoveField = useCallback(
    (fieldName: string) => {
      if (!operation) return;
      const { [fieldName]: _, ...rest } = operation.fields;
      updateOperation(operationIndex, { fields: rest });
    },
    [operation, operationIndex, updateOperation]
  );

  const handleUpdateFieldPath = useCallback(
    (fieldName: string, path: string) => {
      if (!operation) return;
      updateOperation(operationIndex, {
        fields: { ...operation.fields, [fieldName]: path },
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
        <h3 className="text-lg font-semibold text-gray-900">Enrich</h3>
        <p className="text-sm text-gray-600">Add computed fields to records</p>
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">Fields to Add</label>
        {Object.entries(operation.fields).map(([name, path]) => (
          <div key={name} className="flex gap-2 p-2 border rounded">
            <span className="px-2 py-1 bg-gray-100 rounded text-sm">{name}</span>
            <input
              type="text"
              value={path}
              onChange={(e) => handleUpdateFieldPath(name, e.target.value)}
              className="flex-1 px-2 py-1 border rounded font-mono text-sm"
              placeholder="$.field"
            />
            <button onClick={() => handleRemoveField(name)} className="p-1 text-red-600">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
        <button
          onClick={handleAddField}
          className="flex items-center gap-2 px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded"
          aria-label="Add field"
        >
          <Plus className="w-4 h-4" />
          Add Field
        </button>
      </div>
    </div>
  );
}
