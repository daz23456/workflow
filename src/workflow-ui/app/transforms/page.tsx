/**
 * Transform Builder Page
 *
 * Visual transform pipeline builder with drag-and-drop operation palette.
 */

'use client';

import { useState, useEffect } from 'react';
import { Download, RotateCcw } from 'lucide-react';
import { ReactFlowProvider } from '@xyflow/react';
import { JsonUploadPanel } from '@/components/transforms/json-upload-panel';
import { PipelineBuilder } from '@/components/transforms/pipeline-builder';
import { PreviewPanel } from '@/components/transforms/preview-panel';
import { OperationPalette } from '@/components/transforms/operation-palette';
import { useTransformBuilderStore } from '@/lib/stores/transform-builder-store';
import { transformToWorkflowTask } from '@/lib/adapters/transform-yaml-adapter';

export default function TransformsPage() {
  const { inputData, pipeline, reset, setInputData, executePreview } = useTransformBuilderStore();
  const [showYamlDialog, setShowYamlDialog] = useState(false);
  const [exportedYaml, setExportedYaml] = useState('');

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

  const handleExport = () => {
    const dsl = useTransformBuilderStore.getState().toDsl();
    const yaml = transformToWorkflowTask(dsl, 'my-transform', 'Generated transform');
    setExportedYaml(yaml);
    setShowYamlDialog(true);
  };

  const handleReset = () => {
    if (confirm('Reset the entire workflow? This cannot be undone.')) {
      reset();
    }
  };

  const hasData = inputData.length > 0;
  const hasOperations = pipeline.length > 0;

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Data Transform Assistant</h1>
            <p className="mt-2 text-gray-600">
              Build data transformations visually and export to Kubernetes CRDs
            </p>
          </div>

          <div className="flex gap-2">
            {hasData && (
              <button
                onClick={handleReset}
                className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                aria-label="Reset"
              >
                <RotateCcw className="h-4 w-4" />
                Reset
              </button>
            )}

            {hasOperations && (
              <button
                onClick={handleExport}
                className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                aria-label="Export YAML"
              >
                <Download className="h-4 w-4" />
                Export YAML
              </button>
            )}
          </div>
        </div>

        {/* Main Content */}
        {!hasData ? (
          // Upload Section (shown when no data)
          <div className="max-w-2xl mx-auto">
            <section className="rounded-lg bg-white p-6 shadow">
              <h2 className="mb-4 text-lg font-semibold text-gray-900">1. Upload Sample JSON</h2>
              <JsonUploadPanel onUpload={handleUpload} />
            </section>
          </div>
        ) : (
          // Main Builder (shown when data is loaded)
          <div className="grid grid-cols-12 gap-4 h-[calc(100vh-200px)]">
            {/* Left Column: Operation Palette */}
            <div className="col-span-3 xl:col-span-2">
              <section className="rounded-lg bg-white shadow h-full overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-200">
                  <h2 className="text-sm font-semibold text-gray-900">Operations</h2>
                </div>
                <div className="h-[calc(100%-48px)]">
                  <OperationPalette />
                </div>
              </section>
            </div>

            {/* Center Column: Pipeline Canvas */}
            <div className="col-span-5 xl:col-span-6">
              <section className="rounded-lg bg-white shadow h-full overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-200">
                  <h2 className="text-sm font-semibold text-gray-900">2. Build Pipeline</h2>
                </div>
                <div className="h-[calc(100%-48px)]">
                  <ReactFlowProvider>
                    <PipelineBuilder />
                  </ReactFlowProvider>
                </div>
              </section>
            </div>

            {/* Right Column: Preview */}
            <div className="col-span-4">
              <section className="rounded-lg bg-white shadow h-full overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-200">
                  <h2 className="text-sm font-semibold text-gray-900">Preview</h2>
                </div>
                <div className="h-[calc(100%-48px)] overflow-auto p-4">
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
              <h3 className="text-xl font-semibold text-gray-900">Exported YAML</h3>
              <button
                onClick={() => setShowYamlDialog(false)}
                className="text-gray-500 hover:text-gray-700"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <pre className="overflow-auto rounded-lg bg-gray-50 p-4 text-sm font-mono">
              {exportedYaml}
            </pre>

            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(exportedYaml);
                }}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                Copy to Clipboard
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
      )}
    </main>
  );
}
