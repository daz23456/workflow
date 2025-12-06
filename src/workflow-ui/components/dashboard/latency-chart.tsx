'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  ComposedChart,
} from 'recharts';
import { format } from 'date-fns';
import type { WorkflowHistoryPoint } from '@/lib/api/types';

interface LatencyChartProps {
  data: WorkflowHistoryPoint[] | undefined;
  isLoading: boolean;
  title?: string;
}

export function LatencyChart({ data, isLoading, title = 'Latency Over Time' }: LatencyChartProps) {
  if (isLoading) {
    return (
      <div className="theme-card p-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">{title}</h2>
        <div className="h-64 bg-gray-100 dark:bg-gray-700 animate-pulse theme-rounded-md" role="status" aria-label="Loading chart" />
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="theme-card p-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">{title}</h2>
        <div className="h-64 flex items-center justify-center text-gray-500 dark:text-gray-400">
          No data available
        </div>
      </div>
    );
  }

  // Transform data for recharts
  const chartData = data.map((point) => ({
    timestamp: point.timestamp,
    dateStr: format(new Date(point.timestamp), 'MMM dd'),
    fullDate: format(new Date(point.timestamp), 'MMM dd, yyyy HH:mm'),
    p95Ms: Math.round(point.p95Ms),
    avgMs: Math.round(point.avgDurationMs),
    errorRate: point.errorRate,
    count: point.count,
  }));

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload[0]) return null;
    const data = payload[0].payload;

    return (
      <div className="theme-card p-3 text-sm">
        <p className="font-semibold mb-2 text-gray-900 dark:text-gray-100">{data.fullDate}</p>
        <div className="space-y-1">
          <div className="flex justify-between gap-4">
            <span className="text-gray-600 dark:text-gray-400">P95:</span>
            <span className="font-semibold text-orange-600 dark:text-orange-400">{data.p95Ms}ms</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-gray-600 dark:text-gray-400">Average:</span>
            <span className="font-semibold text-blue-600 dark:text-blue-400">{data.avgMs}ms</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-gray-600 dark:text-gray-400">Executions:</span>
            <span className="font-semibold text-gray-900 dark:text-gray-100">{data.count}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-gray-600 dark:text-gray-400">Error Rate:</span>
            <span className={`font-semibold ${data.errorRate > 10 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
              {data.errorRate.toFixed(1)}%
            </span>
          </div>
        </div>
      </div>
    );
  };

  const p95Values = data.map((d) => d.p95Ms);
  const maxP95 = Math.max(...p95Values);
  const minP95 = Math.min(...p95Values);

  return (
    <div className="theme-card p-4" data-testid="latency-chart">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">{title}</h2>

      <ResponsiveContainer width="100%" height={220}>
        <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
          <defs>
            <linearGradient id="p95Gradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#f97316" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#f97316" stopOpacity={0.05} />
            </linearGradient>
          </defs>

          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />

          <XAxis
            dataKey="dateStr"
            stroke="#6b7280"
            style={{ fontSize: '11px' }}
            tickLine={false}
          />

          <YAxis
            stroke="#6b7280"
            style={{ fontSize: '11px' }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => `${value}ms`}
          />

          <Tooltip content={<CustomTooltip />} />

          {/* Shaded area under P95 line */}
          <Area
            type="monotone"
            dataKey="p95Ms"
            stroke="none"
            fill="url(#p95Gradient)"
            fillOpacity={1}
          />

          {/* P95 line */}
          <Line
            type="monotone"
            dataKey="p95Ms"
            stroke="#f97316"
            strokeWidth={2}
            dot={{ fill: '#f97316', r: 4 }}
            activeDot={{ r: 6, stroke: '#fff', strokeWidth: 2 }}
            name="P95"
          />

          {/* Average line */}
          <Line
            type="monotone"
            dataKey="avgMs"
            stroke="#3b82f6"
            strokeWidth={2}
            strokeDasharray="5 5"
            dot={{ fill: '#3b82f6', r: 3 }}
            activeDot={{ r: 5, stroke: '#fff', strokeWidth: 2 }}
            name="Average"
          />
        </ComposedChart>
      </ResponsiveContainer>

      {/* Summary stats */}
      <div className="flex justify-between mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400">
        <span>Min P95: <strong className="text-gray-700 dark:text-gray-300">{Math.round(minP95)}ms</strong></span>
        <span>Max P95: <strong className="text-gray-700 dark:text-gray-300">{Math.round(maxP95)}ms</strong></span>
        <span>Data points: <strong className="text-gray-700 dark:text-gray-300">{data.length}</strong></span>
      </div>
    </div>
  );
}
