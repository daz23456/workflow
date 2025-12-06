'use client';

import type { SystemMetrics } from '@/lib/api/types';

interface SystemMetricsCardProps {
  metrics: SystemMetrics | undefined;
  isLoading: boolean;
}

interface MetricCardProps {
  label: string;
  value: string | number;
  unit?: string;
  isLoading: boolean;
  color?: 'default' | 'success' | 'warning' | 'error';
}

function MetricCard({ label, value, unit, isLoading, color = 'default' }: MetricCardProps) {
  const colorClasses = {
    default: 'text-gray-900 dark:text-gray-100',
    success: 'text-green-600 dark:text-green-400',
    warning: 'text-yellow-600 dark:text-yellow-400',
    error: 'text-red-600 dark:text-red-400',
  };

  return (
    <div className="theme-card p-4">
      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{label}</p>
      {isLoading ? (
        <div className="h-8 w-24 bg-gray-200 dark:bg-gray-700 animate-pulse theme-rounded-sm mt-1" role="status" aria-label={`Loading ${label}`} />
      ) : (
        <p className={`text-2xl font-bold mt-1 ${colorClasses[color]}`}>
          {value}
          {unit && <span className="text-sm font-normal text-gray-500 dark:text-gray-400 ml-1">{unit}</span>}
        </p>
      )}
    </div>
  );
}

export function SystemMetricsCard({ metrics, isLoading }: SystemMetricsCardProps) {
  const getErrorColor = (rate: number): 'success' | 'warning' | 'error' => {
    if (rate < 1) return 'success';
    if (rate < 5) return 'warning';
    return 'error';
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4" data-testid="system-metrics-card">
      <MetricCard
        label="Throughput"
        value={metrics?.throughput?.toFixed(1) ?? '0'}
        unit="/hr"
        isLoading={isLoading}
      />
      <MetricCard
        label="P95 Latency"
        value={metrics?.p95Ms ?? 0}
        unit="ms"
        isLoading={isLoading}
      />
      <MetricCard
        label="P99 Latency"
        value={metrics?.p99Ms ?? 0}
        unit="ms"
        isLoading={isLoading}
      />
      <MetricCard
        label="Error Rate"
        value={metrics?.errorRate?.toFixed(1) ?? '0'}
        unit="%"
        isLoading={isLoading}
        color={metrics ? getErrorColor(metrics.errorRate) : 'default'}
      />
    </div>
  );
}
