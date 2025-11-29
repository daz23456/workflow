import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import {
  cn,
  formatDuration,
  getSuccessRateVariant,
  useDebounce,
  formatRelativeTime,
} from './utils';

describe('utils', () => {
  describe('cn', () => {
    it('merges class names correctly', () => {
      const result = cn('text-red-500', 'bg-blue-500');
      expect(result).toContain('text-red-500');
      expect(result).toContain('bg-blue-500');
    });

    it('handles conditional classes', () => {
      const isActive = true;
      const result = cn('base', isActive && 'active');
      expect(result).toContain('base');
      expect(result).toContain('active');
    });

    it('handles undefined and null', () => {
      const result = cn('text-red-500', undefined, null, 'bg-blue-500');
      expect(result).toContain('text-red-500');
      expect(result).toContain('bg-blue-500');
    });
  });

  describe('formatDuration', () => {
    it('formats milliseconds', () => {
      expect(formatDuration(500)).toBe('500ms');
      expect(formatDuration(999)).toBe('999ms');
    });

    it('formats seconds', () => {
      expect(formatDuration(1000)).toBe('1.0s');
      expect(formatDuration(2500)).toBe('2.5s');
      expect(formatDuration(5000)).toBe('5.0s');
    });

    it('formats minutes and seconds', () => {
      expect(formatDuration(60000)).toBe('1m 0s');
      expect(formatDuration(90000)).toBe('1m 30s');
      expect(formatDuration(125000)).toBe('2m 5s');
    });

    it('handles zero duration', () => {
      expect(formatDuration(0)).toBe('0ms');
    });

    it('handles very long durations', () => {
      expect(formatDuration(3661000)).toBe('61m 1s');
    });
  });

  describe('getSuccessRateVariant', () => {
    it('returns success variant for high success rates', () => {
      expect(getSuccessRateVariant(100)).toBe('success');
      expect(getSuccessRateVariant(95)).toBe('success');
      expect(getSuccessRateVariant(90)).toBe('success');
    });

    it('returns warning variant for medium success rates', () => {
      expect(getSuccessRateVariant(89)).toBe('warning');
      expect(getSuccessRateVariant(75)).toBe('warning');
      expect(getSuccessRateVariant(70)).toBe('warning');
    });

    it('returns destructive variant for low success rates', () => {
      expect(getSuccessRateVariant(69)).toBe('destructive');
      expect(getSuccessRateVariant(50)).toBe('destructive');
      expect(getSuccessRateVariant(0)).toBe('destructive');
    });
  });

  describe('useDebounce', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('returns initial value immediately', () => {
      const { result } = renderHook(() => useDebounce('hello', 500));
      expect(result.current).toBe('hello');
    });

    it('debounces value changes', () => {
      const { result, rerender } = renderHook(({ value, delay }) => useDebounce(value, delay), {
        initialProps: { value: 'initial', delay: 500 },
      });

      expect(result.current).toBe('initial');

      // Change value
      rerender({ value: 'updated', delay: 500 });

      // Value should not change immediately
      expect(result.current).toBe('initial');

      // Fast-forward time by 400ms (not enough)
      act(() => {
        vi.advanceTimersByTime(400);
      });

      expect(result.current).toBe('initial');

      // Fast-forward remaining 100ms
      act(() => {
        vi.advanceTimersByTime(100);
      });

      expect(result.current).toBe('updated');
    });

    it('resets timer on rapid changes', () => {
      const { result, rerender } = renderHook(({ value, delay }) => useDebounce(value, delay), {
        initialProps: { value: 'initial', delay: 500 },
      });

      rerender({ value: 'first', delay: 500 });
      act(() => {
        vi.advanceTimersByTime(300);
      });

      rerender({ value: 'second', delay: 500 });
      act(() => {
        vi.advanceTimersByTime(300);
      });

      // Should still be initial because timer keeps resetting
      expect(result.current).toBe('initial');

      // Now wait full delay
      act(() => {
        vi.advanceTimersByTime(200);
      });

      expect(result.current).toBe('second');
    });

    it('cleans up timeout on unmount', () => {
      const { unmount } = renderHook(() => useDebounce('value', 500));

      // Should not throw or cause issues
      unmount();
    });
  });

  describe('formatRelativeTime', () => {
    it('returns "just now" for times less than 10 seconds ago', () => {
      const now = Date.now();
      expect(formatRelativeTime(now)).toBe('just now');
      expect(formatRelativeTime(now - 5000)).toBe('just now'); // 5 seconds ago
      expect(formatRelativeTime(now - 9999)).toBe('just now'); // 9.999 seconds ago
    });

    it('returns seconds for times 10-59 seconds ago', () => {
      const now = Date.now();
      expect(formatRelativeTime(now - 10000)).toBe('10 seconds ago');
      expect(formatRelativeTime(now - 30000)).toBe('30 seconds ago');
      expect(formatRelativeTime(now - 59000)).toBe('59 seconds ago');
    });

    it('returns minutes for times 1-59 minutes ago', () => {
      const now = Date.now();
      expect(formatRelativeTime(now - 60000)).toBe('1 minute ago'); // 1 minute
      expect(formatRelativeTime(now - 120000)).toBe('2 minutes ago'); // 2 minutes
      expect(formatRelativeTime(now - 1800000)).toBe('30 minutes ago'); // 30 minutes
      expect(formatRelativeTime(now - 3540000)).toBe('59 minutes ago'); // 59 minutes
    });

    it('returns hours for times 1-23 hours ago', () => {
      const now = Date.now();
      expect(formatRelativeTime(now - 3600000)).toBe('1 hour ago'); // 1 hour
      expect(formatRelativeTime(now - 7200000)).toBe('2 hours ago'); // 2 hours
      expect(formatRelativeTime(now - 43200000)).toBe('12 hours ago'); // 12 hours
      expect(formatRelativeTime(now - 82800000)).toBe('23 hours ago'); // 23 hours
    });

    it('returns days for times 24+ hours ago', () => {
      const now = Date.now();
      expect(formatRelativeTime(now - 86400000)).toBe('1 day ago'); // 1 day
      expect(formatRelativeTime(now - 172800000)).toBe('2 days ago'); // 2 days
      expect(formatRelativeTime(now - 604800000)).toBe('7 days ago'); // 7 days
    });
  });
});
