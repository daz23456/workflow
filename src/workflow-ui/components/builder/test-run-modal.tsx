/**
 * Test Run Modal - Execute workflow with real HTTP calls
 *
 * Allows testing workflows before deploying to Kubernetes.
 * Uses the test-execute endpoint which parses YAML and executes tasks.
 */

'use client';

import { useState, useEffect } from 'react';
import { Play, CheckCircle, XCircle, Clock, Loader2, AlertTriangle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { testExecuteWorkflow } from '@/lib/api/client';
import { graphToYaml } from '@/lib/adapters/yaml-adapter';
import type { WorkflowBuilderState, WorkflowInputParameter } from '@/lib/types/workflow-builder';
import type { TestExecuteResponse, TaskExecutionDetail } from '@/lib/api/types';
import { cn } from '@/lib/utils';

interface TestRunModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  state: WorkflowBuilderState;
}

type TestStatus = 'idle' | 'running' | 'success' | 'failed';

export function TestRunModal({ open, onOpenChange, state }: TestRunModalProps) {
  const [inputValues, setInputValues] = useState<Record<string, string>>({});
  const [testStatus, setTestStatus] = useState<TestStatus>('idle');
  const [result, setResult] = useState<TestExecuteResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Build input fields based on inputSchema
  const inputFields = Object.entries(state.inputSchema);

  // Get default value for an input parameter
  const getDefaultValue = (param: WorkflowInputParameter): string => {
    if (param.default !== undefined) {
      return typeof param.default === 'object'
        ? JSON.stringify(param.default)
        : String(param.default);
    }
    return '';
  };

  // Reset state when modal opens - useEffect is more reliable than onOpenChange callback
  useEffect(() => {
    if (open) {
      setTestStatus('idle');
      setResult(null);
      setError(null);

      // Initialize input values with defaults
      const defaults: Record<string, string> = {};
      Object.entries(state.inputSchema).forEach(([key, param]) => {
        defaults[key] = getDefaultValue(param);
      });
      setInputValues(defaults);
    }
  }, [open, state.inputSchema]);

  // Handle input value change
  const handleInputChange = (key: string, value: string) => {
    setInputValues((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  // Parse input values to correct types
  const parseInputValues = (): Record<string, unknown> => {
    const parsed: Record<string, unknown> = {};

    inputFields.forEach(([key, param]) => {
      const value = inputValues[key] || '';

      switch (param.type) {
        case 'integer':
        case 'number':
          parsed[key] = value ? Number(value) : 0;
          break;
        case 'boolean':
          parsed[key] = value.toLowerCase() === 'true';
          break;
        case 'array':
        case 'object':
          try {
            parsed[key] = value ? JSON.parse(value) : param.type === 'array' ? [] : {};
          } catch {
            parsed[key] = param.type === 'array' ? [] : {};
          }
          break;
        default:
          parsed[key] = value;
      }
    });

    return parsed;
  };

  // Run the test
  const handleRunTest = async () => {
    setTestStatus('running');
    setResult(null);
    setError(null);

    try {
      // Validate workflow before sending
      if (!state.metadata.name || state.metadata.name.trim() === '') {
        setError('Workflow name is required. Please enter a name in the header.');
        setTestStatus('failed');
        return;
      }

      // Filter to only task nodes (exclude input/output)
      const taskNodes = state.graph.nodes.filter(n => n.type === 'task');
      if (taskNodes.length === 0) {
        setError('Workflow must have at least one task. Drag tasks from the palette to the canvas.');
        setTestStatus('failed');
        return;
      }

      // Create a modified state with only task nodes for YAML generation
      const stateForYaml = {
        ...state,
        graph: {
          ...state.graph,
          nodes: taskNodes,
        },
      };

      // Generate YAML from current workflow state
      const workflowYaml = graphToYaml(stateForYaml, { format: 'string' }) as string;

      console.log('Generated YAML:', workflowYaml); // Debug

      // Parse input values
      const input = parseInputValues();

      // Execute the test
      const response = await testExecuteWorkflow(
        {
          workflowYaml,
          input,
        },
        state.metadata.namespace
      );

      setResult(response);
      setTestStatus(response.success ? 'success' : 'failed');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
      setTestStatus('failed');
    }
  };

  // Render task execution detail
  const renderTaskDetail = (task: TaskExecutionDetail, index: number) => {
    const isSuccess = task.success;
    const hasErrors = task.errors && task.errors.length > 0;

    return (
      <div
        key={task.taskId || task.taskRef || index}
        className={cn(
          'p-3 rounded-lg border',
          isSuccess ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
        )}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            {isSuccess ? (
              <CheckCircle className="w-4 h-4 text-green-600" />
            ) : (
              <XCircle className="w-4 h-4 text-red-600" />
            )}
            <span className="font-medium text-sm">
              {task.taskRef || task.taskId || `Task ${index + 1}`}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {task.retryCount > 0 && (
              <Badge variant="outline" className="text-xs">
                {task.retryCount} retries
              </Badge>
            )}
            <Badge variant="secondary" className="text-xs">
              <Clock className="w-3 h-3 mr-1" />
              {task.durationMs}ms
            </Badge>
          </div>
        </div>

        {/* Task output */}
        {task.output && Object.keys(task.output).length > 0 && (
          <div className="mt-2">
            <p className="text-xs font-medium text-gray-500 mb-1">Output:</p>
            <pre className="text-xs bg-white/50 p-2 rounded overflow-auto max-h-32 whitespace-pre-wrap break-words">
              {JSON.stringify(task.output, null, 2)}
            </pre>
          </div>
        )}

        {/* Task errors */}
        {hasErrors && (
          <div className="mt-2">
            <p className="text-xs font-medium text-red-600 mb-1">Errors:</p>
            {task.errors.map((err, i) => (
              <p key={i} className="text-xs text-red-600">
                {err}
              </p>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Play className="w-5 h-5" />
            Test Run: {state.metadata.name || 'Unnamed Workflow'}
          </DialogTitle>
          <DialogDescription>
            Execute this workflow with real HTTP calls to test its behavior before deploying.
          </DialogDescription>
        </DialogHeader>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {/* Input Fields Section */}
          {inputFields.length > 0 && (
            <div className="space-y-4 py-4">
              <h3 className="font-medium text-sm text-gray-700">Workflow Input</h3>
              <div className="space-y-3">
                {inputFields.map(([key, param]) => (
                  <div key={key} className="space-y-1">
                    <Label htmlFor={`input-${key}`} className="text-sm">
                      {key}
                      {param.required && <span className="text-red-500 ml-1">*</span>}
                      <span className="text-gray-400 ml-2 font-normal">({param.type})</span>
                    </Label>
                    {param.description && (
                      <p className="text-xs text-gray-500">{param.description}</p>
                    )}
                    <Input
                      id={`input-${key}`}
                      type={param.type === 'integer' || param.type === 'number' ? 'number' : 'text'}
                      value={inputValues[key] || ''}
                      onChange={(e) => handleInputChange(key, e.target.value)}
                      placeholder={
                        param.enum ? `Options: ${param.enum.join(', ')}` : `Enter ${param.type}`
                      }
                      disabled={testStatus === 'running'}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* No Input Message */}
          {inputFields.length === 0 && (
            <div className="py-4 text-sm text-gray-500">
              This workflow has no input parameters defined.
            </div>
          )}

          {/* Results Section */}
          {(result || error) && (
            <div className="border-t pt-4 space-y-4">
              <h3 className="font-medium text-sm text-gray-700">Results</h3>

              {/* Overall Status */}
              {result && (
                <div
                  className={cn(
                    'p-4 rounded-lg',
                    result.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {result.success ? (
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-600" />
                      )}
                      <span className="font-medium">
                        {result.success ? 'Execution Successful' : 'Execution Failed'}
                      </span>
                    </div>
                    <Badge variant="secondary">
                      <Clock className="w-3 h-3 mr-1" />
                      Total: {result.executionTimeMs}ms
                    </Badge>
                  </div>

                  {/* Error message */}
                  {result.error && (
                    <p className="mt-2 text-sm text-red-600">{result.error}</p>
                  )}

                  {/* Validation errors */}
                  {result.validationErrors && result.validationErrors.length > 0 && (
                    <div className="mt-2">
                      <p className="text-sm font-medium text-red-600">Validation Errors:</p>
                      <ul className="mt-1 list-disc list-inside text-sm text-red-600">
                        {result.validationErrors.map((err, i) => (
                          <li key={i}>{err}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* Connection/API Error */}
              {error && !result && (
                <div className="p-4 rounded-lg bg-red-50 border border-red-200">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                    <span className="font-medium text-red-600">Connection Error</span>
                  </div>
                  <p className="mt-2 text-sm text-red-600">{error}</p>
                </div>
              )}

              {/* Task Details */}
              {result && result.taskDetails && result.taskDetails.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-gray-600">
                    Task Execution Details ({result.taskDetails.length} tasks)
                  </h4>
                  <div className="space-y-2 max-h-64 overflow-auto">
                    {result.taskDetails.map((task, index) => renderTaskDetail(task, index))}
                  </div>
                </div>
              )}

              {/* Workflow Output */}
              {result && result.output && Object.keys(result.output).length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-gray-600">Workflow Output</h4>
                  <pre className="text-xs bg-gray-100 p-3 rounded overflow-auto max-h-48 whitespace-pre-wrap break-words">
                    {JSON.stringify(result.output, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 shrink-0 pt-4 border-t">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={testStatus === 'running'}
          >
            Close
          </Button>
          <Button onClick={handleRunTest} disabled={testStatus === 'running'}>
            {testStatus === 'running' ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Running...
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-2" />
                Run Test
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
