/**
 * Select Node Component
 *
 * Visual editor for select operation (field projection).
 */

'use client';

import { useCallback } from 'react';
import { Trash2, Plus } from 'lucide-react';
import { useTransformBuilderStore } from '@/lib/stores/transform-builder-store';
import type { SelectOperation } from '@/lib/types/transform-dsl';

interface SelectNodeProps {
  operationIndex: number;
}

export function SelectNode({ operationIndex }: SelectNodeProps) {
  const { pipeline, updateOperation } = useTransformBuilderStore();

  const operation = pipeline[operationIndex] as SelectOperation | undefined;

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

      const { [fieldName]: _, ...remainingFields } = operation.fields;
      updateOperation(operationIndex, { fields: remainingFields });
    },
    [operation, operationIndex, updateOperation]
  );

  const handleUpdateFieldName = useCallback(
    (oldName: string, newName: string) => {
      if (!operation || newName === oldName) return;

      const { [oldName]: value, ...rest } = operation.fields;
      updateOperation(operationIndex, {
        fields: {
          ...rest,
          [newName]: value,
        },
      });
    },
    [operation, operationIndex, updateOperation]
  );

  const handleUpdateFieldPath = useCallback(
    (fieldName: string, path: string) => {
      if (!operation) return;

      updateOperation(operationIndex, {
        fields: {
          ...operation.fields,
          [fieldName]: path,
        },
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

  const fieldEntries = Object.entries(operation.fields);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900">Select</h3>
        <p className="text-sm text-gray-600">Select and rename fields from input data</p>
      </div>

      {/* Fields List */}
      <div className="space-y-3">
        {fieldEntries.map(([fieldName, jsonPath]) => (
          <div
            key={fieldName}
            className="flex gap-2 items-start p-3 border border-gray-200 rounded-lg"
          >
            <div className="flex-1 grid grid-cols-2 gap-2">
              {/* Field Name */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Output Name</label>
                <input
                  type="text"
                  value={fieldName}
                  onChange={(e) => handleUpdateFieldName(fieldName, e.target.value)}
                  placeholder="fieldName"
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* JSONPath */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Source (JSONPath)
                </label>
                <input
                  type="text"
                  value={jsonPath}
                  onChange={(e) => handleUpdateFieldPath(fieldName, e.target.value)}
                  placeholder="$.fieldName"
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                />
              </div>
            </div>

            {/* Remove Button */}
            <button
              onClick={() => handleRemoveField(fieldName)}
              className="p-1 text-red-600 hover:bg-red-50 rounded"
              aria-label="Remove field"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      {/* Add Button */}
      <button
        onClick={handleAddField}
        className="flex items-center gap-2 px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg"
        aria-label="Add field"
      >
        <Plus className="w-4 h-4" />
        Add Field
      </button>

      {/* Preview */}
      <div className="bg-gray-50 rounded-lg p-3 text-sm">
        <p className="text-gray-700">
          Will select <strong>{fieldEntries.length}</strong> field
          {fieldEntries.length !== 1 ? 's' : ''} from each record
        </p>
      </div>
    </div>
  );
}
