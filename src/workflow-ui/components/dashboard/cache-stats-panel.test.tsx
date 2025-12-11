import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CacheStatsPanel, CacheStatsPanelContent, CacheStatsPanelSkeleton } from './cache-stats-panel';
import type { CacheStats } from '@/lib/api/types';

// Mock the API queries
vi.mock('@/lib/api/queries', () => ({
  useCacheStats: vi.fn(),
  useInvalidateCache: vi.fn(),
  useClearCache: vi.fn(),
}));

import { useCacheStats, useInvalidateCache, useClearCache } from '@/lib/api/queries';

const mockCacheStats: CacheStats = {
  totalHits: 1250,
  totalMisses: 320,
  hitRatio: 0.796,
  totalEntries: 45,
  memoryUsageBytes: 2457600,
  oldestEntryAge: '2h 15m',
  recentKeys: [
    { key: 'task:get-user|GET|/api/users/123|', hits: 42, lastAccess: '2m ago' },
    { key: 'task:validate|GET|/api/validate|abc123', hits: 15, lastAccess: '5m ago' },
    { key: 'task:fetch-data|GET|/api/data|', hits: 8, lastAccess: '12m ago' },
  ],
  generatedAt: new Date().toISOString(),
};

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe('CacheStatsPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('CacheStatsPanelSkeleton', () => {
    it('renders loading skeleton', () => {
      render(<CacheStatsPanelSkeleton />);
      expect(screen.getByTestId('cache-stats-skeleton')).toBeInTheDocument();
    });
  });

  describe('CacheStatsPanelContent', () => {
    it('renders cache statistics correctly', () => {
      render(<CacheStatsPanelContent data={mockCacheStats} />);

      expect(screen.getByTestId('cache-stats-panel')).toBeInTheDocument();
      expect(screen.getByText('Task Cache')).toBeInTheDocument();
    });

    it('displays hit ratio as percentage', () => {
      render(<CacheStatsPanelContent data={mockCacheStats} />);

      expect(screen.getByTestId('hit-ratio')).toHaveTextContent('79.6%');
    });

    it('displays total hits count', () => {
      render(<CacheStatsPanelContent data={mockCacheStats} />);

      expect(screen.getByTestId('total-hits')).toHaveTextContent('1,250');
    });

    it('displays total misses count', () => {
      render(<CacheStatsPanelContent data={mockCacheStats} />);

      expect(screen.getByTestId('total-misses')).toHaveTextContent('320');
    });

    it('displays total entries count', () => {
      render(<CacheStatsPanelContent data={mockCacheStats} />);

      expect(screen.getByTestId('total-entries')).toHaveTextContent('45');
    });

    it('displays memory usage in human-readable format', () => {
      render(<CacheStatsPanelContent data={mockCacheStats} />);

      expect(screen.getByTestId('memory-usage')).toHaveTextContent('2.3 MB');
    });

    it('renders recent cache keys list', () => {
      render(<CacheStatsPanelContent data={mockCacheStats} />);

      expect(screen.getByTestId('recent-keys-list')).toBeInTheDocument();
      expect(screen.getAllByTestId(/^cache-key-/)).toHaveLength(3);
    });

    it('shows invalidate button for each cache key', () => {
      const onInvalidate = vi.fn();
      render(<CacheStatsPanelContent data={mockCacheStats} onInvalidate={onInvalidate} />);

      const invalidateButtons = screen.getAllByRole('button', { name: /invalidate/i });
      expect(invalidateButtons).toHaveLength(3);
    });

    it('calls onInvalidate when invalidate button is clicked', () => {
      const onInvalidate = vi.fn();
      render(<CacheStatsPanelContent data={mockCacheStats} onInvalidate={onInvalidate} />);

      const invalidateButtons = screen.getAllByRole('button', { name: /invalidate/i });
      fireEvent.click(invalidateButtons[0]);

      expect(onInvalidate).toHaveBeenCalledWith('task:get-user|GET|/api/users/123|');
    });

    it('shows clear all button', () => {
      const onClearAll = vi.fn();
      render(<CacheStatsPanelContent data={mockCacheStats} onClearAll={onClearAll} />);

      expect(screen.getByRole('button', { name: /clear all/i })).toBeInTheDocument();
    });

    it('calls onClearAll when clear all button is clicked', () => {
      const onClearAll = vi.fn();
      render(<CacheStatsPanelContent data={mockCacheStats} onClearAll={onClearAll} />);

      fireEvent.click(screen.getByRole('button', { name: /clear all/i }));

      expect(onClearAll).toHaveBeenCalled();
    });

    it('displays last updated timestamp', () => {
      render(<CacheStatsPanelContent data={mockCacheStats} />);

      expect(screen.getByTestId('last-updated')).toBeInTheDocument();
    });

    it('shows empty state when no cache entries', () => {
      const emptyStats: CacheStats = {
        ...mockCacheStats,
        totalEntries: 0,
        recentKeys: [],
      };

      render(<CacheStatsPanelContent data={emptyStats} />);

      expect(screen.getByTestId('empty-cache-message')).toBeInTheDocument();
    });
  });

  describe('CacheStatsPanel (connected)', () => {
    it('shows skeleton while loading', () => {
      vi.mocked(useCacheStats).mockReturnValue({
        data: undefined,
        isLoading: true,
        refetch: vi.fn(),
        isFetching: false,
      } as any);

      render(<CacheStatsPanel />, { wrapper: createWrapper() });

      expect(screen.getByTestId('cache-stats-skeleton')).toBeInTheDocument();
    });

    it('renders stats when loaded', async () => {
      vi.mocked(useCacheStats).mockReturnValue({
        data: mockCacheStats,
        isLoading: false,
        refetch: vi.fn(),
        isFetching: false,
      } as any);

      vi.mocked(useInvalidateCache).mockReturnValue({
        mutate: vi.fn(),
        isPending: false,
      } as any);

      vi.mocked(useClearCache).mockReturnValue({
        mutate: vi.fn(),
        isPending: false,
      } as any);

      render(<CacheStatsPanel />, { wrapper: createWrapper() });

      expect(screen.getByTestId('cache-stats-panel')).toBeInTheDocument();
      expect(screen.getByText('Task Cache')).toBeInTheDocument();
    });

    it('triggers refetch when refresh button clicked', async () => {
      const refetch = vi.fn();
      vi.mocked(useCacheStats).mockReturnValue({
        data: mockCacheStats,
        isLoading: false,
        refetch,
        isFetching: false,
      } as any);

      vi.mocked(useInvalidateCache).mockReturnValue({
        mutate: vi.fn(),
        isPending: false,
      } as any);

      vi.mocked(useClearCache).mockReturnValue({
        mutate: vi.fn(),
        isPending: false,
      } as any);

      render(<CacheStatsPanel />, { wrapper: createWrapper() });

      fireEvent.click(screen.getByTestId('refresh-button'));

      expect(refetch).toHaveBeenCalled();
    });
  });
});
