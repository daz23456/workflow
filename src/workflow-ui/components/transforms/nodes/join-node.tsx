/**
 * Join Node Component
 */

'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import { Upload, FileJson, X, AlertCircle } from 'lucide-react';
import { useTransformBuilderStore } from '@/lib/stores/transform-builder-store';
import type { JoinOperation } from '@/lib/types/transform-dsl';

interface JoinNodeProps {
  operationIndex: number;
}

/**
 * Extract field names from an object, handling nested objects
 */
function extractFieldPaths(obj: unknown, prefix = '$'): string[] {
  if (typeof obj !== 'object' || obj === null) {
    return [];
  }

  const paths: string[] = [];
  for (const [key, value] of Object.entries(obj)) {
    const path = `${prefix}.${key}`;
    paths.push(path);

    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      for (const nestedKey of Object.keys(value)) {
        paths.push(`${path}.${nestedKey}`);
      }
    }
  }
  return paths;
}

export function JoinNode({ operationIndex }: JoinNodeProps) {
  const { pipeline, updateOperation, inputData } = useTransformBuilderStore();
  const operation = pipeline[operationIndex] as JoinOperation | undefined;

  // State for right dataset upload
  const [rightFileName, setRightFileName] = useState<string>('');
  const [uploadError, setUploadError] = useState<string>('');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Extract available fields from input data (left side)
  const availableFields = useMemo(() => {
    if (inputData.length === 0) return [];
    return extractFieldPaths(inputData[0]);
  }, [inputData]);

  // Extract available fields from right data
  const rightAvailableFields = useMemo(() => {
    if (!operation?.rightData || operation.rightData.length === 0) return [];
    return extractFieldPaths(operation.rightData[0]);
  }, [operation?.rightData]);

  // Process uploaded file for right dataset
  const processRightDataFile = useCallback(
    (file: File) => {
      setUploadError('');

      const reader = new FileReader();

      reader.onload = (event) => {
        try {
          const text = event.target?.result as string;
          const data = JSON.parse(text);

          // Must be an array
          if (Array.isArray(data)) {
            setRightFileName(file.name);
            updateOperation(operationIndex, { rightData: data });
            return;
          }

          // Check for array properties in object
          if (typeof data === 'object' && data !== null) {
            for (const [key, value] of Object.entries(data)) {
              if (Array.isArray(value)) {
                setRightFileName(`${file.name} ($.${key})`);
                updateOperation(operationIndex, { rightData: value as unknown[] });
                return;
              }
            }
          }

          setUploadError('JSON must contain an array');
        } catch {
          setUploadError('Invalid JSON file');
        }
      };

      reader.onerror = () => {
        setUploadError('Failed to read file');
      };

      reader.readAsText(file);
    },
    [operationIndex, updateOperation]
  );

  const handleFileChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) {
        processRightDataFile(file);
      }
    },
    [processRightDataFile]
  );

  const handleDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      setIsDragging(false);

      const file = event.dataTransfer.files[0];
      if (file) {
        processRightDataFile(file);
      }
    },
    [processRightDataFile]
  );

  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleClearRightData = useCallback(() => {
    setRightFileName('');
    setUploadError('');
    updateOperation(operationIndex, { rightData: [] });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [operationIndex, updateOperation]);

  // Quick select a field for the left key
  const handleQuickSelectLeftKey = useCallback(
    (fieldPath: string) => {
      updateOperation(operationIndex, { leftKey: fieldPath });
    },
    [operationIndex, updateOperation]
  );

  // Quick select a field for the right key
  const handleQuickSelectRightKey = useCallback(
    (fieldPath: string) => {
      updateOperation(operationIndex, { rightKey: fieldPath });
    },
    [operationIndex, updateOperation]
  );

  const handleJoinTypeChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      updateOperation(operationIndex, {
        joinType: e.target.value as 'inner' | 'left' | 'right' | 'outer',
      });
    },
    [operationIndex, updateOperation]
  );

  const handleLeftKeyChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      updateOperation(operationIndex, { leftKey: e.target.value });
    },
    [operationIndex, updateOperation]
  );

  const handleRightKeyChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      updateOperation(operationIndex, { rightKey: e.target.value });
    },
    [operationIndex, updateOperation]
  );

  if (!operation) {
    return (
      <div className="p-4 text-red-600">
        <p>Operation not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-gray-900">Join</h3>
        <p className="text-sm text-gray-600">Join with another dataset</p>
      </div>

      {/* Join Type */}
      <div>
        <label
          htmlFor={`join-type-${operationIndex}`}
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Join Type
        </label>
        <select
          id={`join-type-${operationIndex}`}
          value={operation.joinType}
          onChange={handleJoinTypeChange}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
          aria-label="Join type"
        >
          <option value="inner">Inner Join</option>
          <option value="left">Left Join</option>
          <option value="right">Right Join</option>
          <option value="outer">Outer Join</option>
        </select>
      </div>

      {/* Left Side (from pipeline input) */}
      <div className="border border-gray-200 rounded-lg p-3 space-y-3">
        <h4 className="text-sm font-semibold text-gray-800">Left Dataset (Pipeline Input)</h4>

        {/* Available Fields - Quick Select for Left Key */}
        {availableFields.length > 0 && (
          <div className="bg-blue-50 rounded-lg p-2">
            <p className="text-xs font-medium text-blue-800 mb-2">
              Available fields ({availableFields.length}):
            </p>
            <div className="flex flex-wrap gap-1">
              {availableFields.map((field) => {
                const isSelected = operation.leftKey === field;
                return (
                  <button
                    key={field}
                    onClick={() => handleQuickSelectLeftKey(field)}
                    className={`px-2 py-1 text-xs font-mono rounded transition-colors ${
                      isSelected
                        ? 'bg-blue-600 text-white'
                        : 'bg-white text-blue-700 hover:bg-blue-100 border border-blue-200'
                    }`}
                  >
                    {field.replace('$.', '')}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div>
          <label
            htmlFor={`join-left-${operationIndex}`}
            className="block text-xs font-medium text-gray-700 mb-1"
          >
            Left Key (JSONPath)
          </label>
          <input
            id={`join-left-${operationIndex}`}
            type="text"
            value={operation.leftKey}
            onChange={handleLeftKeyChange}
            className="w-full px-2 py-1 border border-gray-300 rounded-md font-mono text-sm text-gray-900"
            placeholder="$.id"
            aria-label="Left key"
          />
        </div>
      </div>

      {/* Right Side (uploaded dataset) */}
      <div className="border border-gray-200 rounded-lg p-3 space-y-3">
        <h4 className="text-sm font-semibold text-gray-800">Right Dataset (Upload JSON)</h4>

        {/* Upload Area or File Info */}
        {!rightFileName && !operation.rightData?.length ? (
          <div
            className={`
              border-2 border-dashed rounded-lg p-4
              transition-colors cursor-pointer
              ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}
            `}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="flex flex-col items-center justify-center text-center">
              <Upload className="w-8 h-8 text-gray-400 mb-2" />
              <p className="text-xs text-gray-600">Drop JSON or click to upload</p>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              onChange={handleFileChange}
              className="hidden"
              aria-label="Upload right dataset JSON file"
            />
          </div>
        ) : (
          <div className="flex items-center justify-between p-2 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-2">
              <FileJson className="w-4 h-4 text-green-600" />
              <div>
                <p className="text-xs font-medium text-gray-900">
                  {rightFileName || 'Right dataset'}
                </p>
                <p className="text-xs text-gray-600">
                  {operation.rightData?.length || 0} records
                </p>
              </div>
            </div>
            <button
              onClick={handleClearRightData}
              className="p-1 hover:bg-green-100 rounded"
              aria-label="Clear right dataset"
            >
              <X className="w-4 h-4 text-gray-600" />
            </button>
          </div>
        )}

        {/* Upload Error */}
        {uploadError && (
          <div className="flex items-center gap-2 p-2 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle className="w-4 h-4 text-red-600" />
            <p className="text-xs text-red-900">{uploadError}</p>
          </div>
        )}

        {/* Available Fields - Quick Select for Right Key */}
        {rightAvailableFields.length > 0 && (
          <div className="bg-purple-50 rounded-lg p-2">
            <p className="text-xs font-medium text-purple-800 mb-2">
              Available fields ({rightAvailableFields.length}):
            </p>
            <div className="flex flex-wrap gap-1">
              {rightAvailableFields.map((field) => {
                const isSelected = operation.rightKey === field;
                return (
                  <button
                    key={field}
                    onClick={() => handleQuickSelectRightKey(field)}
                    className={`px-2 py-1 text-xs font-mono rounded transition-colors ${
                      isSelected
                        ? 'bg-purple-600 text-white'
                        : 'bg-white text-purple-700 hover:bg-purple-100 border border-purple-200'
                    }`}
                  >
                    {field.replace('$.', '')}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div>
          <label
            htmlFor={`join-right-${operationIndex}`}
            className="block text-xs font-medium text-gray-700 mb-1"
          >
            Right Key (JSONPath)
          </label>
          <input
            id={`join-right-${operationIndex}`}
            type="text"
            value={operation.rightKey}
            onChange={handleRightKeyChange}
            className="w-full px-2 py-1 border border-gray-300 rounded-md font-mono text-sm text-gray-900"
            placeholder="$.userId"
            aria-label="Right key"
          />
        </div>
      </div>

      {/* Status Summary */}
      <div className="bg-gray-50 rounded-lg p-3 text-sm">
        <p className="text-gray-700">
          {operation.rightData?.length ? (
            <>
              Will perform <strong>{operation.joinType}</strong> join on{' '}
              <code className="bg-white px-1 rounded">{operation.leftKey || '?'}</code> ={' '}
              <code className="bg-white px-1 rounded">{operation.rightKey || '?'}</code>
              {' '}with <strong>{operation.rightData.length}</strong> right records
            </>
          ) : (
            <span className="text-orange-600">Upload a right dataset to enable join</span>
          )}
        </p>
      </div>
    </div>
  );
}
