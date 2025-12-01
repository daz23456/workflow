/**
 * OutputMappingPanel - Side panel for editing workflow output mappings
 *
 * Allows users to define what outputs the workflow should return:
 * - Map task outputs to workflow outputs
 * - Use template expressions to reference task outputs
 * - Define output names and their source expressions
 * - Quick inserts driven by actual task output schemas
 */

'use client';

import { useState, useEffect, useMemo } from 'react';
import { X, Plus, Trash2, HelpCircle, Loader2 } from 'lucide-react';
import { useWorkflowBuilderStore } from '@/lib/stores/workflow-builder-store';
import { getTaskDetail } from '@/lib/api/client';
import type { TaskDetailResponse } from '@/lib/api/types';

interface AvailableOutput {
  expression: string;
  label: string;
  propertyName?: string; // The actual property name from the schema (e.g., "joke", "id")
}

interface OutputMappingEditorProps {
  name: string;
  expression: string;
  onUpdate: (name: string, expression: string) => void;
  onDelete: (name: string) => void;
  onRename: (oldName: string, newName: string) => void;
  availableOutputs: AvailableOutput[];
  isLoadingOutputs?: boolean;
}

type OutputMode = 'single' | 'object';

function OutputMappingEditor({
  name,
  expression,
  onUpdate,
  onDelete,
  onRename,
  availableOutputs,
  isLoadingOutputs,
}: OutputMappingEditorProps) {
  const [editingName, setEditingName] = useState(false);
  const [tempName, setTempName] = useState(name);
  const [mode, setMode] = useState<OutputMode>('single');

  // Parse object from expression if it looks like JSON
  const parseObjectExpression = (expr: string): Record<string, string> | null => {
    try {
      const parsed = JSON.parse(expr);
      if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
        return parsed;
      }
    } catch {
      // Not valid JSON
    }
    return null;
  };

  // Build object expression from selected outputs
  const buildObjectExpression = (selectedOutputs: AvailableOutput[]): string => {
    const obj: Record<string, string> = {};
    selectedOutputs.forEach((output) => {
      const key = output.propertyName || 'value';
      obj[key] = output.expression;
    });
    return JSON.stringify(obj, null, 2);
  };

  // Check if an output is selected (works for both modes)
  const isOutputSelected = (output: AvailableOutput): boolean => {
    if (mode === 'object') {
      return expression.includes(output.expression);
    }
    return expression.includes(output.expression);
  };

  // Handle output toggle
  const handleOutputToggle = (output: AvailableOutput) => {
    const isSelected = isOutputSelected(output);

    if (mode === 'single') {
      // Single/list mode - comma separated
      if (isSelected) {
        const newExpr = expression
          .split(',')
          .map((s) => s.trim())
          .filter((s) => s !== output.expression)
          .join(', ');
        onUpdate(name, newExpr);
      } else {
        const newExpr = expression ? `${expression}, ${output.expression}` : output.expression;
        onUpdate(name, newExpr);
      }
    } else {
      // Object mode - build JSON object
      const currentObj = parseObjectExpression(expression) || {};
      const key = output.propertyName || 'value';

      if (isSelected) {
        delete currentObj[key];
      } else {
        currentObj[key] = output.expression;
      }

      if (Object.keys(currentObj).length === 0) {
        onUpdate(name, '');
      } else {
        onUpdate(name, JSON.stringify(currentObj, null, 2));
      }
    }
  };

  const handleNameBlur = () => {
    setEditingName(false);
    if (tempName && tempName !== name) {
      onRename(name, tempName);
    } else {
      setTempName(name);
    }
  };

  return (
    <div className="border border-gray-200 rounded-lg mb-3 p-3">
      {/* Output name */}
      <div className="flex items-center gap-2 mb-3">
        <label className="text-xs font-medium text-gray-600 w-20">Name:</label>
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
            className="flex-1 text-left font-medium text-sm text-gray-900 hover:text-blue-600 px-2 py-1 -ml-2 rounded hover:bg-blue-50"
          >
            {name}
          </button>
        )}
        <button
          onClick={() => onDelete(name)}
          className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
          aria-label={`Delete output ${name}`}
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Expression */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">
          Source Expression
        </label>
        {mode === 'object' || expression.includes('\n') ? (
          <textarea
            value={expression}
            onChange={(e) => onUpdate(name, e.target.value)}
            placeholder={'{\n  "key": "{{tasks.taskName.output.field}}"\n}'}
            rows={Math.max(3, expression.split('\n').length + 1)}
            className="w-full px-2 py-1.5 text-sm font-mono border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
          />
        ) : (
          <input
            type="text"
            value={expression}
            onChange={(e) => onUpdate(name, e.target.value)}
            placeholder="{{tasks.taskName.output.fieldName}}"
            className="w-full px-2 py-1.5 text-sm font-mono border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        )}
      </div>

      {/* Quick insert */}
      <div className="mt-3 pt-3 border-t border-gray-100">
        {/* Mode toggle */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5">
            <button
              onClick={() => setMode('single')}
              className={`text-xs px-2 py-1 rounded transition-colors ${
                mode === 'single'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Single
            </button>
            <button
              onClick={() => setMode('object')}
              className={`text-xs px-2 py-1 rounded transition-colors ${
                mode === 'object'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Object
            </button>
          </div>
          {expression && (
            <button
              onClick={() => onUpdate(name, '')}
              className="text-xs text-gray-400 hover:text-red-500"
            >
              Clear
            </button>
          )}
        </div>

        <p className="text-xs text-gray-400 mb-2">
          {mode === 'single' ? 'Click outputs to add them:' : 'Click to build a JSON object:'}
        </p>

        {isLoadingOutputs ? (
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Loader2 className="w-3 h-3 animate-spin" />
            Loading task outputs...
          </div>
        ) : availableOutputs.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {availableOutputs
              .filter((output) => mode === 'single' || output.propertyName) // In object mode, only show properties
              .map((output) => {
                const isSelected = isOutputSelected(output);
                return (
                  <button
                    key={output.expression}
                    onClick={() => handleOutputToggle(output)}
                    className={`text-xs px-2 py-0.5 rounded border transition-colors ${
                      isSelected
                        ? 'bg-purple-600 text-white border-purple-600'
                        : 'bg-purple-50 text-purple-700 hover:bg-purple-100 border-purple-200'
                    }`}
                    title={isSelected ? `Remove: ${output.expression}` : `Add: ${output.expression}`}
                  >
                    {output.label}
                  </button>
                );
              })}
          </div>
        ) : (
          <p className="text-xs text-gray-400 italic">No task outputs available</p>
        )}
      </div>
    </div>
  );
}

export function OutputMappingPanel() {
  const outputMapping = useWorkflowBuilderStore((state) => state.outputMapping);
  const closePanel = useWorkflowBuilderStore((state) => state.closePanel);
  const nodes = useWorkflowBuilderStore((state) => state.graph.nodes);

  // State for task details (fetched from API)
  const [taskDetailsMap, setTaskDetailsMap] = useState<Record<string, TaskDetailResponse>>({});
  const [loadingTasks, setLoadingTasks] = useState<Set<string>>(new Set());

  // Get task nodes
  const taskNodes = useMemo(
    () => nodes.filter((n) => n.type === 'task' && n.data.taskRef),
    [nodes]
  );

  // Fetch task details when task nodes change
  useEffect(() => {
    const taskRefs = taskNodes.map((n) => n.data.taskRef).filter(Boolean) as string[];
    const newTaskRefs = taskRefs.filter((ref) => !taskDetailsMap[ref] && !loadingTasks.has(ref));

    if (newTaskRefs.length === 0) return;

    // Mark as loading
    setLoadingTasks((prev) => {
      const next = new Set(prev);
      newTaskRefs.forEach((ref) => next.add(ref));
      return next;
    });

    // Fetch all new task details
    Promise.all(
      newTaskRefs.map((taskRef) =>
        getTaskDetail(taskRef)
          .then((details) => ({ taskRef, details, error: null }))
          .catch((err) => ({ taskRef, details: null, error: err }))
      )
    ).then((results) => {
      const newDetails: Record<string, TaskDetailResponse> = {};
      results.forEach(({ taskRef, details }) => {
        if (details) {
          newDetails[taskRef] = details;
        }
      });

      setTaskDetailsMap((prev) => ({ ...prev, ...newDetails }));
      setLoadingTasks((prev) => {
        const next = new Set(prev);
        newTaskRefs.forEach((ref) => next.delete(ref));
        return next;
      });
    });
  }, [taskNodes, taskDetailsMap, loadingTasks]);

  // Generate available output expressions from task nodes using real output schemas
  const availableOutputs = useMemo(() => {
    return taskNodes.flatMap((node) => {
      const taskId = node.id;
      const taskRef = node.data.taskRef;
      const label = node.data.label || taskRef || taskId;
      const taskDetails = taskRef ? taskDetailsMap[taskRef] : null;

      // Always include full output option
      const outputs: AvailableOutput[] = [
        {
          expression: `{{tasks.${taskId}.output}}`,
          label: `${label} (full)`,
          propertyName: undefined,
        },
      ];

      // Add actual output schema properties if available
      if (taskDetails?.outputSchema?.properties) {
        Object.keys(taskDetails.outputSchema.properties).forEach((propName) => {
          outputs.push({
            expression: `{{tasks.${taskId}.output.${propName}}}`,
            label: `${label}.${propName}`,
            propertyName: propName,
          });
        });
      }

      return outputs;
    });
  }, [taskNodes, taskDetailsMap]);

  const isLoadingAnyTask = loadingTasks.size > 0;

  // Use store getter to avoid stale closures
  const handleAddOutput = () => {
    const currentMapping = useWorkflowBuilderStore.getState().outputMapping;
    const setOutputMapping = useWorkflowBuilderStore.getState().setOutputMapping;

    // Generate unique name
    let baseName = 'output';
    let counter = 1;
    let name = baseName;
    while (currentMapping[name]) {
      name = `${baseName}${counter}`;
      counter++;
    }

    setOutputMapping({ ...currentMapping, [name]: '' });
  };

  const handleUpdateOutput = (name: string, expression: string) => {
    const currentMapping = useWorkflowBuilderStore.getState().outputMapping;
    const setOutputMapping = useWorkflowBuilderStore.getState().setOutputMapping;
    setOutputMapping({ ...currentMapping, [name]: expression });
  };

  const handleDeleteOutput = (name: string) => {
    const currentMapping = useWorkflowBuilderStore.getState().outputMapping;
    const setOutputMapping = useWorkflowBuilderStore.getState().setOutputMapping;
    const { [name]: _, ...rest } = currentMapping;
    setOutputMapping(rest);
  };

  const handleRenameOutput = (oldName: string, newName: string) => {
    const currentMapping = useWorkflowBuilderStore.getState().outputMapping;
    const setOutputMapping = useWorkflowBuilderStore.getState().setOutputMapping;
    if (oldName === newName || currentMapping[newName]) return;

    const { [oldName]: expr, ...rest } = currentMapping;
    setOutputMapping({ ...rest, [newName]: expr });
  };

  const outputEntries = Object.entries(outputMapping);

  return (
    <div className="w-full h-full flex flex-col bg-white border-l border-gray-200 overflow-hidden">
      {/* Help section */}
      <div className="mx-4 mt-4 p-3 bg-purple-50 border border-purple-200 rounded-lg">
        <div className="flex items-start gap-2">
          <HelpCircle className="w-4 h-4 text-purple-600 mt-0.5 flex-shrink-0" />
          <div className="text-xs text-purple-700">
            <p className="font-medium mb-1">Template Syntax</p>
            <p>
              Use <code className="bg-purple-100 px-1 rounded">{'{{tasks.<taskId>.output.<field>}}'}</code> to reference task outputs.
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {outputEntries.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-gray-400 mb-2">
              <Plus className="w-12 h-12 mx-auto opacity-50" />
            </div>
            <p className="text-sm text-gray-500 mb-4">No output mappings defined yet</p>
            <button
              onClick={handleAddOutput}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Output
            </button>
          </div>
        ) : (
          <div>
            {outputEntries.map(([name, expr]) => (
              <OutputMappingEditor
                key={name}
                name={name}
                expression={expr}
                onUpdate={handleUpdateOutput}
                onDelete={handleDeleteOutput}
                onRename={handleRenameOutput}
                availableOutputs={availableOutputs}
                isLoadingOutputs={isLoadingAnyTask}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      {outputEntries.length > 0 && (
        <div className="p-4 border-t border-gray-200">
          <button
            onClick={handleAddOutput}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Output
          </button>
        </div>
      )}
    </div>
  );
}
