import type { Meta, StoryObj } from '@storybook/react';
import { HealthSummaryPanelContent, HealthSummaryPanelSkeleton } from './health-summary-panel';
import type { WorkflowHealthStatus } from '@/lib/api/types';

/**
 * HealthSummaryPanel displays a summary of synthetic health check results.
 *
 * Features:
 * - Health status indicators (Healthy, Degraded, Unhealthy, Unknown)
 * - Expandable workflow list with task details
 * - Refresh button to trigger health checks
 * - Loading skeleton state
 * - Auto-refresh every 60 seconds
 */

// Mock data generators
const createHealthyWorkflow = (name: string, taskCount: number): WorkflowHealthStatus => ({
  workflowName: name,
  overallHealth: 'Healthy',
  tasks: Array.from({ length: taskCount }, (_, i) => ({
    taskId: `task-${i + 1}`,
    taskRef: `${name}-task-${i + 1}`,
    status: 'Healthy' as const,
    url: `https://api.example.com/${name}/${i + 1}`,
    latencyMs: Math.floor(Math.random() * 100) + 20,
    reachable: true,
    statusCode: 200,
  })),
  checkedAt: new Date().toISOString(),
  durationMs: Math.floor(Math.random() * 200) + 50,
});

const createDegradedWorkflow = (name: string): WorkflowHealthStatus => ({
  workflowName: name,
  overallHealth: 'Degraded',
  tasks: [
    {
      taskId: 'task-1',
      taskRef: `${name}-main`,
      status: 'Healthy',
      url: `https://api.example.com/${name}/main`,
      latencyMs: 45,
      reachable: true,
      statusCode: 200,
    },
    {
      taskId: 'task-2',
      taskRef: `${name}-secondary`,
      status: 'Degraded',
      url: `https://api.example.com/${name}/secondary`,
      latencyMs: 2500,
      reachable: true,
      statusCode: 503,
    },
  ],
  checkedAt: new Date().toISOString(),
  durationMs: 2545,
});

const createUnhealthyWorkflow = (name: string): WorkflowHealthStatus => ({
  workflowName: name,
  overallHealth: 'Unhealthy',
  tasks: [
    {
      taskId: 'task-1',
      taskRef: `${name}-api`,
      status: 'Unhealthy',
      url: `https://api.example.com/${name}`,
      latencyMs: 5000,
      reachable: false,
      errorMessage: 'Connection timeout',
    },
  ],
  checkedAt: new Date().toISOString(),
  durationMs: 5000,
});

const createUnknownWorkflow = (name: string): WorkflowHealthStatus => ({
  workflowName: name,
  overallHealth: 'Unknown',
  tasks: [
    {
      taskId: 'task-1',
      taskRef: `${name}-check`,
      status: 'Unknown',
      url: `https://api.example.com/${name}`,
      latencyMs: 0,
      reachable: false,
      errorMessage: 'No previous execution data',
    },
  ],
  checkedAt: new Date().toISOString(),
  durationMs: 0,
});

// Create mock health summary data
const createMockHealthData = (
  healthy: number,
  degraded: number,
  unhealthy: number,
  unknown: number
) => {
  const workflows: WorkflowHealthStatus[] = [];

  for (let i = 0; i < healthy; i++) {
    workflows.push(createHealthyWorkflow(`healthy-workflow-${i + 1}`, Math.floor(Math.random() * 3) + 1));
  }
  for (let i = 0; i < degraded; i++) {
    workflows.push(createDegradedWorkflow(`degraded-workflow-${i + 1}`));
  }
  for (let i = 0; i < unhealthy; i++) {
    workflows.push(createUnhealthyWorkflow(`unhealthy-workflow-${i + 1}`));
  }
  for (let i = 0; i < unknown; i++) {
    workflows.push(createUnknownWorkflow(`unknown-workflow-${i + 1}`));
  }

  return {
    healthyCount: healthy,
    degradedCount: degraded,
    unhealthyCount: unhealthy,
    unknownCount: unknown,
    workflows,
    generatedAt: new Date().toISOString(),
  };
};

const meta = {
  title: 'Dashboard/HealthSummaryPanel',
  component: HealthSummaryPanelContent,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="w-[400px]">
        <Story />
      </div>
    ),
  ],
  argTypes: {
    onRefresh: { action: 'refresh clicked' },
  },
} satisfies Meta<typeof HealthSummaryPanelContent>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default state with mixed health statuses
 */
export const Default: Story = {
  args: {
    data: createMockHealthData(3, 1, 1, 0),
    isFetching: false,
  },
};

/**
 * All workflows are healthy
 */
export const AllHealthy: Story = {
  args: {
    data: createMockHealthData(5, 0, 0, 0),
    isFetching: false,
  },
};

/**
 * All workflows are unhealthy - critical state
 */
export const AllUnhealthy: Story = {
  args: {
    data: createMockHealthData(0, 0, 4, 0),
    isFetching: false,
  },
};

/**
 * Empty state - no workflows with health data
 */
export const Empty: Story = {
  args: {
    data: createMockHealthData(0, 0, 0, 0),
    isFetching: false,
  },
};

/**
 * Many workflows showing overflow behavior
 */
export const ManyWorkflows: Story = {
  args: {
    data: createMockHealthData(5, 2, 2, 1),
    isFetching: false,
  },
};

/**
 * Mixed degraded and unknown states
 */
export const DegradedState: Story = {
  args: {
    data: createMockHealthData(2, 3, 0, 1),
    isFetching: false,
  },
};

/**
 * Fetching state with spinner on refresh button
 */
export const Fetching: Story = {
  args: {
    data: createMockHealthData(3, 1, 1, 0),
    isFetching: true,
  },
};

/**
 * Loading skeleton state
 */
export const Loading: Story = {
  render: () => (
    <div className="w-[400px]">
      <HealthSummaryPanelSkeleton />
    </div>
  ),
};
