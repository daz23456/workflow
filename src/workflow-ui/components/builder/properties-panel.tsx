/**
 * PropertiesPanel - Properties Editor for Selected Workflow Nodes
 *
 * Features:
 * - Edit node label and description
 * - Display taskRef (read-only)
 * - Display task input/output schemas
 * - Validation indicators
 * - Close button and Escape key support
 * - Accessibility features
 */

'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { X, AlertCircle, CheckCircle, AlertTriangle, Loader2, ArrowRightFromLine, ArrowRightToLine, Settings2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useWorkflowBuilderStore } from '@/lib/stores/workflow-builder-store';
import { FieldWithHelp } from '@/components/learning/field-with-help';
import { HELP_TOPICS } from '@/components/learning/help-content-registry';
import { getTaskDetail } from '@/lib/api/client';
import type { TaskDetailResponse, SchemaDefinition, PropertyDefinition } from '@/lib/api/types';

// Utility to check if a value is a template expression
const isTemplateExpression = (value: string): boolean => {
  return /\{\{.*\}\}/.test(value);
};

export function PropertiesPanel() {
  const nodes = useWorkflowBuilderStore((state) => state.graph.nodes);
  const edges = useWorkflowBuilderStore((state) => state.graph.edges);
  const selectedTaskId = useWorkflowBuilderStore((state) => state.panel.selectedTaskId);
  const selectedNodeIds = useWorkflowBuilderStore((state) => state.selection.nodeIds);
  const updateNode = useWorkflowBuilderStore((state) => state.updateNode);
  const clearSelection = useWorkflowBuilderStore((state) => state.clearSelection);
  const inputSchema = useWorkflowBuilderStore((state) => state.inputSchema);

  // Get the selected node - primary: panel.selectedTaskId (set by canvas click), fallback: selection.nodeIds
  const selectedNode = useMemo(() => {
    // Primary: use panel.selectedTaskId (set by canvas click via openPanel)
    if (selectedTaskId) {
      return nodes.find((node) => node.id === selectedTaskId) || null;
    }
    // Fallback: use selection.nodeIds (for multi-select compatibility)
    if (selectedNodeIds.length > 0) {
      return nodes.find((node) => node.id === selectedNodeIds[0]) || null;
    }
    return null;
  }, [nodes, selectedTaskId, selectedNodeIds]);

  // Local state for editing
  const [label, setLabel] = useState('');
  const [description, setDescription] = useState('');

  // State for task details (fetched from API)
  const [taskDetails, setTaskDetails] = useState<TaskDetailResponse | null>(null);
  const [taskDetailsLoading, setTaskDetailsLoading] = useState(false);
  const [taskDetailsError, setTaskDetailsError] = useState<string | null>(null);

  // State for input configuration values
  const [inputValues, setInputValues] = useState<Record<string, string>>({});

  // State for template expression suggestions
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeInputField, setActiveInputField] = useState<string | null>(null);
  const [upstreamTaskDetails, setUpstreamTaskDetails] = useState<Map<string, TaskDetailResponse>>(new Map());

  // Get upstream task IDs (tasks that this node depends on)
  const upstreamTaskIds = useMemo(() => {
    if (!selectedNode) return [];
    return edges
      .filter((edge) => edge.target === selectedNode.id)
      .map((edge) => edge.source);
  }, [edges, selectedNode]);

  // Fetch upstream task details for suggestions
  useEffect(() => {
    if (upstreamTaskIds.length === 0) return;

    const fetchUpstreamDetails = async () => {
      const detailsMap = new Map<string, TaskDetailResponse>();

      for (const taskId of upstreamTaskIds) {
        const node = nodes.find((n) => n.id === taskId);
        if (node?.data.taskRef) {
          try {
            const details = await getTaskDetail(node.data.taskRef);
            detailsMap.set(taskId, details);
          } catch {
            // Silently ignore errors for suggestions
          }
        }
      }

      setUpstreamTaskDetails(detailsMap);
    };

    fetchUpstreamDetails();
  }, [upstreamTaskIds, nodes]);

  // Build template suggestions
  const templateSuggestions = useMemo(() => {
    const suggestions: Array<{ label: string; value: string }> = [];

    // Add workflow input suggestions
    if (inputSchema) {
      Object.keys(inputSchema).forEach((key) => {
        suggestions.push({
          label: `input.${key}`,
          value: `{{input.${key}}}`,
        });
      });
    }

    // Add upstream task output suggestions
    upstreamTaskIds.forEach((taskId) => {
      const details = upstreamTaskDetails.get(taskId);
      if (details?.outputSchema?.properties) {
        Object.keys(details.outputSchema.properties).forEach((propName) => {
          suggestions.push({
            label: `tasks.${taskId}.output.${propName}`,
            value: `{{tasks.${taskId}.output.${propName}}}`,
          });
        });
      } else {
        // Even without details, offer basic task output reference
        suggestions.push({
          label: `tasks.${taskId}.output`,
          value: `{{tasks.${taskId}.output}}`,
        });
      }
    });

    return suggestions;
  }, [inputSchema, upstreamTaskIds, upstreamTaskDetails]);

  // Handle suggestion selection
  const handleSuggestionSelect = useCallback((suggestion: { label: string; value: string }) => {
    if (!activeInputField) return;

    setInputValues((prev) => ({ ...prev, [activeInputField]: suggestion.value }));
    setShowSuggestions(false);
    setActiveInputField(null);
  }, [activeInputField]);

  // Close suggestions on Escape
  const handleSuggestionsKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setShowSuggestions(false);
      setActiveInputField(null);
    }
  }, []);

  // Fetch task details when taskRef changes
  useEffect(() => {
    const taskRef = selectedNode?.data.taskRef;
    if (!taskRef) {
      setTaskDetails(null);
      setTaskDetailsError(null);
      return;
    }

    let cancelled = false;
    setTaskDetailsLoading(true);
    setTaskDetailsError(null);

    getTaskDetail(taskRef)
      .then((details) => {
        if (!cancelled) {
          setTaskDetails(details);
          setTaskDetailsLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setTaskDetailsError(err instanceof Error ? err.message : 'Failed to load task details');
          setTaskDetailsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [selectedNode?.data.taskRef]);

  // Sync local state with selected node
  useEffect(() => {
    if (selectedNode) {
      setLabel(selectedNode.data.label || '');
      setDescription(selectedNode.data.description || '');
      setInputValues(selectedNode.data.input || {});
    } else {
      setLabel('');
      setDescription('');
      setInputValues({});
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
  const handleLabelUpdate = () => {
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
  const handleDescriptionUpdate = () => {
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

  // Handle Enter key press
  const handleKeyDown = (e: React.KeyboardEvent, updateFn: () => void) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      updateFn();
    }
  };

  // Handle input value change
  const handleInputValueChange = useCallback((propertyName: string, value: string) => {
    setInputValues(prev => ({ ...prev, [propertyName]: value }));
  }, []);

  // Handle input value update (on blur)
  const handleInputValueUpdate = useCallback((propertyName: string) => {
    if (!selectedNode) return;
    const currentInput = selectedNode.data.input || {};
    const newValue = inputValues[propertyName] || '';

    // Only update if value changed
    if (currentInput[propertyName] !== newValue) {
      updateNode(selectedNode.id, {
        data: {
          ...selectedNode.data,
          input: {
            ...currentInput,
            [propertyName]: newValue,
          },
        },
      });
    }
  }, [selectedNode, inputValues, updateNode]);

  // Check if input schema has properties that need configuration
  const hasInputProperties = useMemo(() => {
    if (!taskDetails?.inputSchema?.properties) return false;
    return Object.keys(taskDetails.inputSchema.properties).length > 0;
  }, [taskDetails]);

  // Get required input properties
  const getRequiredInputs = useMemo(() => {
    if (!taskDetails?.inputSchema?.required) return [];
    return taskDetails.inputSchema.required;
  }, [taskDetails]);

  // Check if required inputs are missing
  const getMissingRequiredInputs = useMemo(() => {
    if (!taskDetails?.inputSchema?.required) return [];
    return taskDetails.inputSchema.required.filter(
      (name) => !inputValues[name] || inputValues[name].trim() === ''
    );
  }, [taskDetails, inputValues]);

  // Schema property renderer
  const renderSchemaProperties = (schema: SchemaDefinition | undefined, isRequired: (name: string) => boolean) => {
    if (!schema?.properties || Object.keys(schema.properties).length === 0) {
      return <p className="text-sm text-gray-500 italic">No properties defined</p>;
    }

    return (
      <div className="space-y-2">
        {Object.entries(schema.properties).map(([name, prop]) => (
          <div key={name} className="flex items-start gap-2 text-sm">
            <span className={cn(
              "font-mono px-1.5 py-0.5 rounded text-xs",
              isRequired(name) ? "bg-blue-100 text-blue-800" : "bg-gray-100 text-gray-700"
            )}>
              {name}
              {isRequired(name) && <span className="text-red-500 ml-0.5">*</span>}
            </span>
            <span className="text-gray-500">:</span>
            <span className="text-purple-600 font-mono text-xs">{prop.type}</span>
            {prop.description && (
              <span className="text-gray-500 text-xs truncate flex-1" title={prop.description}>
                - {prop.description}
              </span>
            )}
          </div>
        ))}
      </div>
    );
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
      className="w-full h-full bg-white border-l border-gray-200 flex flex-col overflow-hidden"
      aria-label="Properties panel"
    >
      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {!selectedNode ? (
          // Empty state
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <AlertCircle className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Task Selected</h3>
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
            <FieldWithHelp
              label="Label"
              helpTopic={HELP_TOPICS.TASK_LABEL}
              required
            >
              <input
                id="label"
                type="text"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                onBlur={handleLabelUpdate}
                onKeyDown={(e) => handleKeyDown(e, handleLabelUpdate)}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Task label"
                aria-label="Label"
              />
            </FieldWithHelp>

            {/* Task Reference field (read-only) */}
            <FieldWithHelp
              label="Task Reference"
              helpTopic={HELP_TOPICS.TASK_REFERENCE}
              required
            >
              <input
                id="taskRef"
                type="text"
                value={selectedNode.data.taskRef || ''}
                readOnly
                className="w-full px-3 py-2 border border-gray-300 rounded bg-gray-50 text-gray-600 cursor-not-allowed"
                aria-label="Task Reference"
              />
            </FieldWithHelp>

            {/* Description field */}
            <FieldWithHelp
              label="Description"
              helpTopic={HELP_TOPICS.TASK_DESCRIPTION}
            >
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                onBlur={handleDescriptionUpdate}
                onKeyDown={(e) => {
                  // Allow Shift+Enter for newlines, Enter alone saves
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleDescriptionUpdate();
                  }
                }}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                placeholder="Task description (optional)"
                aria-label="Description"
              />
            </FieldWithHelp>

            {/* Input Configuration Section */}
            {hasInputProperties && taskDetails && !taskDetailsLoading && (
              <div
                data-testid="input-configuration-section"
                className="border-t border-gray-200 pt-4 mt-4 space-y-4"
              >
                <div className="flex items-center gap-2 mb-2">
                  <Settings2 className="w-4 h-4 text-purple-600" />
                  <h3 className="text-sm font-semibold text-gray-700">Input Configuration</h3>
                </div>

                {/* Validation error for missing required inputs */}
                {getMissingRequiredInputs.length > 0 && (
                  <div
                    data-testid="missing-required-inputs-error"
                    className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700"
                  >
                    {getMissingRequiredInputs.map((name, index) => (
                      <span key={name}>
                        {name} is required{index < getMissingRequiredInputs.length - 1 ? ', ' : ''}
                      </span>
                    ))}
                  </div>
                )}

                <div className="space-y-3">
                  {Object.entries(taskDetails.inputSchema?.properties || {}).map(([propertyName, property]) => {
                    const isRequired = getRequiredInputs.includes(propertyName);
                    const currentValue = inputValues[propertyName] || '';
                    const isTemplate = isTemplateExpression(currentValue);
                    const showSuggestionsForField = showSuggestions && activeInputField === propertyName;

                    return (
                      <div
                        key={propertyName}
                        data-testid={`input-field-${propertyName}`}
                        data-required={isRequired.toString()}
                        data-is-template={isTemplate.toString()}
                        className="space-y-1"
                      >
                        <label
                          htmlFor={`input-${propertyName}`}
                          className="block text-sm font-medium text-gray-700"
                        >
                          {propertyName}
                          {isRequired && <span className="text-red-500 ml-1">*</span>}
                          <span className="text-gray-400 text-xs ml-2">({property.type})</span>
                        </label>
                        {property.description && (
                          <p className="text-xs text-gray-500">{property.description}</p>
                        )}
                        <div className="relative">
                          <input
                            id={`input-${propertyName}`}
                            type="text"
                            value={currentValue}
                            onChange={(e) => {
                              const newValue = e.target.value;
                              handleInputValueChange(propertyName, newValue);
                              // Show suggestions when user types {{
                              if (newValue.endsWith('{{')) {
                                setShowSuggestions(true);
                                setActiveInputField(propertyName);
                              }
                            }}
                            onBlur={() => {
                              // Delay blur to allow clicking on suggestions
                              setTimeout(() => {
                                handleInputValueUpdate(propertyName);
                              }, 200);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleInputValueUpdate(propertyName);
                              }
                              if (e.key === 'Escape' && showSuggestionsForField) {
                                e.preventDefault();
                                e.stopPropagation();
                                setShowSuggestions(false);
                                setActiveInputField(null);
                              }
                            }}
                            className={cn(
                              "w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500",
                              isTemplate
                                ? "border-purple-300 bg-purple-50 text-purple-800 font-mono text-sm"
                                : "border-gray-300"
                            )}
                            placeholder="Enter value or template expression (e.g., {{tasks.taskId.output.field}})"
                            aria-label={`${propertyName} input value`}
                          />
                          {isTemplate && !showSuggestionsForField && (
                            <div
                              data-testid={`template-indicator-${propertyName}`}
                              className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-purple-600 bg-purple-100 px-1.5 py-0.5 rounded"
                            >
                              Template
                            </div>
                          )}
                          {/* Template Expression Suggestions Dropdown */}
                          {showSuggestionsForField && templateSuggestions.length > 0 && (
                            <div
                              data-testid="template-suggestions"
                              className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto"
                            >
                              <div className="p-2 text-xs text-gray-500 border-b">
                                Available template expressions
                              </div>
                              {templateSuggestions.map((suggestion) => (
                                <button
                                  key={suggestion.value}
                                  type="button"
                                  className="w-full px-3 py-2 text-left text-sm hover:bg-blue-50 focus:bg-blue-50 focus:outline-none font-mono text-purple-700"
                                  onClick={() => handleSuggestionSelect(suggestion)}
                                >
                                  {suggestion.label}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Task Schema Section */}
            {selectedNode.data.taskRef && (
              <div className="border-t border-gray-200 pt-4 mt-4 space-y-4">
                {/* Loading state */}
                {taskDetailsLoading && (
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Loading task schema...
                  </div>
                )}

                {/* Error state */}
                {taskDetailsError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                    {taskDetailsError}
                  </div>
                )}

                {/* Task schemas */}
                {taskDetails && !taskDetailsLoading && (
                  <>
                    {/* Input Schema */}
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <ArrowRightToLine className="w-4 h-4 text-green-600" />
                        <h3 className="text-sm font-semibold text-gray-700">Input Schema</h3>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-3">
                        {renderSchemaProperties(
                          taskDetails.inputSchema,
                          (name) => taskDetails.inputSchema?.required?.includes(name) ?? false
                        )}
                      </div>
                    </div>

                    {/* Output Schema */}
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <ArrowRightFromLine className="w-4 h-4 text-blue-600" />
                        <h3 className="text-sm font-semibold text-gray-700">Output Schema</h3>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-3">
                        {renderSchemaProperties(
                          taskDetails.outputSchema,
                          (name) => taskDetails.outputSchema?.required?.includes(name) ?? false
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
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
