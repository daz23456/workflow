import type { Meta, StoryObj } from '@storybook/react';
import { ExecutionResultPanel } from './execution-result-panel';
import type { WorkflowExecutionResponse } from '@/types/execution';

/**
 * ExecutionResultPanel displays the results of a workflow execution.
 *
 * Features:
 * - Execution status (Success/Failed)
 * - Execution ID with copy button
 * - Timing metrics (duration, start/end times)
 * - Output data display
 * - Expandable task results with HTTP response details
 * - Error messages for failed executions
 * - Slow graph build warning
 */
const meta = {
  title: 'Workflows/ExecutionResultPanel',
  component: ExecutionResultPanel,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="h-[700px] w-[500px]">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ExecutionResultPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

const baseExecution: WorkflowExecutionResponse = {
  executionId: 'exec-12345-abcde',
  workflowName: 'user-signup',
  success: true,
  input: { email: 'user@example.com', username: 'newuser' },
  output: { userId: 'usr-789', verified: true },
  executionTimeMs: 2340,
  graphBuildDurationMicros: 450,
  startedAt: new Date().toISOString(),
  completedAt: new Date(Date.now() + 2340).toISOString(),
  tasks: [
    {
      taskId: 'validate-input',
      taskRef: 'input-validator',
      status: 'success',
      durationMs: 120,
      retryCount: 0,
      output: { valid: true },
    },
    {
      taskId: 'create-user',
      taskRef: 'user-service',
      status: 'success',
      durationMs: 850,
      retryCount: 0,
      output: { userId: 'usr-789' },
      httpResponse: {
        statusCode: 201,
        headers: { 'Content-Type': 'application/json' },
        body: { id: 'usr-789', email: 'user@example.com' },
      },
    },
    {
      taskId: 'send-email',
      taskRef: 'email-service',
      status: 'success',
      durationMs: 1200,
      retryCount: 0,
      output: { sent: true },
    },
  ],
};

/**
 * Successful execution with all tasks completed
 */
export const Success: Story = {
  args: {
    execution: baseExecution,
    onClose: () => console.log('Close clicked'),
  },
};

/**
 * Failed execution with error message
 */
export const Failed: Story = {
  args: {
    execution: {
      ...baseExecution,
      success: false,
      error: 'Email service unavailable: Connection timeout after 30 seconds',
      output: {},
      tasks: [
        {
          taskId: 'validate-input',
          taskRef: 'input-validator',
          status: 'success',
          durationMs: 120,
          retryCount: 0,
          output: { valid: true },
        },
        {
          taskId: 'create-user',
          taskRef: 'user-service',
          status: 'success',
          durationMs: 850,
          retryCount: 0,
          output: { userId: 'usr-789' },
        },
        {
          taskId: 'send-email',
          taskRef: 'email-service',
          status: 'failed',
          durationMs: 30000,
          retryCount: 3,
          error: 'Connection timeout after 30 seconds',
        },
      ],
    },
    onClose: () => console.log('Close clicked'),
  },
};

/**
 * Execution with retried tasks
 */
export const WithRetries: Story = {
  args: {
    execution: {
      ...baseExecution,
      tasks: [
        {
          taskId: 'fetch-data',
          taskRef: 'data-service',
          status: 'success',
          durationMs: 3500,
          retryCount: 2,
          output: { data: { items: 100 } },
          httpResponse: {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: { items: 100 },
          },
        },
        {
          taskId: 'process-data',
          taskRef: 'processor',
          status: 'success',
          durationMs: 1200,
          retryCount: 0,
          output: { processed: 100 },
        },
      ],
    },
    onClose: () => console.log('Close clicked'),
  },
};

/**
 * Execution with slow graph build (warning displayed)
 */
export const SlowGraphBuild: Story = {
  args: {
    execution: {
      ...baseExecution,
      graphBuildDurationMicros: 5000, // 5ms - exceeds 1ms threshold
    },
    onClose: () => console.log('Close clicked'),
  },
};

/**
 * Execution with no output data
 */
export const NoOutput: Story = {
  args: {
    execution: {
      ...baseExecution,
      output: {},
    },
    onClose: () => console.log('Close clicked'),
  },
};

/**
 * Execution with large output data
 */
export const LargeOutput: Story = {
  args: {
    execution: {
      ...baseExecution,
      output: {
        users: Array.from({ length: 5 }, (_, i) => ({
          id: `usr-${i}`,
          name: `User ${i}`,
          email: `user${i}@example.com`,
          role: 'member',
        })),
        metadata: {
          total: 5,
          page: 1,
          pageSize: 10,
          hasMore: false,
        },
      },
    },
    onClose: () => console.log('Close clicked'),
  },
};

/**
 * Execution with HTTP response details
 */
export const WithHttpDetails: Story = {
  args: {
    execution: {
      ...baseExecution,
      tasks: [
        {
          taskId: 'api-call',
          taskRef: 'external-api',
          status: 'success',
          durationMs: 450,
          retryCount: 0,
          output: { result: 'ok' },
          httpResponse: {
            statusCode: 200,
            headers: {
              'Content-Type': 'application/json',
              'X-Request-Id': 'req-123456',
              'X-Rate-Limit-Remaining': '99',
              'Cache-Control': 'max-age=3600',
            },
            body: { status: 'ok', data: { processed: true } },
          },
        },
      ],
    },
    onClose: () => console.log('Close clicked'),
  },
};

/**
 * Execution with mixed task statuses
 */
export const MixedTaskStatuses: Story = {
  args: {
    execution: {
      ...baseExecution,
      success: false,
      error: 'Workflow partially completed',
      tasks: [
        {
          taskId: 'task-1',
          taskRef: 'service-a',
          status: 'success',
          durationMs: 200,
          retryCount: 0,
          output: { step: 1 },
        },
        {
          taskId: 'task-2',
          taskRef: 'service-b',
          status: 'failed',
          durationMs: 1500,
          retryCount: 2,
          error: 'Service unavailable',
        },
        {
          taskId: 'task-3',
          taskRef: 'service-c',
          status: 'skipped',
          durationMs: 0,
          retryCount: 0,
        },
        {
          taskId: 'task-4',
          taskRef: 'service-d',
          status: 'pending',
          durationMs: 0,
          retryCount: 0,
        },
      ],
    },
    onClose: () => console.log('Close clicked'),
  },
};
