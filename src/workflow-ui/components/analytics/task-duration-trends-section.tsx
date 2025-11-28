'use client';

import { useState } from 'react';
import { useTaskDurationTrends } from '@/lib/api/queries';
import { DurationTrendsChart } from './duration-trends-chart';

export interface TaskDurationTrendsSectionProps {
  /** Task name */
  taskName: string;
  /** Initial days back (default: 30) */
  initialDaysBack?: number;
}

/**
 * Container component for task duration trends
 * Fetches data using TanStack Query and renders the chart
 */
export function TaskDurationTrendsSection({
  taskName,
  initialDaysBack = 30,
}: TaskDurationTrendsSectionProps) {
  const [daysBack, setDaysBack] = useState(initialDaysBack);

  const { data, isLoading, error } = useTaskDurationTrends(
    taskName,
    daysBack
  );

  // Date range presets
  const dateRangeOptions = [
    { label: '7 days', value: 7 },
    { label: '14 days', value: 14 },
    { label: '30 days', value: 30 },
    { label: '60 days', value: 60 },
    { label: '90 days', value: 90 },
  ];

  return (
    <div>
      {/* Date range selector */}
      <div className="mb-4 flex items-center gap-2">
        <label htmlFor="task-date-range" className="text-sm font-medium text-gray-700">
          Time period:
        </label>
        <div className="flex gap-2">
          {dateRangeOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => setDaysBack(option.value)}
              className={`px-3 py-1 text-sm rounded-md border transition-colors ${
                daysBack === option.value
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
              aria-pressed={daysBack === option.value}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <DurationTrendsChart
        dataPoints={data?.dataPoints || []}
        entityType="Task"
        entityName={taskName}
        isLoading={isLoading}
        error={error as Error | null}
      />
    </div>
  );
}
