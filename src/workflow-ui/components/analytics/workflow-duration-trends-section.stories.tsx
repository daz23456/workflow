import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { DurationTrendsChart } from './duration-trends-chart';
import type { DurationDataPoint } from '@/lib/api/types';

/**
 * WorkflowDurationTrendsSection is a container component for workflow duration trends.
 *
 * Features:
 * - Date range selector (7, 14, 30, 60, 90 days)
 * - Fetches data using TanStack Query
 * - Renders DurationTrendsChart
 *
 * Note: This is a visual-only story showing the UI pattern.
 * Actual component uses useWorkflowDurationTrends hook.
 */

interface WorkflowDurationTrendsSectionVisualProps {
  workflowName: string;
  dataPoints: DurationDataPoint[];
  isLoading?: boolean;
  error?: Error | null;
}

function WorkflowDurationTrendsSectionVisual({
  workflowName,
  dataPoints,
  isLoading = false,
  error = null,
}: WorkflowDurationTrendsSectionVisualProps) {
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
        entityType="Workflow"
        entityName={workflowName}
        isLoading={isLoading}
        error={error}
      />
    </div>
  );
}

const meta = {
  title: 'Analytics/WorkflowDurationTrendsSection',
  component: WorkflowDurationTrendsSectionVisual,
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
} satisfies Meta<typeof WorkflowDurationTrendsSectionVisual>;

export default meta;
type Story = StoryObj<typeof meta>;

const generateDataPoints = (days: number): DurationDataPoint[] => {
  const now = new Date();
  return Array.from({ length: days }, (_, i) => {
    const date = new Date(now);
    date.setDate(date.getDate() - (days - i - 1));
    const base = 800 + Math.random() * 400;
    return {
      date,
      averageDurationMs: base,
      p50DurationMs: base * 0.85,
      p95DurationMs: base * 1.8,
      minDurationMs: base * 0.3,
      maxDurationMs: base * 2.5,
      executionCount: Math.floor(Math.random() * 50) + 10,
      successCount: Math.floor(Math.random() * 45) + 8,
      failureCount: Math.floor(Math.random() * 5),
    };
  });
};

/**
 * Default with data
 */
export const Default: Story = {
  args: {
    workflowName: 'user-signup',
    dataPoints: generateDataPoints(30),
  },
};

/**
 * Loading state
 */
export const Loading: Story = {
  args: {
    workflowName: 'user-signup',
    dataPoints: [],
    isLoading: true,
  },
};

/**
 * Error state
 */
export const Error: Story = {
  args: {
    workflowName: 'user-signup',
    dataPoints: [],
    error: new Error('Failed to fetch workflow duration trends'),
  },
};

/**
 * Empty state
 */
export const Empty: Story = {
  args: {
    workflowName: 'new-workflow',
    dataPoints: [],
  },
};

/**
 * Data pipeline workflow
 */
export const DataPipeline: Story = {
  args: {
    workflowName: 'data-processing-pipeline',
    dataPoints: generateDataPoints(60),
  },
};
