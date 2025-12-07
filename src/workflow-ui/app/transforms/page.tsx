/**
 * Transform Builder Page
 *
 * Visual transform pipeline builder with drag-and-drop operation palette.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { Download, RotateCcw, AlertTriangle, Check, Copy, Save } from 'lucide-react';
import { ReactFlowProvider } from '@xyflow/react';
import { JsonUploadPanel } from '@/components/transforms/json-upload-panel';
import { PipelineBuilder } from '@/components/transforms/pipeline-builder';
import { PreviewPanel } from '@/components/transforms/preview-panel';
import { PropertiesPanel } from '@/components/transforms/properties-panel';
import { OperationPalette } from '@/components/transforms/operation-palette';
import { useTransformBuilderStore } from '@/lib/stores/transform-builder-store';
import { transformToWorkflowTask } from '@/lib/adapters/transform-yaml-adapter';

export default function TransformsPage() {
  const { inputData, pipeline, reset, setInputData, executePreview, metadata, setMetadata } = useTransformBuilderStore();
  const [showYamlDialog, setShowYamlDialog] = useState(false);
  const [exportedYaml, setExportedYaml] = useState('');
  const [exportName, setExportName] = useState('');
  const [taskExists, setTaskExists] = useState<boolean | null>(null);
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

  // Check if a task with this name already exists on the server
  const checkTaskExists = useCallback(async (taskName: string): Promise<boolean> => {
    try {
      const response = await fetch(`/api/tasks/${encodeURIComponent(taskName)}`);
      return response.ok; // 200 = exists, 404 = doesn't exist
    } catch {
      return false; // On error, assume doesn't exist
    }
  }, []);

  const handleExport = async () => {
    const state = useTransformBuilderStore.getState();
    const dsl = state.toDsl();
    const name = state.metadata.name || 'my-transform';
    const description = state.metadata.description || 'Generated transform';
    const yaml = transformToWorkflowTask(dsl, name, description);

    setExportedYaml(yaml);
    setExportName(name);
    setTaskExists(null);
    setCopied(false);
    setShowYamlDialog(true);

    // Check if task exists on server
    setIsCheckingExists(true);
    try {
      const exists = await checkTaskExists(name);
      setTaskExists(exists);
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
    <main className="h-screen overflow-hidden bg-gray-50 flex flex-col">
      {/* Header - Fixed */}
      <div className="flex-shrink-0 px-4 py-3 border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            {hasData ? (
              <div className="flex items-center gap-4">
                <input
                  type="text"
                  value={metadata.name}
                  onChange={(e) => setMetadata({ name: e.target.value })}
                  placeholder="Transform name..."
                  className="text-lg font-bold text-gray-900 bg-transparent border-b-2 border-transparent hover:border-gray-300 focus:border-blue-500 focus:outline-none max-w-xs"
                />
                <input
                  type="text"
                  value={metadata.description}
                  onChange={(e) => setMetadata({ description: e.target.value })}
                  placeholder="Description..."
                  className="text-sm text-gray-600 bg-transparent border-b border-transparent hover:border-gray-200 focus:border-blue-400 focus:outline-none flex-1 max-w-md"
                />
              </div>
            ) : (
              <div>
                <h1 className="text-xl font-bold text-gray-900">Data Transform Assistant</h1>
              </div>
            )}
          </div>

          <div className="flex gap-2">
            {hasData && (
              <button
                onClick={handleReset}
                className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
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
            <section className="rounded-lg bg-white p-6 shadow max-w-2xl w-full">
              <h2 className="mb-4 text-lg font-semibold text-gray-900">Upload Sample JSON</h2>
              <JsonUploadPanel onUpload={handleUpload} />
            </section>
          </div>
        ) : (
          // Main Builder (shown when data is loaded)
          <div className="grid grid-cols-12 gap-3 h-full">
            {/* Left Column: Operation Palette */}
            <div className="col-span-2 h-full">
              <section className="rounded-lg bg-white shadow h-full flex flex-col overflow-hidden">
                <div className="flex-shrink-0 px-3 py-2 border-b border-gray-200">
                  <h2 className="text-sm font-semibold text-gray-900">Operations</h2>
                </div>
                <div className="flex-1 overflow-auto">
                  <OperationPalette />
                </div>
              </section>
            </div>

            {/* Pipeline Canvas */}
            <div className="col-span-4 h-full">
              <section className="rounded-lg bg-white shadow h-full flex flex-col overflow-hidden">
                <div className="flex-shrink-0 px-3 py-2 border-b border-gray-200">
                  <h2 className="text-sm font-semibold text-gray-900">Pipeline</h2>
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
              <section className="rounded-lg bg-white shadow h-full flex flex-col overflow-hidden">
                <div className="flex-shrink-0 px-3 py-2 border-b border-gray-200">
                  <h2 className="text-sm font-semibold text-gray-900">Configure</h2>
                </div>
                <div className="flex-1 overflow-auto">
                  <PropertiesPanel />
                </div>
              </section>
            </div>

            {/* Right Column: Preview */}
            <div className="col-span-3 h-full">
              <section className="rounded-lg bg-white shadow h-full flex flex-col overflow-hidden">
                <div className="flex-shrink-0 px-3 py-2 border-b border-gray-200">
                  <h2 className="text-sm font-semibold text-gray-900">Preview</h2>
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
            className="max-h-[80vh] w-full max-w-3xl overflow-auto rounded-lg bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-xl font-semibold text-gray-900">
                Export: {exportName}.yaml
              </h3>
              <button
                onClick={() => setShowYamlDialog(false)}
                className="text-gray-500 hover:text-gray-700"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            {/* Existence check warning */}
            {isCheckingExists && (
              <div className="mb-4 flex items-center gap-2 rounded-lg bg-gray-100 p-3 text-sm text-gray-600">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-400 border-t-transparent" />
                Checking if task exists on server...
              </div>
            )}

            {taskExists === true && (
              <div className="mb-4 flex items-center gap-2 rounded-lg bg-yellow-50 border border-yellow-200 p-3 text-sm text-yellow-800">
                <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0" />
                <div>
                  <strong>Warning:</strong> A task named &quot;{exportName}&quot; already exists on the server.
                  Saving this file will overwrite the existing task.
                </div>
              </div>
            )}

            {taskExists === false && (
              <div className="mb-4 flex items-center gap-2 rounded-lg bg-green-50 border border-green-200 p-3 text-sm text-green-800">
                <Check className="h-5 w-5 text-green-600 flex-shrink-0" />
                Task name is available. This will create a new task.
              </div>
            )}

            <pre className="overflow-auto rounded-lg bg-gray-50 p-4 text-sm font-mono text-gray-900 max-h-[40vh]">
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
                  className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
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
