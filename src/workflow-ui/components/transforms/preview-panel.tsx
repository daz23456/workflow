/**
 * Preview Panel Component
 */

'use client';

import { useState } from 'react';
import { AlertCircle, AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react';
import { useTransformBuilderStore } from '@/lib/stores/transform-builder-store';

export function PreviewPanel() {
  const { outputData, validation } = useTransformBuilderStore();
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  const totalRecords = outputData.length;
  const totalPages = Math.ceil(totalRecords / pageSize);
  const startIdx = page * pageSize;
  const endIdx = Math.min(startIdx + pageSize, totalRecords);
  const pageData = outputData.slice(startIdx, endIdx);

  return (
    <div className="h-full flex flex-col space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Preview</h3>
          <p className="text-sm text-gray-600">
            {totalRecords} record{totalRecords !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Pagination Controls */}
        {totalRecords > 0 && (
          <div className="flex items-center gap-2">
            <label htmlFor="page-size" className="text-sm text-gray-700">
              Page size:
            </label>
            <select
              id="page-size"
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(0);
              }}
              className="px-2 py-1 border border-gray-300 rounded text-sm"
              aria-label="Page size"
            >
              <option value="10">10</option>
              <option value="25">25</option>
              <option value="50">50</option>
              <option value="100">100</option>
            </select>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="p-1 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Previous"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <span className="text-sm text-gray-700 px-2">
                Showing {startIdx + 1}-{endIdx} of {totalRecords}
              </span>

              <button
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="p-1 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Next"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Errors */}
      {validation.errors.length > 0 && (
        <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            {validation.errors.map((error, idx) => (
              <p key={idx} className="text-sm text-red-900">
                {error}
              </p>
            ))}
          </div>
        </div>
      )}

      {/* Warnings */}
      {validation.warnings.length > 0 && (
        <div className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            {validation.warnings.map((warning, idx) => (
              <p key={idx} className="text-sm text-yellow-900">
                {warning}
              </p>
            ))}
          </div>
        </div>
      )}

      {/* Output Data */}
      <div className="flex-1 overflow-auto">
        {totalRecords === 0 ? (
          <div className="h-full flex items-center justify-center text-gray-500">
            <p>No preview data available</p>
          </div>
        ) : (
          <pre className="bg-gray-50 rounded-lg p-4 text-sm font-mono overflow-auto">
            {JSON.stringify(pageData, null, 2)}
          </pre>
        )}
      </div>
    </div>
  );
}
