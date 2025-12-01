/**
 * InputSchemaPanel - Side panel for editing workflow input parameters
 *
 * Allows users to define the input schema for their workflow:
 * - Add/remove parameters
 * - Set parameter types (string, number, boolean, etc.)
 * - Define validation constraints (required, min, max, pattern, etc.)
 * - Set default values
 */

'use client';

import { useState } from 'react';
import { X, Plus, Trash2, ChevronDown, ChevronRight } from 'lucide-react';
import { useWorkflowBuilderStore } from '@/lib/stores/workflow-builder-store';
import type { WorkflowInputParameter } from '@/lib/types/workflow-builder';

const PARAMETER_TYPES = [
  { value: 'string', label: 'String' },
  { value: 'integer', label: 'Integer' },
  { value: 'number', label: 'Number' },
  { value: 'boolean', label: 'Boolean' },
  { value: 'array', label: 'Array' },
  { value: 'object', label: 'Object' },
] as const;

interface ParameterEditorProps {
  name: string;
  parameter: WorkflowInputParameter;
  onUpdate: (name: string, parameter: WorkflowInputParameter) => void;
  onDelete: (name: string) => void;
  onRename: (oldName: string, newName: string) => void;
}

function ParameterEditor({ name, parameter, onUpdate, onDelete, onRename }: ParameterEditorProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [editingName, setEditingName] = useState(false);
  const [tempName, setTempName] = useState(name);

  const handleNameBlur = () => {
    setEditingName(false);
    if (tempName && tempName !== name) {
      onRename(name, tempName);
    } else {
      setTempName(name);
    }
  };

  const updateField = <K extends keyof WorkflowInputParameter>(
    field: K,
    value: WorkflowInputParameter[K]
  ) => {
    onUpdate(name, { ...parameter, [field]: value });
  };

  return (
    <div className="border border-gray-200 rounded-lg mb-3 overflow-hidden">
      <div className="flex items-center gap-2 p-3 bg-gray-50">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-1 hover:bg-gray-200 rounded"
          aria-label={isExpanded ? 'Collapse parameter' : 'Expand parameter'}
        >
          {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>

        {editingName ? (
          <input
            type="text"
            value={tempName}
            onChange={(e) => setTempName(e.target.value)}
            onBlur={handleNameBlur}
            onKeyDown={(e) => e.key === 'Enter' && handleNameBlur()}
            className="flex-1 px-2 py-1 text-sm font-medium border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            autoFocus
          />
        ) : (
          <button
            onClick={() => setEditingName(true)}
            className="flex-1 text-left font-medium text-sm text-gray-900 hover:text-blue-600"
          >
            {name}
          </button>
        )}

        <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">
          {parameter.type}
        </span>

        {parameter.required && (
          <span className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded">required</span>
        )}

        <button
          onClick={() => onDelete(name)}
          className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
          aria-label={`Delete parameter ${name}`}
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {isExpanded && (
        <div className="p-3 space-y-3">
          {/* Type */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Type</label>
            <select
              value={parameter.type}
              onChange={(e) => updateField('type', e.target.value)}
              className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {PARAMETER_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
            <input
              type="text"
              value={parameter.description || ''}
              onChange={(e) => updateField('description', e.target.value)}
              placeholder="Parameter description"
              className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Required */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id={`${name}-required`}
              checked={parameter.required || false}
              onChange={(e) => updateField('required', e.target.checked)}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label htmlFor={`${name}-required`} className="text-sm text-gray-700">
              Required parameter
            </label>
          </div>

          {/* Default value */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Default Value</label>
            <input
              type="text"
              value={parameter.default !== undefined ? String(parameter.default) : ''}
              onChange={(e) => {
                const val = e.target.value;
                if (val === '') {
                  updateField('default', undefined);
                } else if (parameter.type === 'integer' || parameter.type === 'number') {
                  updateField('default', Number(val));
                } else if (parameter.type === 'boolean') {
                  updateField('default', val === 'true');
                } else {
                  updateField('default', val);
                }
              }}
              placeholder="Default value (optional)"
              className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Type-specific constraints */}
          {(parameter.type === 'string') && (
            <>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Min Length</label>
                  <input
                    type="number"
                    value={parameter.minLength ?? ''}
                    onChange={(e) =>
                      updateField('minLength', e.target.value ? Number(e.target.value) : undefined)
                    }
                    className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Max Length</label>
                  <input
                    type="number"
                    value={parameter.maxLength ?? ''}
                    onChange={(e) =>
                      updateField('maxLength', e.target.value ? Number(e.target.value) : undefined)
                    }
                    className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Pattern (Regex)</label>
                <input
                  type="text"
                  value={parameter.pattern || ''}
                  onChange={(e) => updateField('pattern', e.target.value || undefined)}
                  placeholder="^[a-z]+$"
                  className="w-full px-2 py-1.5 text-sm font-mono border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </>
          )}

          {(parameter.type === 'integer' || parameter.type === 'number') && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Minimum</label>
                <input
                  type="number"
                  value={parameter.minimum ?? ''}
                  onChange={(e) =>
                    updateField('minimum', e.target.value ? Number(e.target.value) : undefined)
                  }
                  className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Maximum</label>
                <input
                  type="number"
                  value={parameter.maximum ?? ''}
                  onChange={(e) =>
                    updateField('maximum', e.target.value ? Number(e.target.value) : undefined)
                  }
                  className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function InputSchemaPanel() {
  const inputSchema = useWorkflowBuilderStore((state) => state.inputSchema);
  const closePanel = useWorkflowBuilderStore((state) => state.closePanel);

  // Use store getter to avoid stale closures
  const handleAddParameter = () => {
    const currentSchema = useWorkflowBuilderStore.getState().inputSchema;
    const setInputSchema = useWorkflowBuilderStore.getState().setInputSchema;

    // Generate unique name
    let baseName = 'newParam';
    let counter = 1;
    let name = baseName;
    while (currentSchema[name]) {
      name = `${baseName}${counter}`;
      counter++;
    }

    const newParam: WorkflowInputParameter = {
      type: 'string',
      required: false,
    };

    setInputSchema({ ...currentSchema, [name]: newParam });
  };

  const handleUpdateParameter = (name: string, parameter: WorkflowInputParameter) => {
    const currentSchema = useWorkflowBuilderStore.getState().inputSchema;
    const setInputSchema = useWorkflowBuilderStore.getState().setInputSchema;
    setInputSchema({ ...currentSchema, [name]: parameter });
  };

  const handleDeleteParameter = (name: string) => {
    const currentSchema = useWorkflowBuilderStore.getState().inputSchema;
    const setInputSchema = useWorkflowBuilderStore.getState().setInputSchema;
    const { [name]: _, ...rest } = currentSchema;
    setInputSchema(rest);
  };

  const handleRenameParameter = (oldName: string, newName: string) => {
    const currentSchema = useWorkflowBuilderStore.getState().inputSchema;
    const setInputSchema = useWorkflowBuilderStore.getState().setInputSchema;
    if (oldName === newName || currentSchema[newName]) return;

    const { [oldName]: param, ...rest } = currentSchema;
    setInputSchema({ ...rest, [newName]: param });
  };

  const parameterEntries = Object.entries(inputSchema);

  return (
    <div className="w-full h-full flex flex-col bg-white border-l border-gray-200 overflow-hidden">
      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {parameterEntries.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-gray-400 mb-2">
              <Plus className="w-12 h-12 mx-auto opacity-50" />
            </div>
            <p className="text-sm text-gray-500 mb-4">No input parameters defined yet</p>
            <button
              onClick={handleAddParameter}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Parameter
            </button>
          </div>
        ) : (
          <div>
            {parameterEntries.map(([name, param]) => (
              <ParameterEditor
                key={name}
                name={name}
                parameter={param}
                onUpdate={handleUpdateParameter}
                onDelete={handleDeleteParameter}
                onRename={handleRenameParameter}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      {parameterEntries.length > 0 && (
        <div className="p-4 border-t border-gray-200">
          <button
            onClick={handleAddParameter}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-green-700 bg-green-50 hover:bg-green-100 border border-green-200 rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Parameter
          </button>
        </div>
      )}
    </div>
  );
}
