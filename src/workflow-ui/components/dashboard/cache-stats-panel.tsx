'use client';

import { useState } from 'react';
import { RefreshCw, Database, Trash2, X } from 'lucide-react';
import { useCacheStats, useInvalidateCache, useClearCache } from '@/lib/api/queries';
import type { CacheStats } from '@/lib/api/types';

// ============================================================================
// Utility Functions
// ============================================================================

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function formatNumber(num: number): string {
  return num.toLocaleString();
}

function formatPercent(ratio: number): string {
  return `${(ratio * 100).toFixed(1)}%`;
}

// ============================================================================
// Stat Card Component
// ============================================================================

interface StatCardProps {
  label: string;
  value: string;
  testId: string;
  variant?: 'default' | 'success' | 'warning';
}

function StatCard({ label, value, testId, variant = 'default' }: StatCardProps) {
  const variantClasses = {
    default: 'bg-gray-100 dark:bg-gray-700/30 text-gray-800 dark:text-gray-200',
    success: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200',
    warning: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200',
  };

  return (
    <div
      className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg ${variantClasses[variant]}`}
      data-testid={testId}
    >
      <span className="text-xl font-bold">{value}</span>
      <span className="text-xs opacity-80">{label}</span>
    </div>
  );
}

// ============================================================================
// Cache Key Row Component
// ============================================================================

interface CacheKeyRowProps {
  cacheKey: string;
  hits: number;
  lastAccess: string;
  onInvalidate?: (key: string) => void;
  isInvalidating?: boolean;
}

function CacheKeyRow({ cacheKey, hits, lastAccess, onInvalidate, isInvalidating }: CacheKeyRowProps) {
  // Extract task ref from cache key format: task:{taskRef}|{method}|{url}|{bodyHash}
  const parts = cacheKey.split('|');
  const taskRef = parts[0]?.replace('task:', '') || cacheKey;
  const truncatedKey = taskRef.length > 25 ? `${taskRef.slice(0, 25)}...` : taskRef;

  return (
    <div
      className="flex items-center gap-2 py-1.5 px-2 rounded bg-gray-50 dark:bg-gray-800/50"
      data-testid={`cache-key-${taskRef}`}
    >
      <Database className="h-3 w-3 text-gray-400 flex-shrink-0" />
      <span className="flex-1 text-xs text-gray-700 dark:text-gray-300 truncate" title={cacheKey}>
        {truncatedKey}
      </span>
      <span className="text-xs text-gray-500 dark:text-gray-400">{hits} hits</span>
      <span className="text-xs text-gray-400 dark:text-gray-500">{lastAccess}</span>
      {onInvalidate && (
        <button
          onClick={() => onInvalidate(cacheKey)}
          disabled={isInvalidating}
          className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500 dark:text-red-400 disabled:opacity-50"
          title="Invalidate this cache entry"
          aria-label="Invalidate cache entry"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}

// ============================================================================
// Skeleton Loading Component
// ============================================================================

export function CacheStatsPanelSkeleton() {
  return (
    <div className="theme-card overflow-hidden animate-pulse" data-testid="cache-stats-skeleton">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-24" />
      </div>
      <div className="p-4">
        <div className="grid grid-cols-4 gap-2 mb-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-16 bg-gray-200 dark:bg-gray-700 rounded-lg" />
          ))}
        </div>
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-8 bg-gray-200 dark:bg-gray-700 rounded" />
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Presentational Component (for Storybook and testing)
// ============================================================================

export interface CacheStatsPanelContentProps {
  data?: CacheStats;
  isFetching?: boolean;
  onRefresh?: () => void;
  onInvalidate?: (key: string) => void;
  onClearAll?: () => void;
  isInvalidating?: boolean;
  isClearing?: boolean;
}

export function CacheStatsPanelContent({
  data,
  isFetching = false,
  onRefresh,
  onInvalidate,
  onClearAll,
  isInvalidating = false,
  isClearing = false,
}: CacheStatsPanelContentProps) {
  const hasEntries = (data?.totalEntries ?? 0) > 0;

  return (
    <div className="theme-card overflow-hidden" data-testid="cache-stats-panel">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Task Cache</h2>
        <div className="flex items-center gap-2">
          {hasEntries && onClearAll && (
            <button
              onClick={onClearAll}
              disabled={isClearing}
              className="px-2 py-1 text-xs rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 disabled:opacity-50 flex items-center gap-1"
              title="Clear all cache entries"
              aria-label="Clear all cache entries"
            >
              <Trash2 className="h-3 w-3" />
              Clear All
            </button>
          )}
          <button
            onClick={onRefresh}
            disabled={isFetching}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
            title="Refresh cache stats"
            aria-label="Refresh cache stats"
            data-testid="refresh-button"
          >
            <RefreshCw className={`h-4 w-4 text-gray-600 dark:text-gray-400 ${isFetching ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Stats grid */}
        <div className="grid grid-cols-4 gap-2 mb-4" data-testid="cache-stats-grid">
          <StatCard
            label="Hit Ratio"
            value={formatPercent(data?.hitRatio ?? 0)}
            testId="hit-ratio"
            variant={(data?.hitRatio ?? 0) > 0.8 ? 'success' : (data?.hitRatio ?? 0) > 0.5 ? 'default' : 'warning'}
          />
          <StatCard
            label="Hits"
            value={formatNumber(data?.totalHits ?? 0)}
            testId="total-hits"
          />
          <StatCard
            label="Misses"
            value={formatNumber(data?.totalMisses ?? 0)}
            testId="total-misses"
          />
          <StatCard
            label="Entries"
            value={formatNumber(data?.totalEntries ?? 0)}
            testId="total-entries"
          />
        </div>

        {/* Memory usage */}
        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-3">
          <span>Memory Usage</span>
          <span data-testid="memory-usage">{formatBytes(data?.memoryUsageBytes ?? 0)}</span>
        </div>

        {/* Recent cache keys */}
        {hasEntries ? (
          <div className="space-y-1.5" data-testid="recent-keys-list">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Recent Cache Keys</p>
            {data?.recentKeys.map((entry) => (
              <CacheKeyRow
                key={entry.key}
                cacheKey={entry.key}
                hits={entry.hits}
                lastAccess={entry.lastAccess}
                onInvalidate={onInvalidate}
                isInvalidating={isInvalidating}
              />
            ))}
          </div>
        ) : (
          <p
            className="text-sm text-gray-500 dark:text-gray-400 text-center py-4"
            data-testid="empty-cache-message"
          >
            No cached entries
          </p>
        )}

        {/* Last updated timestamp */}
        {data?.generatedAt && (
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-3 text-right" data-testid="last-updated">
            Last updated: {new Date(data.generatedAt).toLocaleTimeString()}
          </p>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Main Cache Stats Panel Component
// ============================================================================

export function CacheStatsPanel() {
  const { data, isLoading, refetch, isFetching } = useCacheStats();
  const invalidateMutation = useInvalidateCache();
  const clearMutation = useClearCache();

  if (isLoading) {
    return <CacheStatsPanelSkeleton />;
  }

  return (
    <CacheStatsPanelContent
      data={data}
      isFetching={isFetching}
      onRefresh={() => refetch()}
      onInvalidate={(key) => invalidateMutation.mutate(key)}
      onClearAll={() => clearMutation.mutate()}
      isInvalidating={invalidateMutation.isPending}
      isClearing={clearMutation.isPending}
    />
  );
}
