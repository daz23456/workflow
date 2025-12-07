/**
 * Enrich Node Component
 */

'use client';

import { useCallback, useMemo, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { useTransformBuilderStore } from '@/lib/stores/transform-builder-store';
import type { EnrichOperation } from '@/lib/types/transform-dsl';

interface EnrichNodeProps {
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

export function EnrichNode({ operationIndex }: EnrichNodeProps) {
  const { pipeline, updateOperation, inputData } = useTransformBuilderStore();
  const operation = pipeline[operationIndex] as EnrichOperation | undefined;

  // Extract available fields from input data
  const availableFields = useMemo(() => {
    if (inputData.length === 0) return [];
    return extractFieldPaths(inputData[0]);
  }, [inputData]);

  // Track which field is being edited for quick-select
  const [activeFieldName, setActiveFieldName] = useState<string | null>(null);

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

      {/* Available Fields - Quick Select */}
      {availableFields.length > 0 && (
        <div className="bg-blue-50 rounded-lg p-3">
          <p className="text-xs font-medium text-blue-800 mb-2">
            Available fields ({availableFields.length}):
          </p>
          <div className="flex flex-wrap gap-1">
            {availableFields.map((field) => (
              <button
                key={field}
                onClick={() => {
                  if (activeFieldName && operation) {
                    handleUpdateFieldPath(activeFieldName, field);
                  }
                }}
                className={`px-2 py-1 text-xs font-mono rounded transition-colors ${
                  activeFieldName
                    ? 'bg-white text-blue-700 hover:bg-blue-100 border border-blue-200'
                    : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                }`}
                disabled={!activeFieldName}
                title={activeFieldName ? `Set path for ${activeFieldName}` : 'Click a path input first'}
              >
                {field.replace('$.', '')}
              </button>
            ))}
          </div>
          {!activeFieldName && (
            <p className="text-xs text-blue-600 mt-1">Click a path input below to enable quick selection</p>
          )}
        </div>
      )}

      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">Fields to Add</label>
        {Object.entries(operation.fields).map(([name, path]) => (
          <div key={name} className="flex gap-2 p-2 border rounded">
            <span className="px-2 py-1 bg-gray-100 rounded text-sm">{name}</span>
            <input
              type="text"
              value={path}
              onChange={(e) => handleUpdateFieldPath(name, e.target.value)}
              onFocus={() => setActiveFieldName(name)}
              onBlur={() => setActiveFieldName(null)}
              className={`flex-1 px-2 py-1 border rounded font-mono text-sm text-gray-900 ${
                activeFieldName === name ? 'border-blue-400 bg-blue-50' : ''
              }`}
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
