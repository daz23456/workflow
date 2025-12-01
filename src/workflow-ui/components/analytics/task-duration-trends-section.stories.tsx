import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { DurationTrendsChart } from './duration-trends-chart';
import type { DurationDataPoint } from '@/lib/api/types';

/**
 * TaskDurationTrendsSection is a container component for task duration trends.
 *
 * Features:
 * - Date range selector (7, 14, 30, 60, 90 days)
 * - Fetches data using TanStack Query
 * - Renders DurationTrendsChart
 *
 * Note: This is a visual-only story showing the UI pattern.
 * Actual component uses useTaskDurationTrends hook.
 */

interface TaskDurationTrendsSectionVisualProps {
  taskName: string;
  dataPoints: DurationDataPoint[];
  isLoading?: boolean;
  error?: Error | null;
}

function TaskDurationTrendsSectionVisual({
  taskName,
  dataPoints,
  isLoading = false,
  error = null,
}: TaskDurationTrendsSectionVisualProps) {
  const [daysBack, setDaysBack] = useState(30);

  const dateRangeOptions = [
    { label: '7 days', value: 7 },
    { label: '14 days', value: 14 },
    { label: '30 days', value: 30 },
    { label: '60 days', value: 60 },
    { label: '90 days', value: 90 },
  ];

  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
        <label className="text-sm font-medium text-gray-700">Time period:</label>
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
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <DurationTrendsChart
        dataPoints={dataPoints}
        entityType="Task"
        entityName={taskName}
        isLoading={isLoading}
        error={error}
      />
    </div>
  );
}

const meta = {
  title: 'Analytics/TaskDurationTrendsSection',
  component: TaskDurationTrendsSectionVisual,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="w-[900px]">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof TaskDurationTrendsSectionVisual>;

export default meta;
type Story = StoryObj<typeof meta>;

const generateDataPoints = (days: number): DurationDataPoint[] => {
  const now = new Date();
  return Array.from({ length: days }, (_, i) => {
    const date = new Date(now);
    date.setDate(date.getDate() - (days - i - 1));
    const base = 150 + Math.random() * 100;
    return {
      date,
      averageDurationMs: base,
      p50DurationMs: base * 0.85,
      p95DurationMs: base * 1.6,
      minDurationMs: base * 0.4,
      maxDurationMs: base * 2.2,
      executionCount: Math.floor(Math.random() * 80) + 20,
      successCount: Math.floor(Math.random() * 70) + 18,
      failureCount: Math.floor(Math.random() * 10),
    };
  });
};

/**
 * Default with data
 */
export const Default: Story = {
  args: {
    taskName: 'fetch-user-data',
    dataPoints: generateDataPoints(30),
  },
};

/**
 * Loading state
 */
export const Loading: Story = {
  args: {
    taskName: 'fetch-user-data',
    dataPoints: [],
    isLoading: true,
  },
};

/**
 * Error state
 */
export const Error: Story = {
  args: {
    taskName: 'fetch-user-data',
    dataPoints: [],
    error: new Error('Failed to fetch task duration trends'),
  },
};

/**
 * Empty state
 */
export const Empty: Story = {
  args: {
    taskName: 'new-task',
    dataPoints: [],
  },
};
