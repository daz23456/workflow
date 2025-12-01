'use client';

import React from 'react';
import { HelpIcon } from './help-icon';
import type { HelpTopic } from '@/types/learning';

interface FieldWithHelpProps {
  label: string;
  helpTopic: HelpTopic;
  required?: boolean;
  error?: string;
  helpPosition?: 'top' | 'bottom' | 'left' | 'right';
  helpAlign?: 'start' | 'center' | 'end';
  children: React.ReactNode;
  className?: string;
}

/**
 * Wrapper component that adds contextual help to form fields.
 *
 * Usage:
 * ```tsx
 * <FieldWithHelp label="Workflow Name" helpTopic={HELP_TOPICS.workflowName}>
 *   <input type="text" ... />
 * </FieldWithHelp>
 * ```
 */
export function FieldWithHelp({
  label,
  helpTopic,
  required = false,
  error,
  helpPosition = 'top',
  helpAlign = 'center',
  children,
  className = '',
}: FieldWithHelpProps) {
  return (
    <div className={`space-y-1 ${className}`}>
      <div className="flex items-center gap-1.5">
        <label className="block text-sm font-medium text-gray-700">
          {label}
          {required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
        <HelpIcon
          topic={helpTopic}
          side={helpPosition}
          align={helpAlign}
        />
      </div>

      {children}

      {error && (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
