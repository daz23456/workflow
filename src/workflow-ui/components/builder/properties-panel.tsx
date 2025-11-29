/**
 * PropertiesPanel - Properties Editor for Selected Workflow Nodes
 *
 * Features:
 * - Edit node label and description
 * - Display taskRef (read-only)
 * - Validation indicators
 * - Close button and Escape key support
 * - Accessibility features
 */

'use client';

import { useState, useEffect, useMemo } from 'react';
import { X, AlertCircle, CheckCircle, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useWorkflowBuilderStore } from '@/lib/stores/workflow-builder-store';

export function PropertiesPanel() {
  const nodes = useWorkflowBuilderStore((state) => state.graph.nodes);
  const selectedNodeIds = useWorkflowBuilderStore((state) => state.selection.nodeIds);
  const updateNode = useWorkflowBuilderStore((state) => state.updateNode);
  const clearSelection = useWorkflowBuilderStore((state) => state.clearSelection);

  // Get the selected node (first one if multiple selected)
  const selectedNode = useMemo(() => {
    if (selectedNodeIds.length === 0) return null;
    return nodes.find((node) => node.id === selectedNodeIds[0]) || null;
  }, [nodes, selectedNodeIds]);

  // Local state for editing
  const [label, setLabel] = useState('');
  const [description, setDescription] = useState('');

  // Sync local state with selected node
  useEffect(() => {
    if (selectedNode) {
      setLabel(selectedNode.data.label || '');
      setDescription(selectedNode.data.description || '');
    } else {
      setLabel('');
      setDescription('');
    }
  }, [selectedNode]);

  // Escape key to close
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && selectedNode) {
        clearSelection();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selectedNode, clearSelection]);

  // Validation
  const getValidationState = (): 'error' | 'warning' | 'valid' => {
    if (!selectedNode) return 'valid';
    if (!selectedNode.data.taskRef) return 'error';
    if (!selectedNode.data.description) return 'warning';
    return 'valid';
  };

  const validationState = getValidationState();

  const getValidationMessage = (): string => {
    if (!selectedNode?.data.taskRef) return 'Task reference is required';
    if (!selectedNode?.data.description) return 'Description is recommended for clarity';
    return 'Task is valid';
  };

  // Handle label update
  const handleLabelBlur = () => {
    if (!selectedNode) return;
    const trimmedLabel = label.trim();
    if (trimmedLabel === '') {
      // Revert to original
      setLabel(selectedNode.data.label || '');
      return;
    }
    if (trimmedLabel !== selectedNode.data.label) {
      updateNode(selectedNode.id, {
        data: {
          ...selectedNode.data,
          label: trimmedLabel,
        },
      });
    }
  };

  // Handle description update
  const handleDescriptionBlur = () => {
    if (!selectedNode) return;
    if (description !== (selectedNode.data.description || '')) {
      updateNode(selectedNode.id, {
        data: {
          ...selectedNode.data,
          description: description,
        },
      });
    }
  };

  // Validation icon
  const ValidationIcon = () => {
    switch (validationState) {
      case 'error':
        return (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded">
            <div data-testid="validation-error" className="flex-shrink-0">
              <AlertCircle className="w-5 h-5 text-red-500" />
            </div>
            <p className="text-sm text-red-700">{getValidationMessage()}</p>
          </div>
        );
      case 'warning':
        return (
          <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded">
            <div data-testid="validation-warning" className="flex-shrink-0">
              <AlertTriangle className="w-5 h-5 text-yellow-500" />
            </div>
            <p className="text-sm text-yellow-700">{getValidationMessage()}</p>
          </div>
        );
      case 'valid':
        return (
          <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded">
            <div data-testid="validation-valid" className="flex-shrink-0">
              <CheckCircle className="w-5 h-5 text-green-500" />
            </div>
            <p className="text-sm text-green-700">{getValidationMessage()}</p>
          </div>
        );
    }
  };

  return (
    <div
      data-testid="properties-panel"
      className="w-80 bg-white border-l border-gray-200 flex flex-col overflow-y-auto"
      aria-label="Properties panel"
    >
      {/* Header */}
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Properties</h2>
        {selectedNode && (
          <button
            onClick={clearSelection}
            className="p-1 hover:bg-gray-100 rounded"
            aria-label="Close properties panel"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 p-4">
        {!selectedNode ? (
          // Empty state
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <AlertCircle className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No Task Selected
            </h3>
            <p className="text-sm text-gray-600">
              Select a task on the canvas to view and edit its properties
            </p>
          </div>
        ) : (
          // Selected node properties
          <div className="space-y-4">
            {/* Multiple selection notice */}
            {selectedNodeIds.length > 1 && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded">
                <p className="text-sm text-blue-700">
                  {selectedNodeIds.length} tasks selected - Editing first task
                </p>
              </div>
            )}

            {/* Validation status */}
            <ValidationIcon />

            {/* Label field */}
            <div>
              <label htmlFor="label" className="block text-sm font-medium text-gray-700 mb-1">
                Label
              </label>
              <input
                id="label"
                type="text"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                onBlur={handleLabelBlur}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Task label"
                aria-label="Label"
              />
              <p className="mt-1 text-xs text-gray-500">
                Display name for this task in the workflow
              </p>
            </div>

            {/* Task Reference field (read-only) */}
            <div>
              <label htmlFor="taskRef" className="block text-sm font-medium text-gray-700 mb-1">
                Task Reference
              </label>
              <input
                id="taskRef"
                type="text"
                value={selectedNode.data.taskRef || ''}
                readOnly
                className="w-full px-3 py-2 border border-gray-300 rounded bg-gray-50 text-gray-600 cursor-not-allowed"
                aria-label="Task Reference"
              />
              <p className="mt-1 text-xs text-gray-500">
                Task reference cannot be changed after creation
              </p>
            </div>

            {/* Description field */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                onBlur={handleDescriptionBlur}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                placeholder="Task description (optional)"
                aria-label="Description"
              />
              <p className="mt-1 text-xs text-gray-500">
                Describe what this task does
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Screen reader announcements */}
      {selectedNode && validationState === 'error' && (
        <div role="alert" className="sr-only">
          {getValidationMessage()}
        </div>
      )}
    </div>
  );
}
