/**
 * Preview Panel Component
 *
 * Side-by-side comparison of original input data vs transformed output data.
 */

'use client';

import { useState } from 'react';
import { AlertCircle, AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react';
import { useTransformBuilderStore } from '@/lib/stores/transform-builder-store';
import { cn } from '@/lib/utils';

type ViewMode = 'split' | 'input' | 'output';

export function PreviewPanel() {
  const { inputData, outputData, validation, pipeline } = useTransformBuilderStore();
  const [page, setPage] = useState(0);
  const [viewMode, setViewMode] = useState<ViewMode>('split');

  const pageSize = 3; // Fixed smaller page size for side-by-side
  const totalRecords = Math.max(inputData.length, outputData.length);
  const totalPages = Math.ceil(totalRecords / pageSize);
  const startIdx = page * pageSize;
  const endIdx = Math.min(startIdx + pageSize, totalRecords);

  const inputPage = inputData.slice(startIdx, endIdx);
  const outputPage = outputData.slice(startIdx, endIdx);

  const hasTransforms = pipeline.length > 0;

  return (
    <div className="h-full flex flex-col">
      {/* Header with view toggle */}
      <div className="flex-shrink-0 flex items-center justify-between mb-2">
        <div className="flex gap-1 bg-gray-100 p-0.5 rounded-lg">
          <button
            onClick={() => setViewMode('split')}
            className={cn(
              'px-2 py-1 text-xs font-medium rounded transition-colors',
              viewMode === 'split' ? 'bg-white shadow text-gray-900' : 'text-gray-600 hover:text-gray-900'
            )}
          >
            Split
          </button>
          <button
            onClick={() => setViewMode('input')}
            className={cn(
              'px-2 py-1 text-xs font-medium rounded transition-colors',
              viewMode === 'input' ? 'bg-white shadow text-gray-900' : 'text-gray-600 hover:text-gray-900'
            )}
          >
            Input
          </button>
          <button
            onClick={() => setViewMode('output')}
            className={cn(
              'px-2 py-1 text-xs font-medium rounded transition-colors',
              viewMode === 'output' ? 'bg-white shadow text-gray-900' : 'text-gray-600 hover:text-gray-900'
            )}
          >
            Output
          </button>
        </div>

        {/* Pagination */}
        {totalRecords > pageSize && (
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="p-1 rounded hover:bg-gray-100 disabled:opacity-50"
              aria-label="Previous"
            >
              <ChevronLeft className="w-3 h-3" />
            </button>
            <span className="text-xs text-gray-600">
              {startIdx + 1}-{endIdx}/{totalRecords}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="p-1 rounded hover:bg-gray-100 disabled:opacity-50"
              aria-label="Next"
            >
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>

      {/* Errors */}
      {validation.errors.length > 0 && (
        <div className="flex-shrink-0 flex items-start gap-2 p-2 mb-2 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1 text-xs text-red-900">
            {validation.errors.map((error, idx) => (
              <p key={idx}>{error}</p>
            ))}
          </div>
        </div>
      )}

      {/* Warnings */}
      {validation.warnings.length > 0 && (
        <div className="flex-shrink-0 flex items-start gap-2 p-2 mb-2 bg-yellow-50 border border-yellow-200 rounded-lg">
          <AlertTriangle className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1 text-xs text-yellow-900">
            {validation.warnings.map((warning, idx) => (
              <p key={idx}>{warning}</p>
            ))}
          </div>
        </div>
      )}

      {/* Data comparison */}
      <div className="flex-1 overflow-hidden">
        {totalRecords === 0 ? (
          <div className="h-full flex items-center justify-center text-gray-500 text-sm">
            <p>No data loaded</p>
          </div>
        ) : viewMode === 'split' ? (
          <div className="h-full grid grid-cols-2 gap-2">
            {/* Input column */}
            <div className="flex flex-col overflow-hidden">
              <div className="flex-shrink-0 text-xs font-medium text-gray-500 mb-1 px-1">
                Input ({inputData.length} records)
              </div>
              <div className="flex-1 bg-gray-50 rounded p-2 overflow-auto">
                <pre className="text-xs font-mono text-gray-700 whitespace-pre-wrap">
                  {JSON.stringify(inputPage, null, 2)}
                </pre>
              </div>
            </div>
            {/* Output column */}
            <div className="flex flex-col overflow-hidden">
              <div className="flex-shrink-0 text-xs font-medium text-gray-500 mb-1 px-1">
                Output {hasTransforms ? `(${outputData.length} records)` : '(no transforms)'}
              </div>
              <div className={cn(
                'flex-1 rounded p-2 overflow-auto',
                hasTransforms ? 'bg-green-50' : 'bg-gray-50'
              )}>
                <pre className="text-xs font-mono text-gray-700 whitespace-pre-wrap">
                  {hasTransforms
                    ? JSON.stringify(outputPage, null, 2)
                    : 'Add transforms to see output'
                  }
                </pre>
              </div>
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col overflow-hidden">
            <div className="flex-shrink-0 text-xs font-medium text-gray-500 mb-1 px-1">
              {viewMode === 'input' ? `Input (${inputData.length} records)` : `Output (${outputData.length} records)`}
            </div>
            <div className={cn(
              'flex-1 rounded p-2 overflow-auto',
              viewMode === 'output' && hasTransforms ? 'bg-green-50' : 'bg-gray-50'
            )}>
              <pre className="text-xs font-mono text-gray-700 whitespace-pre-wrap">
                {viewMode === 'input'
                  ? JSON.stringify(inputPage, null, 2)
                  : hasTransforms
                    ? JSON.stringify(outputPage, null, 2)
                    : 'Add transforms to see output'
                }
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
