import type { Meta, StoryObj } from '@storybook/react';
import { ExecutionReplay } from './execution-replay';
import { http, HttpResponse } from 'msw';

/**
 * ExecutionReplay allows browsing and replaying past executions.
 *
 * Features:
 * - List past executions with pagination
 * - Filter by status
 * - View execution details
 * - Replay button to re-run with same inputs
 * - Loading and error states
 */
const meta = {
  title: 'Debugging/ExecutionReplay',
  component: ExecutionReplay,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="w-[600px] border rounded-lg">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ExecutionReplay>;

export default meta;
type Story = StoryObj<typeof meta>;

const mockExecutions = [
  { id: 'exec-001', workflowName: 'user-signup', status: 'Succeeded', startedAt: '2024-01-15T10:00:00Z', duration: '2.5s' },
  { id: 'exec-002', workflowName: 'user-signup', status: 'Failed', startedAt: '2024-01-15T09:30:00Z', duration: '5.2s' },
  { id: 'exec-003', workflowName: 'user-signup', status: 'Succeeded', startedAt: '2024-01-15T09:00:00Z', duration: '1.8s' },
  { id: 'exec-004', workflowName: 'user-signup', status: 'Succeeded', startedAt: '2024-01-14T16:00:00Z', duration: '2.1s' },
  { id: 'exec-005', workflowName: 'user-signup', status: 'Running', startedAt: '2024-01-15T10:05:00Z', duration: '-' },
];

const mockExecutionDetail = {
  id: 'exec-001',
  workflowName: 'user-signup',
  status: 'Succeeded',
  startedAt: '2024-01-15T10:00:00Z',
  completedAt: '2024-01-15T10:00:02Z',
  duration: '2.5s',
  tasks: [
    { taskId: 'validate', taskName: 'Validate Input', status: 'Succeeded', startTime: '2024-01-15T10:00:00Z', endTime: '2024-01-15T10:00:00Z', duration: '100ms', input: { email: 'test@example.com' }, output: { valid: true } },
    { taskId: 'create-user', taskName: 'Create User', status: 'Succeeded', startTime: '2024-01-15T10:00:00Z', endTime: '2024-01-15T10:00:01Z', duration: '1s', input: { email: 'test@example.com' }, output: { userId: 'usr-123' } },
    { taskId: 'send-email', taskName: 'Send Email', status: 'Succeeded', startTime: '2024-01-15T10:00:01Z', endTime: '2024-01-15T10:00:02Z', duration: '1.4s', input: { userId: 'usr-123' }, output: { sent: true } },
  ],
};

/**
 * Default with executions loaded
 */
export const Default: Story = {
  args: {
    workflowName: 'user-signup',
    onReplay: (execution) => console.log('Replay:', execution),
  },
  parameters: {
    msw: {
      handlers: [
        http.get('/api/v1/workflows/user-signup/executions', () => {
          return HttpResponse.json(mockExecutions);
        }),
        http.get('/api/v1/executions/:id', () => {
          return HttpResponse.json(mockExecutionDetail);
        }),
      ],
    },
  },
};

/**
 * Loading state
 */
export const Loading: Story = {
  args: {
    workflowName: 'user-signup',
    onReplay: (execution) => console.log('Replay:', execution),
  },
  parameters: {
    msw: {
      handlers: [
        http.get('/api/v1/workflows/user-signup/executions', async () => {
          await new Promise((resolve) => setTimeout(resolve, 999999));
          return HttpResponse.json(mockExecutions);
        }),
      ],
    },
  },
};

/**
 * Error state
 */
export const Error: Story = {
  args: {
    workflowName: 'user-signup',
    onReplay: (execution) => console.log('Replay:', execution),
  },
  parameters: {
    msw: {
      handlers: [
        http.get('/api/v1/workflows/user-signup/executions', () => {
          return HttpResponse.json({ message: 'Failed to load executions' }, { status: 500 });
        }),
      ],
    },
  },
};

/**
 * No executions found
 */
export const Empty: Story = {
  args: {
    workflowName: 'new-workflow',
    onReplay: (execution) => console.log('Replay:', execution),
  },
  parameters: {
    msw: {
      handlers: [
        http.get('/api/v1/workflows/new-workflow/executions', () => {
          return HttpResponse.json([]);
        }),
      ],
    },
  },
};
