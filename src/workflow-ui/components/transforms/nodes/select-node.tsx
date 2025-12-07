/**
 * Select Node Component
 *
 * Visual editor for select operation (field projection).
 */

'use client';

import { useCallback, useMemo, useState, useEffect } from 'react';
import { Trash2, Plus } from 'lucide-react';
import { useTransformBuilderStore } from '@/lib/stores/transform-builder-store';
import type { SelectOperation } from '@/lib/types/transform-dsl';

interface SelectNodeProps {
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

    // For nested objects, add nested paths too (one level deep)
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      for (const nestedKey of Object.keys(value)) {
        paths.push(`${path}.${nestedKey}`);
      }
    }
  }
  return paths;
}

/**
 * Editable field name input that defers updates until blur
 */
function FieldNameInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (newValue: string) => void;
}) {
  const [localValue, setLocalValue] = useState(value);

  // Sync with external value when it changes (e.g., from undo/redo)
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleBlur = () => {
    if (localValue !== value && localValue.trim()) {
      onChange(localValue);
    }
  };

  return (
    <input
      type="text"
      value={localValue}
      onChange={(e) => setLocalValue(e.target.value)}
      onBlur={handleBlur}
      placeholder="fieldName"
      className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
    />
  );
}

export function SelectNode({ operationIndex }: SelectNodeProps) {
  const { pipeline, updateOperation, inputData } = useTransformBuilderStore();

  const operation = pipeline[operationIndex] as SelectOperation | undefined;

  // Extract available fields from input data
  const availableFields = useMemo(() => {
    if (inputData.length === 0) return [];
    return extractFieldPaths(inputData[0]);
  }, [inputData]);

  // Get the first record for display
  const sampleRecord = useMemo(() => {
    if (inputData.length === 0) return null;
    return inputData[0] as Record<string, unknown>;
  }, [inputData]);

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

  // Quick add a field from available fields
  const handleQuickAddField = useCallback(
    (fieldPath: string) => {
      if (!operation) return;

      // Extract field name from path (e.g., "$.name" -> "name")
      const fieldName = fieldPath.replace(/^\$\./, '').replace(/\./g, '_');

      // Don't add if already exists
      if (operation.fields[fieldName]) return;

      updateOperation(operationIndex, {
        fields: {
          ...operation.fields,
          [fieldName]: fieldPath,
        },
      });
    },
    [operation, operationIndex, updateOperation]
  );

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

  // Check which fields are already added
  const addedPaths = useMemo(() => {
    if (!operation) return new Set<string>();
    return new Set(Object.values(operation.fields));
  }, [operation]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900">Select</h3>
        <p className="text-sm text-gray-600">Select and rename fields from input data</p>
      </div>

      {/* Available Fields - Quick Add */}
      <div className="bg-blue-50 rounded-lg p-3">
        <p className="text-xs font-medium text-blue-800 mb-2">
          Available fields ({availableFields.length}):
        </p>
        {availableFields.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {availableFields.map((field) => {
              const isAdded = addedPaths.has(field);
              return (
                <button
                  key={field}
                  onClick={() => handleQuickAddField(field)}
                  disabled={isAdded}
                  className={`px-2 py-1 text-xs font-mono rounded transition-colors ${
                    isAdded
                      ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      : 'bg-white text-blue-700 hover:bg-blue-100 border border-blue-200'
                  }`}
                >
                  {field.replace('$.', '')}
                </button>
              );
            })}
          </div>
        ) : (
          <p className="text-xs text-blue-600">No input data loaded. Upload a JSON file first.</p>
        )}
      </div>

      {/* Sample Record Preview */}
      {sampleRecord && (
        <details className="bg-gray-50 rounded-lg p-3">
          <summary className="text-xs font-medium text-gray-600 cursor-pointer">
            Sample record (first item)
          </summary>
          <pre className="mt-2 text-xs text-gray-700 overflow-auto max-h-32">
            {JSON.stringify(sampleRecord, null, 2)}
          </pre>
        </details>
      )}

      {/* Fields List */}
      <div className="space-y-3">
        {fieldEntries.map(([fieldName, jsonPath], index) => (
          <div
            key={index}
            className="p-3 border border-gray-200 rounded-lg"
          >
            <div className="grid grid-cols-2 gap-2">
              {/* Field Name */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Output Name</label>
                <FieldNameInput
                  value={fieldName}
                  onChange={(newName) => handleUpdateFieldName(fieldName, newName)}
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
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-gray-900"
                />
              </div>
            </div>
            <div className="mt-2 flex justify-end">
              <button
                onClick={() => handleRemoveField(fieldName)}
                className="p-1 text-red-600 hover:bg-red-50 rounded"
                aria-label="Remove field"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
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
