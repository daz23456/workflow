'use client';

import type { WorkflowHistoryPoint } from '@/lib/api/types';

interface LatencyChartProps {
  data: WorkflowHistoryPoint[] | undefined;
  isLoading: boolean;
  title?: string;
}

export function LatencyChart({ data, isLoading, title = 'Latency Over Time' }: LatencyChartProps) {
  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">{title}</h2>
        <div className="h-48 bg-gray-100 animate-pulse rounded" role="status" aria-label="Loading chart" />
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">{title}</h2>
        <div className="h-48 flex items-center justify-center text-gray-500">
          No data available
        </div>
      </div>
    );
  }

  const p95Values = data.map((d) => d.p95Ms);
  const maxP95 = Math.max(...p95Values);
  const minP95 = Math.min(...p95Values);
  const range = maxP95 - minP95 || 1;

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4" data-testid="latency-chart">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">{title}</h2>
      <div className="h-48 flex items-end gap-1">
        {data.map((point, index) => {
          const height = ((point.p95Ms - minP95) / range) * 100;
          const date = new Date(point.timestamp);
          const dateLabel = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

          return (
            <div
              key={index}
              className="flex-1 flex flex-col items-center group cursor-pointer"
              title={`${dateLabel}: ${point.p95Ms}ms (P95)`}
            >
              <div
                className="w-full bg-blue-500 rounded-t transition-all group-hover:bg-blue-600"
                style={{ height: `${Math.max(height, 5)}%` }}
              />
              {index % Math.ceil(data.length / 5) === 0 && (
                <span className="text-xs text-gray-500 mt-1 truncate">{dateLabel}</span>
              )}
            </div>
          );
        })}
      </div>
      <div className="flex justify-between mt-2 text-xs text-gray-500">
        <span>P95 Min: {minP95.toFixed(0)}ms</span>
        <span>P95 Max: {maxP95.toFixed(0)}ms</span>
      </div>
    </div>
  );
}
