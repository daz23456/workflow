import type { Meta, StoryObj } from '@storybook/react';
import { DurationTrendsChart } from './duration-trends-chart';
import type { DurationDataPoint } from '@/lib/api/types';

/**
 * DurationTrendsChart displays duration trends visualization with Recharts.
 *
 * Features:
 * - Line charts for Average, P50, P95 metrics
 * - Shaded area showing min-max range
 * - Interactive tooltips with detailed statistics
 * - Brush for date range selection
 * - Metric toggle buttons
 * - Summary statistics
 * - Responsive design
 * - Loading and error states
 */
const meta = {
  title: 'Analytics/DurationTrendsChart',
  component: DurationTrendsChart,
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
} satisfies Meta<typeof DurationTrendsChart>;

export default meta;
type Story = StoryObj<typeof meta>;

// Generate mock data points
const generateDataPoints = (days: number, baseMs: number = 500): DurationDataPoint[] => {
  const now = new Date();
  return Array.from({ length: days }, (_, i) => {
    const date = new Date(now);
    date.setDate(date.getDate() - (days - i - 1));

    // Add some variance
    const variance = Math.random() * 200 - 100;
    const avgDuration = baseMs + variance;

    return {
      date,
      averageDurationMs: avgDuration,
      p50DurationMs: avgDuration * 0.9,
      p95DurationMs: avgDuration * 1.8,
      minDurationMs: avgDuration * 0.5,
      maxDurationMs: avgDuration * 2.5,
      executionCount: Math.floor(Math.random() * 50) + 10,
      successCount: Math.floor(Math.random() * 45) + 8,
      failureCount: Math.floor(Math.random() * 5),
    };
  });
};

/**
 * Default workflow trends
 */
export const Default: Story = {
  args: {
    dataPoints: generateDataPoints(30, 500),
    entityType: 'Workflow',
    entityName: 'user-signup',
  },
};

/**
 * Task duration trends
 */
export const TaskTrends: Story = {
  args: {
    dataPoints: generateDataPoints(30, 150),
    entityType: 'Task',
    entityName: 'fetch-user-data',
  },
};

/**
 * Loading state
 */
export const Loading: Story = {
  args: {
    dataPoints: [],
    entityType: 'Workflow',
    entityName: 'user-signup',
    isLoading: true,
  },
};

/**
 * Error state
 */
export const Error: Story = {
  args: {
    dataPoints: [],
    entityType: 'Workflow',
    entityName: 'user-signup',
    error: new Error('Failed to fetch duration trends: Network error'),
  },
};

/**
 * Empty state - no data
 */
export const Empty: Story = {
  args: {
    dataPoints: [],
    entityType: 'Workflow',
    entityName: 'new-workflow',
  },
};

/**
 * Short time period (7 days)
 */
export const ShortPeriod: Story = {
  args: {
    dataPoints: generateDataPoints(7, 300),
    entityType: 'Workflow',
    entityName: 'quick-check',
  },
};

/**
 * Long time period (90 days)
 */
export const LongPeriod: Story = {
  args: {
    dataPoints: generateDataPoints(90, 800),
    entityType: 'Workflow',
    entityName: 'data-pipeline',
  },
};

/**
 * High variance data
 */
export const HighVariance: Story = {
  args: {
    dataPoints: Array.from({ length: 30 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (30 - i - 1));
      const base = Math.random() * 1000 + 200;
      return {
        date,
        averageDurationMs: base,
        p50DurationMs: base * 0.7,
        p95DurationMs: base * 3,
        minDurationMs: base * 0.1,
        maxDurationMs: base * 5,
        executionCount: Math.floor(Math.random() * 100) + 20,
        successCount: Math.floor(Math.random() * 80) + 15,
        failureCount: Math.floor(Math.random() * 20),
      };
    }),
    entityType: 'Workflow',
    entityName: 'variable-workflow',
  },
};
