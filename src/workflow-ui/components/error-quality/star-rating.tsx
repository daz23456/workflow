'use client';

import { Star } from 'lucide-react';

// ============================================================================
// Types
// ============================================================================

export interface StarRatingProps {
  /** Number of stars (0-5) */
  stars: number;
  /** Maximum stars (default 5) */
  maxStars?: number;
  /** Size of stars: 'sm', 'md', 'lg' */
  size?: 'sm' | 'md' | 'lg';
  /** Show numeric rating next to stars */
  showCount?: boolean;
  /** Additional CSS classes */
  className?: string;
}

// ============================================================================
// Star Rating Component
// ============================================================================

/**
 * Displays a star rating (0-5 stars) for error quality scores.
 * Filled stars are gold/yellow, empty stars are gray.
 */
export function StarRating({
  stars,
  maxStars = 5,
  size = 'md',
  showCount = false,
  className = '',
}: StarRatingProps) {
  const clampedStars = Math.max(0, Math.min(stars, maxStars));

  const sizeClasses = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5',
  };

  const textSizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  };

  const starArray = Array.from({ length: maxStars }, (_, i) => i < clampedStars);

  return (
    <div
      className={`inline-flex items-center gap-0.5 ${className}`}
      role="img"
      aria-label={`${clampedStars} out of ${maxStars} stars`}
      data-testid="star-rating"
    >
      {starArray.map((filled, index) => (
        <Star
          key={index}
          className={`${sizeClasses[size]} ${
            filled
              ? 'fill-yellow-400 text-yellow-400'
              : 'fill-gray-200 text-gray-300 dark:fill-gray-700 dark:text-gray-600'
          }`}
          aria-hidden="true"
          data-testid={`star-${index}-${filled ? 'filled' : 'empty'}`}
        />
      ))}
      {showCount && (
        <span
          className={`ml-1 text-gray-600 dark:text-gray-400 ${textSizeClasses[size]}`}
          data-testid="star-count"
        >
          ({clampedStars}/{maxStars})
        </span>
      )}
    </div>
  );
}

// ============================================================================
// Compact Star Rating (for cards/badges)
// ============================================================================

export interface CompactStarRatingProps {
  /** Number of stars (0-5) */
  stars: number;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Compact star rating display for cards/badges.
 * Shows filled star icon and numeric rating.
 */
export function CompactStarRating({ stars, className = '' }: CompactStarRatingProps) {
  const clampedStars = Math.max(0, Math.min(stars, 5));

  // Color based on rating
  const colorClass =
    clampedStars >= 4
      ? 'text-green-600 dark:text-green-400'
      : clampedStars >= 2
      ? 'text-yellow-600 dark:text-yellow-400'
      : 'text-red-600 dark:text-red-400';

  return (
    <div
      className={`inline-flex items-center gap-1 ${className}`}
      role="img"
      aria-label={`${clampedStars} out of 5 stars`}
      data-testid="compact-star-rating"
    >
      <Star className={`h-4 w-4 fill-current ${colorClass}`} aria-hidden="true" />
      <span className={`text-sm font-medium ${colorClass}`} data-testid="compact-star-value">
        {clampedStars}
      </span>
    </div>
  );
}
