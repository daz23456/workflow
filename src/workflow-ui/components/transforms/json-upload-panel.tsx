/**
 * JSON Upload Panel Component
 *
 * Handles JSON file uploads with drag-and-drop support.
 * Validates JSON format and ensures data is an array.
 */

'use client';

import { useState, useCallback, useRef } from 'react';
import { Upload, X, FileJson, AlertCircle } from 'lucide-react';

interface JsonUploadPanelProps {
  onUpload?: (data: unknown[]) => void;
}

export function JsonUploadPanel({ onUpload }: JsonUploadPanelProps) {
  const [fileName, setFileName] = useState<string>('');
  const [recordCount, setRecordCount] = useState<number>(0);
  const [error, setError] = useState<string>('');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback(
    (file: File) => {
      setError('');

      const reader = new FileReader();

      reader.onload = (event) => {
        try {
          const text = event.target?.result as string;
          const data = JSON.parse(text);

          if (!Array.isArray(data)) {
            setError('JSON must be an array of records');
            return;
          }

          setFileName(file.name);
          setRecordCount(data.length);

          onUpload?.(data);
        } catch (err) {
          setError('Invalid JSON file');
        }
      };

      reader.onerror = () => {
        setError('Failed to read file');
      };

      reader.readAsText(file);
    },
    [onUpload]
  );

  const handleFileChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) {
        processFile(file);
      }
    },
    [processFile]
  );

  const handleDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      setIsDragging(false);

      const file = event.dataTransfer.files[0];
      if (file) {
        processFile(file);
      }
    },
    [processFile]
  );

  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleClear = useCallback(() => {
    setFileName('');
    setRecordCount(0);
    setError('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onUpload?.([]);
  }, [onUpload]);

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      {!fileName && (
        <div
          className={`
            border-2 border-dashed rounded-lg p-8
            transition-colors cursor-pointer
            ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}
          `}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => fileInputRef.current?.click()}
        >
          <div className="flex flex-col items-center justify-center text-center">
            <Upload className="w-12 h-12 text-gray-400 mb-4" />
            <p className="text-sm text-gray-600 mb-2">Drop JSON file here or click to browse</p>
            <p className="text-xs text-gray-500">Accepts .json files only</p>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            onChange={handleFileChange}
            className="hidden"
            aria-label="Upload JSON file"
          />
        </div>
      )}

      {/* File Info */}
      {fileName && !error && (
        <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center gap-3">
            <FileJson className="w-5 h-5 text-green-600" />
            <div>
              <p className="text-sm font-medium text-gray-900">{fileName}</p>
              <p className="text-xs text-gray-600">{recordCount} records loaded</p>
            </div>
          </div>
          <button
            onClick={handleClear}
            className="p-1 hover:bg-green-100 rounded"
            aria-label="Clear upload"
          >
            <X className="w-4 h-4 text-gray-600" />
          </button>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="w-5 h-5 text-red-600" />
          <p className="text-sm text-red-900">{error}</p>
        </div>
      )}
    </div>
  );
}
