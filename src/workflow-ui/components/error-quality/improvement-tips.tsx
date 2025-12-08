'use client';

import { Lightbulb, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';

// ============================================================================
// Types
// ============================================================================

export interface ImprovementTipsProps {
  /** List of improvement tips */
  tips: string[];
  /** Maximum tips to show before collapse */
  maxVisible?: number;
  /** Additional CSS classes */
  className?: string;
}

// ============================================================================
// Improvement Tips Component
// ============================================================================

/**
 * Displays a list of improvement tips for error response quality.
 * Tips are collapsible if there are many.
 */
export function ImprovementTips({
  tips,
  maxVisible = 3,
  className = '',
}: ImprovementTipsProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (tips.length === 0) {
    return (
      <div
        className={`text-sm text-green-600 dark:text-green-400 flex items-center gap-2 ${className}`}
        data-testid="improvement-tips-none"
      >
        <Lightbulb className="h-4 w-4" aria-hidden="true" />
        <span>No improvements needed - all criteria met!</span>
      </div>
    );
  }

  const visibleTips = isExpanded ? tips : tips.slice(0, maxVisible);
  const hasMore = tips.length > maxVisible;

  return (
    <div className={className} data-testid="improvement-tips">
      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <Lightbulb className="h-4 w-4 text-yellow-500 dark:text-yellow-400" aria-hidden="true" />
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Suggestions for Improvement
        </span>
        <span className="text-xs text-gray-500 dark:text-gray-400">({tips.length})</span>
      </div>

      {/* Tips list */}
      <ul className="space-y-1.5" data-testid="tips-list">
        {visibleTips.map((tip, index) => (
          <li
            key={index}
            className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400"
            data-testid={`tip-${index}`}
          >
            <span className="text-yellow-500 dark:text-yellow-400 mt-1">-</span>
            <span>{tip}</span>
          </li>
        ))}
      </ul>

      {/* Show more/less button */}
      {hasMore && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="mt-2 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 flex items-center gap-1"
          data-testid="toggle-tips"
        >
          {isExpanded ? (
            <>
              <ChevronUp className="h-3 w-3" aria-hidden="true" />
              Show less
            </>
          ) : (
            <>
              <ChevronDown className="h-3 w-3" aria-hidden="true" />
              Show {tips.length - maxVisible} more
            </>
          )}
        </button>
      )}
    </div>
  );
}

// ============================================================================
// Single Tip Component (for inline use)
// ============================================================================

export interface SingleTipProps {
  /** The tip text */
  tip: string;
  /** Additional CSS classes */
  className?: string;
}

/**
 * A single improvement tip with lightbulb icon.
 */
export function SingleTip({ tip, className = '' }: SingleTipProps) {
  return (
    <div
      className={`flex items-start gap-2 text-sm ${className}`}
      data-testid="single-tip"
    >
      <Lightbulb
        className="h-4 w-4 text-yellow-500 dark:text-yellow-400 flex-shrink-0 mt-0.5"
        aria-hidden="true"
      />
      <span className="text-gray-600 dark:text-gray-400">{tip}</span>
    </div>
  );
}

// ============================================================================
// Tips Badge Component (for cards)
// ============================================================================

export interface TipsBadgeProps {
  /** Number of improvement tips */
  count: number;
  /** Additional CSS classes */
  className?: string;
}

/**
 * A compact badge showing the number of improvement tips.
 */
export function TipsBadge({ count, className = '' }: TipsBadgeProps) {
  if (count === 0) {
    return (
      <span
        className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 ${className}`}
        data-testid="tips-badge-none"
      >
        <Lightbulb className="h-3 w-3" aria-hidden="true" />
        Perfect
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 ${className}`}
      data-testid="tips-badge"
    >
      <Lightbulb className="h-3 w-3" aria-hidden="true" />
      {count} {count === 1 ? 'tip' : 'tips'}
    </span>
  );
}
