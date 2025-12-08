'use client';

import { Star } from 'lucide-react';
import { StarRating, CompactStarRating } from './star-rating';

// ============================================================================
// Types
// ============================================================================

export interface QualityBadgeProps {
  /** Number of stars (0-5) */
  stars: number;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Show label text */
  showLabel?: boolean;
  /** Additional CSS classes */
  className?: string;
}

// ============================================================================
// Quality Badge Component
// ============================================================================

/**
 * A badge displaying the error quality rating.
 * Can be used on workflow/task cards for quick quality indication.
 */
export function QualityBadge({
  stars,
  size = 'md',
  showLabel = false,
  className = '',
}: QualityBadgeProps) {
  const clampedStars = Math.max(0, Math.min(stars, 5));

  // Color based on rating
  const bgColor =
    clampedStars >= 4
      ? 'bg-green-100 dark:bg-green-900/30'
      : clampedStars >= 2
      ? 'bg-yellow-100 dark:bg-yellow-900/30'
      : 'bg-red-100 dark:bg-red-900/30';

  const textColor =
    clampedStars >= 4
      ? 'text-green-700 dark:text-green-300'
      : clampedStars >= 2
      ? 'text-yellow-700 dark:text-yellow-300'
      : 'text-red-700 dark:text-red-300';

  const sizeClasses = {
    sm: 'px-1.5 py-0.5 text-xs gap-1',
    md: 'px-2 py-1 text-sm gap-1.5',
    lg: 'px-3 py-1.5 text-base gap-2',
  };

  const starSizes = {
    sm: 'h-3 w-3',
    md: 'h-3.5 w-3.5',
    lg: 'h-4 w-4',
  };

  return (
    <span
      className={`inline-flex items-center rounded-full font-medium ${bgColor} ${textColor} ${sizeClasses[size]} ${className}`}
      data-testid="quality-badge"
      role="status"
      aria-label={`Error quality: ${clampedStars} out of 5 stars`}
    >
      <Star className={`${starSizes[size]} fill-current`} aria-hidden="true" />
      <span data-testid="quality-badge-value">{clampedStars}</span>
      {showLabel && <span className="opacity-70">/5</span>}
    </span>
  );
}

// ============================================================================
// Quality Badge with Stars Component
// ============================================================================

export interface QualityBadgeWithStarsProps {
  /** Number of stars (0-5) */
  stars: number;
  /** Show full star display */
  showAllStars?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * A badge that shows the full star rating.
 */
export function QualityBadgeWithStars({
  stars,
  showAllStars = true,
  className = '',
}: QualityBadgeWithStarsProps) {
  const clampedStars = Math.max(0, Math.min(stars, 5));

  // Background color based on rating
  const bgColor =
    clampedStars >= 4
      ? 'bg-green-50 dark:bg-green-900/20'
      : clampedStars >= 2
      ? 'bg-yellow-50 dark:bg-yellow-900/20'
      : 'bg-red-50 dark:bg-red-900/20';

  return (
    <div
      className={`inline-flex items-center gap-2 px-2 py-1 rounded-lg ${bgColor} ${className}`}
      data-testid="quality-badge-with-stars"
    >
      {showAllStars ? (
        <StarRating stars={clampedStars} size="sm" />
      ) : (
        <CompactStarRating stars={clampedStars} />
      )}
    </div>
  );
}

// ============================================================================
// Quality Indicator Component (for lists/tables)
// ============================================================================

export interface QualityIndicatorProps {
  /** Number of stars (0-5) */
  stars: number;
  /** Label text (optional) */
  label?: string;
  /** Additional CSS classes */
  className?: string;
}

/**
 * A quality indicator for use in lists or tables.
 * Shows a colored dot and optional label.
 */
export function QualityIndicator({
  stars,
  label,
  className = '',
}: QualityIndicatorProps) {
  const clampedStars = Math.max(0, Math.min(stars, 5));

  // Dot color based on rating
  const dotColor =
    clampedStars >= 4
      ? 'bg-green-500'
      : clampedStars >= 2
      ? 'bg-yellow-500'
      : 'bg-red-500';

  const textColor =
    clampedStars >= 4
      ? 'text-green-600 dark:text-green-400'
      : clampedStars >= 2
      ? 'text-yellow-600 dark:text-yellow-400'
      : 'text-red-600 dark:text-red-400';

  const statusLabel =
    label ??
    (clampedStars >= 4 ? 'Good' : clampedStars >= 2 ? 'Fair' : 'Poor');

  return (
    <div
      className={`inline-flex items-center gap-1.5 ${className}`}
      data-testid="quality-indicator"
    >
      <span
        className={`w-2 h-2 rounded-full ${dotColor}`}
        aria-hidden="true"
      />
      <span className={`text-xs font-medium ${textColor}`}>
        {statusLabel}
      </span>
    </div>
  );
}
