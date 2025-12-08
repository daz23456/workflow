'use client';

import { CheckCircle, XCircle } from 'lucide-react';

// ============================================================================
// Types
// ============================================================================

export interface CriterionResult {
  /** The criterion enum value */
  criterion: string;
  /** Human-readable name */
  name: string;
  /** Whether the criterion was met */
  met: boolean;
  /** Details about why it was met/not met */
  details?: string;
  /** Tip for improvement if not met */
  tip?: string;
}

export interface QualityBreakdownProps {
  /** List of criteria results */
  criteria: CriterionResult[];
  /** Show compact version (no details) */
  compact?: boolean;
  /** Additional CSS classes */
  className?: string;
}

// ============================================================================
// Quality Criterion Row Component
// ============================================================================

interface CriterionRowProps {
  criterion: CriterionResult;
  compact: boolean;
}

function CriterionRow({ criterion, compact }: CriterionRowProps) {
  const { name, met, details, tip } = criterion;

  return (
    <div
      className={`flex items-start gap-2 py-1.5 ${
        !compact ? 'border-b border-gray-100 dark:border-gray-700 last:border-b-0' : ''
      }`}
      data-testid={`criterion-${criterion.criterion}`}
    >
      {met ? (
        <CheckCircle
          className="h-4 w-4 text-green-500 dark:text-green-400 flex-shrink-0 mt-0.5"
          aria-label="Criterion met"
        />
      ) : (
        <XCircle
          className="h-4 w-4 text-red-500 dark:text-red-400 flex-shrink-0 mt-0.5"
          aria-label="Criterion not met"
        />
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span
            className={`text-sm ${
              met
                ? 'text-gray-900 dark:text-gray-100'
                : 'text-gray-600 dark:text-gray-400'
            }`}
          >
            {name}
          </span>
          {met && (
            <span className="text-xs px-1.5 py-0.5 rounded bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">
              Met
            </span>
          )}
        </div>
        {!compact && (details || tip) && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {met ? details : tip || 'Not detected in response'}
          </p>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Quality Breakdown Component
// ============================================================================

/**
 * Displays a breakdown of quality criteria for an error response.
 * Shows which criteria were met/not met with optional details.
 */
export function QualityBreakdown({
  criteria,
  compact = false,
  className = '',
}: QualityBreakdownProps) {
  if (criteria.length === 0) {
    return (
      <div
        className={`text-sm text-gray-500 dark:text-gray-400 ${className}`}
        data-testid="quality-breakdown-empty"
      >
        No criteria data available
      </div>
    );
  }

  const metCount = criteria.filter((c) => c.met).length;

  return (
    <div className={className} data-testid="quality-breakdown">
      {/* Summary header */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Quality Criteria
        </span>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {metCount}/{criteria.length} met
        </span>
      </div>

      {/* Criteria list */}
      <div className={compact ? 'flex flex-wrap gap-2' : 'space-y-0'}>
        {compact ? (
          criteria.map((c) => (
            <div
              key={c.criterion}
              className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full ${
                c.met
                  ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
              }`}
              title={c.met ? c.details : c.tip}
              data-testid={`criterion-chip-${c.criterion}`}
            >
              {c.met ? (
                <CheckCircle className="h-3 w-3" aria-hidden="true" />
              ) : (
                <XCircle className="h-3 w-3" aria-hidden="true" />
              )}
              {c.name}
            </div>
          ))
        ) : (
          criteria.map((c) => <CriterionRow key={c.criterion} criterion={c} compact={compact} />)
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Quality Summary Bar Component
// ============================================================================

export interface QualitySummaryBarProps {
  /** Number of criteria met */
  metCount: number;
  /** Total number of criteria */
  totalCount: number;
  /** Additional CSS classes */
  className?: string;
}

/**
 * A simple progress bar showing criteria met vs total.
 */
export function QualitySummaryBar({ metCount, totalCount, className = '' }: QualitySummaryBarProps) {
  const percentage = totalCount > 0 ? (metCount / totalCount) * 100 : 0;

  const barColor =
    percentage >= 80
      ? 'bg-green-500'
      : percentage >= 40
      ? 'bg-yellow-500'
      : 'bg-red-500';

  return (
    <div className={`w-full ${className}`} data-testid="quality-summary-bar">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-gray-600 dark:text-gray-400">Quality</span>
        <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
          {metCount}/{totalCount}
        </span>
      </div>
      <div className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div
          className={`h-full ${barColor} transition-all duration-300`}
          style={{ width: `${percentage}%` }}
          role="progressbar"
          aria-valuenow={metCount}
          aria-valuemin={0}
          aria-valuemax={totalCount}
          aria-label={`${metCount} of ${totalCount} criteria met`}
        />
      </div>
    </div>
  );
}
