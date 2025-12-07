/**
 * Map Node Component
 */

'use client';

import { useCallback, useMemo, useState, useEffect } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { useTransformBuilderStore } from '@/lib/stores/transform-builder-store';
import type { MapOperation } from '@/lib/types/transform-dsl';

interface MapNodeProps {
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
      className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
      placeholder="newFieldName"
    />
  );
}

export function MapNode({ operationIndex }: MapNodeProps) {
  const { pipeline, updateOperation, inputData } = useTransformBuilderStore();
  const operation = pipeline[operationIndex] as MapOperation | undefined;

  // Extract available fields from input data
  const availableFields = useMemo(() => {
    if (inputData.length === 0) return [];
    return extractFieldPaths(inputData[0]);
  }, [inputData]);

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

  const handleUpdateMappingKey = useCallback(
    (oldKey: string, newKey: string) => {
      if (!operation || oldKey === newKey || !newKey.trim()) return;

      // Create new mappings with renamed key, preserving order
      const entries = Object.entries(operation.mappings);
      const newMappings: Record<string, string> = {};
      for (const [key, val] of entries) {
        if (key === oldKey) {
          newMappings[newKey] = val;
        } else {
          newMappings[key] = val;
        }
      }
      updateOperation(operationIndex, { mappings: newMappings });
    },
    [operation, operationIndex, updateOperation]
  );

  // Quick add a field as a mapping
  const handleQuickAddField = useCallback(
    (fieldPath: string) => {
      if (!operation) return;

      // Extract field name from path (e.g., "$.name" -> "name")
      const fieldName = fieldPath.replace(/^\$\./, '').replace(/\./g, '_');

      // Don't add if already exists as a source
      if (Object.values(operation.mappings).includes(fieldPath)) return;

      updateOperation(operationIndex, {
        mappings: { ...operation.mappings, [fieldName]: fieldPath },
      });
    },
    [operation, operationIndex, updateOperation]
  );

  // Check which source paths are already mapped
  const mappedPaths = useMemo(() => {
    if (!operation) return new Set<string>();
    return new Set(Object.values(operation.mappings));
  }, [operation]);

  if (!operation) {
    return (
      <div className="p-4 text-red-600">
        <p>Operation not found</p>
      </div>
    );
  }

  // Convert to array with stable indices
  const mappingEntries = Object.entries(operation.mappings);

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-gray-900">Map</h3>
        <p className="text-sm text-gray-600">Remap fields to new names</p>
      </div>

      {/* Available Fields - Quick Add */}
      <div className="bg-blue-50 rounded-lg p-3">
        <p className="text-xs font-medium text-blue-800 mb-2">
          Available fields ({availableFields.length}):
        </p>
        {availableFields.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {availableFields.map((field) => {
              const isMapped = mappedPaths.has(field);
              return (
                <button
                  key={field}
                  onClick={() => handleQuickAddField(field)}
                  disabled={isMapped}
                  className={`px-2 py-1 text-xs font-mono rounded transition-colors ${
                    isMapped
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

      <div className="space-y-3">
        <label className="block text-sm font-medium text-gray-700">Field Mappings</label>
        {mappingEntries.map(([fieldName, path], index) => (
          <div key={index} className="p-3 border border-gray-200 rounded-lg">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">New Name</label>
                <FieldNameInput
                  value={fieldName}
                  onChange={(newKey) => handleUpdateMappingKey(fieldName, newKey)}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Source (JSONPath)</label>
                <input
                  type="text"
                  value={path}
                  onChange={(e) => handleUpdateMappingPath(fieldName, e.target.value)}
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-gray-900"
                  placeholder="$.originalField"
                />
              </div>
            </div>
            <div className="mt-2 flex justify-end">
              <button
                onClick={() => handleRemoveMapping(fieldName)}
                className="p-1 text-red-600 hover:bg-red-50 rounded"
                aria-label="Remove mapping"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
        <button
          onClick={handleAddMapping}
          className="flex items-center gap-2 px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg"
          aria-label="Add mapping"
        >
          <Plus className="w-4 h-4" />
          Add Mapping
        </button>
      </div>

      <div className="bg-gray-50 rounded-lg p-3 text-sm">
        <p className="text-gray-700">
          Will create <strong>{mappingEntries.length}</strong> new field
          {mappingEntries.length !== 1 ? 's' : ''}
        </p>
      </div>
    </div>
  );
}
