/**
 * Transform Builder Page
 *
 * Visual transform pipeline builder with drag-and-drop operation palette.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { Download, RotateCcw, AlertTriangle, Check, Copy, Save, Info } from 'lucide-react';
import { ReactFlowProvider } from '@xyflow/react';
import { JsonUploadPanel } from '@/components/transforms/json-upload-panel';
import { PipelineBuilder } from '@/components/transforms/pipeline-builder';
import { PreviewPanel } from '@/components/transforms/preview-panel';
import { PropertiesPanel } from '@/components/transforms/properties-panel';
import { OperationPalette } from '@/components/transforms/operation-palette';
import { useTransformBuilderStore } from '@/lib/stores/transform-builder-store';
import { transformToWorkflowTask, transformToInlineYaml } from '@/lib/adapters/transform-yaml-adapter';
import type { TransformDslDefinition } from '@/lib/types/transform-dsl';

/**
 * Generate a content hash for a transform DSL (ignoring name/description)
 * Uses a simple hash for comparison - just normalized JSON string
 */
function generateContentHash(dsl: TransformDslDefinition): string {
  // Normalize the pipeline by removing any undefined values and sorting keys
  const normalized = JSON.stringify(dsl.pipeline, Object.keys(dsl.pipeline).sort());
  return normalized;
}

interface DuplicateCheckResult {
  nameExists: boolean;
  contentDuplicate: {
    exists: boolean;
    matchingTaskName?: string;
  };
}

export default function TransformsPage() {
  const { inputData, pipeline, reset, setInputData, executePreview, metadata, setMetadata } = useTransformBuilderStore();
  const [showYamlDialog, setShowYamlDialog] = useState(false);
  const [exportedYaml, setExportedYaml] = useState('');
  const [exportName, setExportName] = useState('');
  const [duplicateCheck, setDuplicateCheck] = useState<DuplicateCheckResult | null>(null);
  const [isCheckingExists, setIsCheckingExists] = useState(false);
  const [copied, setCopied] = useState(false);

  // Expose store to window for E2E testing
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).useTransformBuilderStore = useTransformBuilderStore;
    }
  }, []);

  // Auto-execute preview when data or pipeline changes
  useEffect(() => {
    if (inputData.length > 0) {
      executePreview();
    }
  }, [inputData, pipeline, executePreview]);

  const handleUpload = (data: unknown[]) => {
    setInputData(data);
  };

  // Check for duplicates: both name collision and content duplication
  const checkForDuplicates = useCallback(
    async (taskName: string, dsl: TransformDslDefinition): Promise<DuplicateCheckResult> => {
      const result: DuplicateCheckResult = {
        nameExists: false,
        contentDuplicate: { exists: false },
      };

      try {
        // Check if name exists
        const nameResponse = await fetch(`/api/tasks/${encodeURIComponent(taskName)}`);
        result.nameExists = nameResponse.ok;

        // Fetch all tasks to check for content duplicates
        const tasksResponse = await fetch('/api/tasks');
        if (tasksResponse.ok) {
          const tasksData = await tasksResponse.json();
          const tasks = tasksData.tasks || tasksData || [];

          // Generate hash of current pipeline content
          const currentHash = generateContentHash(dsl);

          // Check each existing task for matching content
          for (const task of tasks) {
            // Skip if it's the same name (that's a name collision, not content duplicate)
            if (task.name === taskName) continue;

            // Check if task has transform config
            if (task.spec?.type === 'transform' && task.spec?.config?.pipeline) {
              const existingDsl: TransformDslDefinition = {
                version: task.spec.config.version || '1.0',
                pipeline: task.spec.config.pipeline,
              };
              const existingHash = generateContentHash(existingDsl);

              if (currentHash === existingHash) {
                result.contentDuplicate = {
                  exists: true,
                  matchingTaskName: task.name,
                };
                break;
              }
            }
          }
        }
      } catch (error) {
        console.error('Error checking for duplicates:', error);
      }

      return result;
    },
    []
  );

  const handleExport = async () => {
    const state = useTransformBuilderStore.getState();
    const dsl = state.toDsl();
    const name = state.metadata.name || 'my-transform';
    const description = state.metadata.description || 'Generated transform';
    const yaml = transformToWorkflowTask(dsl, name, description);

    setExportedYaml(yaml);
    setExportName(name);
    setDuplicateCheck(null);
    setCopied(false);
    setShowYamlDialog(true);

    // Check for duplicates (name and content)
    setIsCheckingExists(true);
    try {
      const result = await checkForDuplicates(name, dsl);
      setDuplicateCheck(result);
    } finally {
      setIsCheckingExists(false);
    }
  };

  const handleCopyToClipboard = useCallback(() => {
    navigator.clipboard.writeText(exportedYaml);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [exportedYaml]);

  const handleDownloadFile = useCallback(() => {
    const blob = new Blob([exportedYaml], { type: 'application/x-yaml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${exportName}.yaml`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [exportedYaml, exportName]);

  const handleReset = () => {
    if (confirm('Reset the entire workflow? This cannot be undone.')) {
      reset();
    }
  };

  const hasData = inputData.length > 0;
  const hasOperations = pipeline.length > 0;

  return (
    <main className="h-screen overflow-hidden bg-gray-50 dark:bg-gray-900 flex flex-col">
      {/* Header - Fixed */}
      <div className="flex-shrink-0 px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            {hasData ? (
              <div className="flex items-center gap-4">
                <input
                  type="text"
                  value={metadata.name}
                  onChange={(e) => setMetadata({ name: e.target.value })}
                  placeholder="Transform name..."
                  className="text-lg font-bold text-gray-900 dark:text-gray-100 bg-transparent border-b-2 border-transparent hover:border-gray-300 dark:hover:border-gray-600 focus:border-blue-500 focus:outline-none max-w-xs"
                />
                <input
                  type="text"
                  value={metadata.description}
                  onChange={(e) => setMetadata({ description: e.target.value })}
                  placeholder="Description..."
                  className="text-sm text-gray-600 dark:text-gray-400 bg-transparent border-b border-transparent hover:border-gray-200 dark:hover:border-gray-600 focus:border-blue-400 focus:outline-none flex-1 max-w-md"
                />
              </div>
            ) : (
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Data Transform Assistant</h1>
              </div>
            )}
          </div>

          <div className="flex gap-2">
            {hasData && (
              <button
                onClick={handleReset}
                className="flex items-center gap-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600"
                aria-label="Reset"
              >
                <RotateCcw className="h-4 w-4" />
                Reset
              </button>
            )}

            {hasOperations && (
              <button
                onClick={handleExport}
                className="flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
                aria-label="Export YAML"
              >
                <Download className="h-4 w-4" />
                Export
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content - Fills remaining space */}
      <div className="flex-1 overflow-hidden p-4">
        {!hasData ? (
          // Upload Section (shown when no data)
          <div className="h-full flex items-center justify-center">
            <section className="rounded-lg bg-white dark:bg-gray-800 p-6 shadow max-w-2xl w-full">
              <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">Upload Sample JSON</h2>
              <JsonUploadPanel onUpload={handleUpload} />
            </section>
          </div>
        ) : (
          // Main Builder (shown when data is loaded)
          <div className="grid grid-cols-12 gap-3 h-full">
            {/* Left Column: Operation Palette */}
            <div className="col-span-2 h-full">
              <section className="rounded-lg bg-white dark:bg-gray-800 shadow h-full flex flex-col overflow-hidden">
                <div className="flex-shrink-0 px-3 py-2 border-b border-gray-200 dark:border-gray-700">
                  <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Operations</h2>
                </div>
                <div className="flex-1 overflow-auto">
                  <OperationPalette />
                </div>
              </section>
            </div>

            {/* Pipeline Canvas */}
            <div className="col-span-4 h-full">
              <section className="rounded-lg bg-white dark:bg-gray-800 shadow h-full flex flex-col overflow-hidden">
                <div className="flex-shrink-0 px-3 py-2 border-b border-gray-200 dark:border-gray-700">
                  <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Pipeline</h2>
                </div>
                <div className="flex-1 overflow-hidden">
                  <ReactFlowProvider>
                    <PipelineBuilder />
                  </ReactFlowProvider>
                </div>
              </section>
            </div>

            {/* Properties Panel */}
            <div className="col-span-3 h-full">
              <section className="rounded-lg bg-white dark:bg-gray-800 shadow h-full flex flex-col overflow-hidden">
                <div className="flex-shrink-0 px-3 py-2 border-b border-gray-200 dark:border-gray-700">
                  <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Configure</h2>
                </div>
                <div className="flex-1 overflow-auto">
                  <PropertiesPanel />
                </div>
              </section>
            </div>

            {/* Right Column: Preview */}
            <div className="col-span-3 h-full">
              <section className="rounded-lg bg-white dark:bg-gray-800 shadow h-full flex flex-col overflow-hidden">
                <div className="flex-shrink-0 px-3 py-2 border-b border-gray-200 dark:border-gray-700">
                  <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Preview</h2>
                </div>
                <div className="flex-1 overflow-auto p-3">
                  <PreviewPanel />
                </div>
              </section>
            </div>
          </div>
        )}
      </div>

      {/* YAML Export Dialog */}
      {showYamlDialog && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => setShowYamlDialog(false)}
        >
          <div
            className="max-h-[80vh] w-full max-w-3xl overflow-auto rounded-lg bg-white dark:bg-gray-800 p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                Export: {exportName}.yaml
              </h3>
              <button
                onClick={() => setShowYamlDialog(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            {/* Duplicate check results */}
            {isCheckingExists && (
              <div className="mb-4 flex items-center gap-2 rounded-lg bg-gray-100 dark:bg-gray-700 p-3 text-sm text-gray-600 dark:text-gray-300">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-400 border-t-transparent" />
                Checking for duplicates on server...
              </div>
            )}

            {/* Content duplicate warning - most important, show first */}
            {duplicateCheck?.contentDuplicate.exists && (
              <div className="mb-4 flex items-start gap-2 rounded-lg bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 p-3 text-sm text-red-800 dark:text-red-200">
                <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <strong>Duplicate Content Detected!</strong>
                  <p className="mt-1">
                    This exact transform pipeline already exists as{' '}
                    <code className="bg-red-100 dark:bg-red-900/50 px-1 rounded font-mono">
                      {duplicateCheck.contentDuplicate.matchingTaskName}
                    </code>
                  </p>
                  <p className="mt-1 text-red-700 dark:text-red-300">
                    Consider using the existing task instead of creating a duplicate.
                  </p>
                </div>
              </div>
            )}

            {/* Name collision - must create new version */}
            {duplicateCheck?.nameExists && (
              <div className="mb-4 flex items-start gap-2 rounded-lg bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 p-3 text-sm text-red-800 dark:text-red-200">
                <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <strong>Name Already Exists:</strong> A task named &quot;{exportName}&quot; already exists.
                  <p className="mt-1 text-red-700 dark:text-red-300">
                    You must create a new version with a different name (e.g.,{' '}
                    <code className="bg-red-100 dark:bg-red-900/50 px-1 rounded font-mono">{exportName}-v2</code>)
                    or delete the existing task first.
                  </p>
                  <p className="mt-2 text-red-600 dark:text-red-400 text-xs">
                    Overwrites are not allowed to maintain version history.
                  </p>
                </div>
              </div>
            )}

            {/* All clear - no duplicates */}
            {duplicateCheck && !duplicateCheck.nameExists && !duplicateCheck.contentDuplicate.exists && (
              <div className="mb-4 flex items-center gap-2 rounded-lg bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 p-3 text-sm text-green-800 dark:text-green-200">
                <Check className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0" />
                <div>
                  <strong>Ready to create.</strong> This is a unique transform with a new name.
                </div>
              </div>
            )}

            <pre className="overflow-auto rounded-lg bg-gray-50 dark:bg-gray-900 p-4 text-sm font-mono text-gray-900 dark:text-gray-100 max-h-[40vh]">
              {exportedYaml}
            </pre>

            <div className="mt-4 flex justify-between">
              <button
                onClick={handleDownloadFile}
                className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
              >
                <Save className="h-4 w-4" />
                Download File
              </button>

              <div className="flex gap-2">
                <button
                  onClick={handleCopyToClipboard}
                  className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                >
                  {copied ? (
                    <>
                      <Check className="h-4 w-4" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" />
                      Copy to Clipboard
                    </>
                  )}
                </button>
                <button
                  onClick={() => setShowYamlDialog(false)}
                  className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
