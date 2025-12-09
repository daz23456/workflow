'use client';

import { useEffect, useRef } from 'react';
import { ExecutionInputForm } from './execution-input-form';

interface ExecuteModalProps {
  isOpen: boolean;
  onClose: () => void;
  workflowName: string;
  schema: {
    type: string;
    properties?: Record<string, any>;
    required?: string[];
  };
  onExecute: (input: Record<string, any>) => Promise<void>;
  onTest?: (input: Record<string, any>) => Promise<void>;
  mode: 'execute' | 'test';
}

export function ExecuteModal({
  isOpen,
  onClose,
  workflowName,
  schema,
  onExecute,
  onTest,
  mode,
}: ExecuteModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  // Handle click outside
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (data: Record<string, any>) => {
    // onExecute handles errors internally and shows result panel
    // Just close modal after, whether success or error
    await onExecute(data);
    onClose();
  };

  const handleTest = async (data: Record<string, any>) => {
    if (onTest) {
      // onTest handles errors internally and shows result panel
      await onTest(data);
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div
        ref={modalRef}
        className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4 max-h-[90vh] overflow-auto"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 id="modal-title" className="text-lg font-semibold text-gray-900">
            {mode === 'execute' ? 'Execute' : 'Test'} {workflowName}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close modal"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6">
          {mode === 'execute' ? (
            <ExecutionInputForm
              schema={schema}
              onSubmit={handleSubmit}
              submitLabel="Execute"
            />
          ) : (
            <ExecutionInputForm
              schema={schema}
              onSubmit={handleTest}
              submitLabel="Test (Dry-run)"
            />
          )}
        </div>
      </div>
    </div>
  );
}
