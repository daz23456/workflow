import type { Meta, StoryObj } from '@storybook/react';
import { ExecutionHistoryPanel } from './execution-history-panel';
import type { ExecutionHistoryItem } from '@/types/execution';

/**
 * ExecutionHistoryPanel displays a list of workflow executions with filtering and pagination.
 *
 * Features:
 * - Filter by status (All, Success, Failed)
 * - Sort by time (Newest/Oldest)
 * - Pagination with configurable page size
 * - Click to view execution details
 * - Debug link for each execution
 */
const meta = {
  title: 'Workflows/ExecutionHistoryPanel',
  component: ExecutionHistoryPanel,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="h-[600px] w-[500px]">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ExecutionHistoryPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

// Mock data generators
const generateExecution = (
  id: number,
  status: 'success' | 'failed' | 'running',
  minutesAgo: number
): ExecutionHistoryItem => ({
  executionId: `exec-${id.toString().padStart(4, '0')}`,
  workflowName: 'user-signup',
  status,
  startedAt: new Date(Date.now() - minutesAgo * 60 * 1000).toISOString(),
  completedAt:
    status !== 'running'
      ? new Date(Date.now() - (minutesAgo - 1) * 60 * 1000).toISOString()
      : undefined,
  durationMs: status === 'running' ? 0 : Math.floor(Math.random() * 5000) + 500,
  inputSnapshot: { email: 'user@example.com' },
  error: status === 'failed' ? 'Connection timeout after 30s' : undefined,
});

const mockExecutions: ExecutionHistoryItem[] = [
  generateExecution(1, 'success', 5),
  generateExecution(2, 'success', 12),
  generateExecution(3, 'failed', 18),
  generateExecution(4, 'success', 25),
  generateExecution(5, 'running', 2),
  generateExecution(6, 'success', 35),
  generateExecution(7, 'failed', 45),
  generateExecution(8, 'success', 55),
  generateExecution(9, 'success', 65),
  generateExecution(10, 'success', 75),
];

/**
 * Default state with mixed execution statuses
 */
export const Default: Story = {
  args: {
    executions: mockExecutions,
    onExecutionClick: (id) => console.log('Clicked execution:', id),
  },
};

/**
 * Loading state while fetching executions
 */
export const Loading: Story = {
  args: {
    executions: [],
    isLoading: true,
  },
};

/**
 * Empty state - no executions yet
 */
export const Empty: Story = {
  args: {
    executions: [],
    isLoading: false,
  },
};

/**
 * All successful executions
 */
export const AllSuccess: Story = {
  args: {
    executions: Array.from({ length: 10 }, (_, i) =>
      generateExecution(i + 1, 'success', (i + 1) * 10)
    ),
    onExecutionClick: (id) => console.log('Clicked execution:', id),
  },
};

/**
 * Mix of failed executions
 */
export const ManyFailures: Story = {
  args: {
    executions: [
      generateExecution(1, 'failed', 5),
      generateExecution(2, 'failed', 15),
      generateExecution(3, 'success', 25),
      generateExecution(4, 'failed', 35),
      generateExecution(5, 'failed', 45),
      generateExecution(6, 'success', 55),
      generateExecution(7, 'failed', 65),
    ],
    onExecutionClick: (id) => console.log('Clicked execution:', id),
  },
};

/**
 * Large dataset requiring pagination
 */
export const LargeDataset: Story = {
  args: {
    executions: Array.from({ length: 100 }, (_, i) =>
      generateExecution(i + 1, i % 5 === 0 ? 'failed' : 'success', i * 5)
    ),
    onExecutionClick: (id) => console.log('Clicked execution:', id),
  },
};

/**
 * Currently running executions
 */
export const WithRunningExecutions: Story = {
  args: {
    executions: [
      generateExecution(1, 'running', 1),
      generateExecution(2, 'running', 3),
      generateExecution(3, 'success', 10),
      generateExecution(4, 'success', 20),
      generateExecution(5, 'failed', 30),
    ],
    onExecutionClick: (id) => console.log('Clicked execution:', id),
  },
};
