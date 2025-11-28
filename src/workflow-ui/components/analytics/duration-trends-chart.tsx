'use client';

import { useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  ComposedChart,
  Brush,
} from 'recharts';
import { format } from 'date-fns';
import type { DurationDataPoint } from '@/lib/api/types';

export interface DurationTrendsChartProps {
  /** Data points to visualize */
  dataPoints: DurationDataPoint[];
  /** Entity type (Workflow or Task) */
  entityType: 'Workflow' | 'Task';
  /** Entity name for display */
  entityName: string;
  /** Loading state */
  isLoading?: boolean;
  /** Error state */
  error?: Error | null;
}

/**
 * Reusable duration trends visualization component
 * Features:
 * - Line charts for Average, P50, P95 metrics
 * - Shaded area showing min-max range
 * - Interactive tooltips with detailed statistics
 * - Brush for date range selection
 * - Responsive design
 * - Accessibility support
 */
export function DurationTrendsChart({
  dataPoints,
  entityType,
  entityName,
  isLoading = false,
  error = null,
}: DurationTrendsChartProps) {
  const [selectedMetrics, setSelectedMetrics] = useState({
    average: true,
    p50: false,
    p95: false,
    minMax: false,
  });

  if (isLoading) {
    return (
      <div className="bg-white p-6 rounded-lg border">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-64 bg-gray-100 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white p-6 rounded-lg border">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="text-red-800 font-semibold">Failed to load duration trends</h3>
          <p className="text-red-600 text-sm mt-1">{error.message}</p>
        </div>
      </div>
    );
  }

  if (dataPoints.length === 0) {
    return (
      <div className="bg-white p-6 rounded-lg border">
        <h2 className="text-xl font-semibold mb-4">Duration Trends</h2>
        <div className="text-center py-8 text-gray-500">
          <p>No execution data available for the selected time period.</p>
          <p className="text-sm mt-2">Execute the {entityType.toLowerCase()} to see trends.</p>
        </div>
      </div>
    );
  }

  // Prepare data for Recharts
  const chartData = dataPoints.map((point) => ({
    date: point.date,
    dateStr: format(point.date, 'MMM dd'),
    avgDuration: point.averageDurationMs,
    p50Duration: point.p50DurationMs,
    p95Duration: point.p95DurationMs,
    minDuration: point.minDurationMs,
    maxDuration: point.maxDurationMs,
    executions: point.executionCount,
    successCount: point.successCount,
    failureCount: point.failureCount,
    successRate: point.executionCount > 0
      ? ((point.successCount / point.executionCount) * 100).toFixed(1)
      : '0.0',
  }));

  // Custom tooltip component
  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload[0]) return null;

    const data = payload[0].payload;

    return (
      <div className="bg-white p-4 rounded-lg border shadow-lg">
        <p className="font-semibold mb-2">{format(data.date, 'MMM dd, yyyy')}</p>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between gap-4">
            <span className="text-gray-600">Executions:</span>
            <span className="font-semibold">{data.executions}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-gray-600">Success Rate:</span>
            <span className="font-semibold text-green-600">{data.successRate}%</span>
          </div>
          <hr className="my-2" />
          <div className="flex justify-between gap-4">
            <span className="text-gray-600">Average:</span>
            <span className="font-semibold">{Math.round(data.avgDuration)}ms</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-gray-600">Median (P50):</span>
            <span className="font-semibold">{Math.round(data.p50Duration)}ms</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-gray-600">P95:</span>
            <span className="font-semibold">{Math.round(data.p95Duration)}ms</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-gray-600">Range:</span>
            <span className="font-semibold">
              {Math.round(data.minDuration)}ms - {Math.round(data.maxDuration)}ms
            </span>
          </div>
        </div>
      </div>
    );
  };

  const toggleMetric = (metric: keyof typeof selectedMetrics) => {
    setSelectedMetrics(prev => ({ ...prev, [metric]: !prev[metric] }));
  };

  return (
    <div className="bg-white p-6 rounded-lg border">
      <div className="mb-4">
        <h2 className="text-xl font-semibold">Duration Trends</h2>
        <p className="text-sm text-gray-500 mt-1">
          {entityType} execution performance over time
        </p>
      </div>

      {/* Metric toggles */}
      <div className="flex flex-wrap gap-2 mb-4">
        <button
          onClick={() => toggleMetric('average')}
          className={`px-3 py-1 text-sm rounded-full border transition-colors ${
            selectedMetrics.average
              ? 'bg-blue-100 border-blue-500 text-blue-700'
              : 'bg-gray-100 border-gray-300 text-gray-600'
          }`}
          aria-pressed={selectedMetrics.average}
        >
          Average
        </button>
        <button
          onClick={() => toggleMetric('p50')}
          className={`px-3 py-1 text-sm rounded-full border transition-colors ${
            selectedMetrics.p50
              ? 'bg-green-100 border-green-500 text-green-700'
              : 'bg-gray-100 border-gray-300 text-gray-600'
          }`}
          aria-pressed={selectedMetrics.p50}
        >
          Median (P50)
        </button>
        <button
          onClick={() => toggleMetric('p95')}
          className={`px-3 py-1 text-sm rounded-full border transition-colors ${
            selectedMetrics.p95
              ? 'bg-orange-100 border-orange-500 text-orange-700'
              : 'bg-gray-100 border-gray-300 text-gray-600'
          }`}
          aria-pressed={selectedMetrics.p95}
        >
          P95
        </button>
        <button
          onClick={() => toggleMetric('minMax')}
          className={`px-3 py-1 text-sm rounded-full border transition-colors ${
            selectedMetrics.minMax
              ? 'bg-purple-100 border-purple-500 text-purple-700'
              : 'bg-gray-100 border-gray-300 text-gray-600'
          }`}
          aria-pressed={selectedMetrics.minMax}
        >
          Min-Max Range
        </button>
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={400}>
        <ComposedChart
          data={chartData}
          margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
        >
          <defs>
            {/* Gradient for min-max area */}
            <linearGradient id="minMaxGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#9333ea" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#9333ea" stopOpacity={0.05} />
            </linearGradient>
          </defs>

          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />

          <XAxis
            dataKey="dateStr"
            stroke="#6b7280"
            style={{ fontSize: '12px' }}
            aria-label="Date"
          />

          <YAxis
            stroke="#6b7280"
            style={{ fontSize: '12px' }}
            label={{ value: 'Duration (ms)', angle: -90, position: 'insideLeft' }}
            aria-label="Duration in milliseconds"
          />

          <Tooltip content={<CustomTooltip />} />

          <Legend
            wrapperStyle={{ fontSize: '14px' }}
            iconType="line"
          />

          {/* Min-Max shaded area */}
          {selectedMetrics.minMax && (
            <Area
              type="monotone"
              dataKey="maxDuration"
              stroke="none"
              fill="url(#minMaxGradient)"
              fillOpacity={1}
              name="Min-Max Range"
              isAnimationActive={true}
            />
          )}

          {/* Average line */}
          {selectedMetrics.average && (
            <Line
              type="monotone"
              dataKey="avgDuration"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={{ fill: '#3b82f6', r: 3 }}
              activeDot={{ r: 5 }}
              name="Average Duration"
              isAnimationActive={true}
            />
          )}

          {/* P50 (Median) line */}
          {selectedMetrics.p50 && (
            <Line
              type="monotone"
              dataKey="p50Duration"
              stroke="#10b981"
              strokeWidth={2}
              dot={{ fill: '#10b981', r: 3 }}
              activeDot={{ r: 5 }}
              name="Median (P50)"
              isAnimationActive={true}
            />
          )}

          {/* P95 line */}
          {selectedMetrics.p95 && (
            <Line
              type="monotone"
              dataKey="p95Duration"
              stroke="#f97316"
              strokeWidth={2}
              dot={{ fill: '#f97316', r: 3 }}
              activeDot={{ r: 5 }}
              name="P95"
              isAnimationActive={true}
            />
          )}

          {/* Brush for zooming */}
          <Brush
            dataKey="dateStr"
            height={30}
            stroke="#8b5cf6"
            fill="#f5f3ff"
          />
        </ComposedChart>
      </ResponsiveContainer>

      {/* Summary statistics */}
      <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t">
        <div>
          <div className="text-sm text-gray-500">Total Executions</div>
          <div className="text-lg font-semibold">
            {dataPoints.reduce((sum, p) => sum + p.executionCount, 0)}
          </div>
        </div>
        <div>
          <div className="text-sm text-gray-500">Overall Success Rate</div>
          <div className="text-lg font-semibold text-green-600">
            {(
              (dataPoints.reduce((sum, p) => sum + p.successCount, 0) /
                dataPoints.reduce((sum, p) => sum + p.executionCount, 0)) *
              100
            ).toFixed(1)}
            %
          </div>
        </div>
        <div>
          <div className="text-sm text-gray-500">Avg Duration (Period)</div>
          <div className="text-lg font-semibold">
            {Math.round(
              dataPoints.reduce((sum, p) => sum + p.averageDurationMs, 0) /
                dataPoints.length
            )}
            ms
          </div>
        </div>
        <div>
          <div className="text-sm text-gray-500">P95 Duration (Period)</div>
          <div className="text-lg font-semibold">
            {Math.round(
              dataPoints.reduce((sum, p) => sum + p.p95DurationMs, 0) /
                dataPoints.length
            )}
            ms
          </div>
        </div>
      </div>
    </div>
  );
}
