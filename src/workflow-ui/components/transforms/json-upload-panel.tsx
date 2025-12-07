/**
 * JSON Upload Panel Component
 *
 * Handles JSON file uploads with drag-and-drop support.
 * Supports both arrays and objects with array properties.
 * Auto-detects array properties in objects for easy selection.
 */

'use client';

import { useState, useCallback, useRef } from 'react';
import { Upload, X, FileJson, AlertCircle, ChevronDown } from 'lucide-react';

interface ArrayProperty {
  path: string;
  count: number;
}

interface JsonUploadPanelProps {
  onUpload?: (data: unknown[], inputPath?: string) => void;
}

/**
 * Find all array properties in an object (one level deep)
 */
function findArrayProperties(obj: Record<string, unknown>): ArrayProperty[] {
  const arrays: ArrayProperty[] = [];
  for (const [key, value] of Object.entries(obj)) {
    if (Array.isArray(value)) {
      arrays.push({ path: `$.${key}`, count: value.length });
    }
  }
  return arrays;
}

export function JsonUploadPanel({ onUpload }: JsonUploadPanelProps) {
  const [fileName, setFileName] = useState<string>('');
  const [recordCount, setRecordCount] = useState<number>(0);
  const [error, setError] = useState<string>('');
  const [isDragging, setIsDragging] = useState(false);
  const [rawData, setRawData] = useState<unknown>(null);
  const [arrayProperties, setArrayProperties] = useState<ArrayProperty[]>([]);
  const [selectedPath, setSelectedPath] = useState<string>('');
  const [showPathSelector, setShowPathSelector] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSelectPath = useCallback(
    (path: string, data: unknown) => {
      setSelectedPath(path);
      setShowPathSelector(false);

      // Extract the array from the object
      const key = path.replace('$.', '');
      const arrayData = (data as Record<string, unknown>)[key] as unknown[];
      setRecordCount(arrayData.length);
      onUpload?.(arrayData, path);
    },
    [onUpload]
  );

  const processFile = useCallback(
    (file: File) => {
      setError('');
      setArrayProperties([]);
      setSelectedPath('');
      setShowPathSelector(false);
      setRawData(null);

      const reader = new FileReader();

      reader.onload = (event) => {
        try {
          const text = event.target?.result as string;
          const data = JSON.parse(text);

          // Case 1: Direct array - use as-is
          if (Array.isArray(data)) {
            setFileName(file.name);
            setRecordCount(data.length);
            setRawData(data);
            onUpload?.(data);
            return;
          }

          // Case 2: Object - look for array properties
          if (typeof data === 'object' && data !== null) {
            const arrays = findArrayProperties(data as Record<string, unknown>);

            if (arrays.length === 0) {
              setError('No array properties found in JSON object. Expected an array or an object with array properties (e.g., { "data": [...] })');
              return;
            }

            setFileName(file.name);
            setRawData(data);
            setArrayProperties(arrays);

            // Auto-select if only one array property
            if (arrays.length === 1) {
              handleSelectPath(arrays[0].path, data);
            } else {
              // Show selector for multiple options
              setShowPathSelector(true);
              setRecordCount(0);
            }
            return;
          }

          setError('Invalid JSON: Expected an array or object');
        } catch (err) {
          setError('Invalid JSON file');
        }
      };

      reader.onerror = () => {
        setError('Failed to read file');
      };

      reader.readAsText(file);
    },
    [onUpload, handleSelectPath]
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
    setRawData(null);
    setArrayProperties([]);
    setSelectedPath('');
    setShowPathSelector(false);
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
            ${isDragging ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30' : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'}
          `}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => fileInputRef.current?.click()}
        >
          <div className="flex flex-col items-center justify-center text-center">
            <Upload className="w-12 h-12 text-gray-400 dark:text-gray-500 mb-4" />
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">Drop JSON file here or click to browse</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Accepts .json files only</p>
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

      {/* Array Property Selector */}
      {showPathSelector && arrayProperties.length > 1 && (
        <div className="p-4 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg">
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">
            Multiple arrays found in JSON. Select which one to use:
          </p>
          <div className="space-y-2">
            {arrayProperties.map((prop) => (
              <button
                key={prop.path}
                onClick={() => handleSelectPath(prop.path, rawData)}
                className="w-full flex items-center justify-between p-3 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <code className="text-sm font-mono text-blue-600 dark:text-blue-400">{prop.path}</code>
                </div>
                <span className="text-xs text-gray-500 dark:text-gray-400">{prop.count} items</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* File Info */}
      {fileName && !error && !showPathSelector && (
        <div className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg">
          <div className="flex items-center gap-3">
            <FileJson className="w-5 h-5 text-green-600 dark:text-green-400" />
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{fileName}</p>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                {recordCount} records loaded
                {selectedPath && <span className="text-gray-400 dark:text-gray-500"> from {selectedPath}</span>}
              </p>
            </div>
          </div>
          <button
            onClick={handleClear}
            className="p-1 hover:bg-green-100 dark:hover:bg-green-900/50 rounded"
            aria-label="Clear upload"
          >
            <X className="w-4 h-4 text-gray-600 dark:text-gray-300" />
          </button>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg">
          <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
          <p className="text-sm text-red-900 dark:text-red-200">{error}</p>
        </div>
      )}
    </div>
  );
}
