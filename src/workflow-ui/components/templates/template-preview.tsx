'use client';

import { X, Download, Play } from 'lucide-react';
import { useTemplateDetail } from '@/lib/api/queries';
import { TemplateCategoryInfo, TemplateDifficultyInfo } from '@/types/template';

interface TemplatePreviewProps {
  templateName: string;
  onClose: () => void;
  onDeploy: () => void;
}

export function TemplatePreview({ templateName, onClose, onDeploy }: TemplatePreviewProps) {
  const { data: template, isLoading, error } = useTemplateDetail(templateName);

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleDownloadYaml = () => {
    if (!template) return;

    const blob = new Blob([template.yamlDefinition], { type: 'text/yaml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${template.name}.yaml`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex-1">
            {isLoading ? (
              <div className="h-6 w-48 bg-gray-200 animate-pulse rounded" />
            ) : error ? (
              <h2 className="text-xl font-bold text-red-600">Error Loading Template</h2>
            ) : template ? (
              <div>
                <h2 className="text-xl font-bold text-gray-900">{template.name}</h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`text-xs px-2 py-1 rounded-full bg-${TemplateCategoryInfo[template.category].color}-100 text-${TemplateCategoryInfo[template.category].color}-700`}>
                    {TemplateCategoryInfo[template.category].label}
                  </span>
                  <span className={`text-xs px-2 py-1 rounded-full bg-${TemplateDifficultyInfo[template.difficulty].color}-100 text-${TemplateDifficultyInfo[template.difficulty].color}-700`}>
                    {TemplateDifficultyInfo[template.difficulty].label}
                  </span>
                </div>
              </div>
            ) : null}
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            aria-label="Close preview"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="space-y-4">
              <div className="h-4 bg-gray-200 animate-pulse rounded w-3/4" />
              <div className="h-4 bg-gray-200 animate-pulse rounded w-full" />
              <div className="h-4 bg-gray-200 animate-pulse rounded w-5/6" />
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <p className="text-red-600 mb-2">Failed to load template</p>
              <p className="text-sm text-gray-500">
                {error instanceof Error ? error.message : 'Unknown error'}
              </p>
            </div>
          ) : template ? (
            <div>
              {/* Description */}
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Description</h3>
                <p className="text-sm text-gray-600">{template.description}</p>
              </div>

              {/* Metadata */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <h4 className="text-xs font-semibold text-gray-500 uppercase mb-1">
                    Setup Time
                  </h4>
                  <p className="text-sm text-gray-900">{template.estimatedSetupTime} minutes</p>
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-gray-500 uppercase mb-1">
                    Task Count
                  </h4>
                  <p className="text-sm text-gray-900">{template.taskCount} tasks</p>
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-gray-500 uppercase mb-1">
                    Execution Mode
                  </h4>
                  <p className="text-sm text-gray-900">
                    {template.hasParallelExecution ? 'Parallel' : 'Sequential'}
                  </p>
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-gray-500 uppercase mb-1">
                    Namespace
                  </h4>
                  <p className="text-sm text-gray-900">{template.namespace}</p>
                </div>
              </div>

              {/* Tags */}
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {template.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              {/* YAML Definition */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-gray-700">YAML Definition</h3>
                  <button
                    onClick={handleDownloadYaml}
                    className="text-xs px-3 py-1 border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition-colors flex items-center gap-1"
                  >
                    <Download className="w-3 h-3" />
                    Download
                  </button>
                </div>
                <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-xs">
                  <code>{template.yamlDefinition}</code>
                </pre>
              </div>
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
          >
            Close
          </button>
          <button
            onClick={() => {
              onDeploy();
              onClose();
            }}
            disabled={!template || isLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Play className="w-4 h-4" />
            Deploy Template
          </button>
        </div>
      </div>
    </div>
  );
}
