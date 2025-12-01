import type { Meta, StoryObj } from '@storybook/react';
import { ExecutionComparison, type ExecutionDetails } from './execution-comparison';

/**
 * ExecutionComparison provides side-by-side comparison of two executions.
 *
 * Features:
 * - Side-by-side execution display
 * - Show only differences toggle
 * - Swap executions button
 * - Task-level diff highlighting
 * - JSON formatted input/output display
 */
const meta = {
  title: 'Debugging/ExecutionComparison',
  component: ExecutionComparison,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="w-[900px] border rounded-lg">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ExecutionComparison>;

export default meta;
type Story = StoryObj<typeof meta>;

const baseExecution1: ExecutionDetails = {
  id: 'exec-001',
  workflowName: 'user-signup',
  status: 'Succeeded',
  startedAt: '2024-01-15T10:00:00Z',
  completedAt: '2024-01-15T10:00:02Z',
  duration: '2000ms',
  tasks: [
    {
      taskId: 'validate-input',
      taskName: 'Validate Input',
      status: 'Succeeded',
      input: { email: 'user@example.com' },
      output: { valid: true },
      duration: '100ms',
    },
    {
      taskId: 'create-user',
      taskName: 'Create User',
      status: 'Succeeded',
      input: { email: 'user@example.com' },
      output: { userId: 'usr-123', created: true },
      duration: '1000ms',
    },
    {
      taskId: 'send-email',
      taskName: 'Send Email',
      status: 'Succeeded',
      input: { userId: 'usr-123' },
      output: { sent: true, messageId: 'msg-456' },
      duration: '900ms',
    },
  ],
};

const baseExecution2: ExecutionDetails = {
  id: 'exec-002',
  workflowName: 'user-signup',
  status: 'Succeeded',
  startedAt: '2024-01-15T11:00:00Z',
  completedAt: '2024-01-15T11:00:03Z',
  duration: '3000ms',
  tasks: [
    {
      taskId: 'validate-input',
      taskName: 'Validate Input',
      status: 'Succeeded',
      input: { email: 'other@example.com' },
      output: { valid: true },
      duration: '150ms',
    },
    {
      taskId: 'create-user',
      taskName: 'Create User',
      status: 'Succeeded',
      input: { email: 'other@example.com' },
      output: { userId: 'usr-456', created: true },
      duration: '1500ms',
    },
    {
      taskId: 'send-email',
      taskName: 'Send Email',
      status: 'Succeeded',
      input: { userId: 'usr-456' },
      output: { sent: true, messageId: 'msg-789' },
      duration: '1350ms',
    },
  ],
};

/**
 * Default comparison between two successful executions with differences
 */
export const Default: Story = {
  args: {
    execution1: baseExecution1,
    execution2: baseExecution2,
  },
};

/**
 * Identical executions - shows "no differences" message
 */
export const IdenticalExecutions: Story = {
  args: {
    execution1: baseExecution1,
    execution2: baseExecution1,
  },
};

/**
 * Comparing succeeded vs failed execution
 */
export const SucceededVsFailed: Story = {
  args: {
    execution1: baseExecution1,
    execution2: {
      ...baseExecution2,
      status: 'Failed',
      tasks: [
        baseExecution2.tasks[0],
        baseExecution2.tasks[1],
        {
          ...baseExecution2.tasks[2],
          status: 'Failed',
          output: null,
          error: 'SMTP connection timeout after 30s',
        },
      ],
    },
  },
};

/**
 * Different number of tasks (partial execution)
 */
export const DifferentTaskCount: Story = {
  args: {
    execution1: baseExecution1,
    execution2: {
      ...baseExecution2,
      status: 'Failed',
      tasks: [
        baseExecution2.tasks[0],
        {
          taskId: 'create-user',
          taskName: 'Create User',
          status: 'Failed',
          input: { email: 'other@example.com' },
          output: null,
          error: 'Database connection failed',
          duration: '5000ms',
        },
      ],
    },
  },
};

/**
 * Complex nested output differences
 */
export const ComplexOutputDifferences: Story = {
  args: {
    execution1: {
      ...baseExecution1,
      tasks: [
        {
          taskId: 'aggregate',
          taskName: 'Aggregate Data',
          status: 'Succeeded',
          input: { source: 'api' },
          output: {
            users: [
              { id: 1, name: 'Alice', active: true },
              { id: 2, name: 'Bob', active: false },
            ],
            count: 2,
            metadata: { version: '1.0' },
          },
          duration: '500ms',
        },
      ],
    },
    execution2: {
      ...baseExecution2,
      tasks: [
        {
          taskId: 'aggregate',
          taskName: 'Aggregate Data',
          status: 'Succeeded',
          input: { source: 'api' },
          output: {
            users: [
              { id: 1, name: 'Alice', active: true },
              { id: 2, name: 'Bob', active: true },
              { id: 3, name: 'Charlie', active: true },
            ],
            count: 3,
            metadata: { version: '1.1' },
          },
          duration: '750ms',
        },
      ],
    },
  },
};

/**
 * Duration differences only (same outputs)
 */
export const DurationDifferencesOnly: Story = {
  args: {
    execution1: baseExecution1,
    execution2: {
      ...baseExecution1,
      id: 'exec-002',
      startedAt: '2024-01-15T11:00:00Z',
      completedAt: '2024-01-15T11:00:10Z',
      duration: '10000ms',
      tasks: baseExecution1.tasks.map((task) => ({
        ...task,
        duration: `${parseInt(task.duration) * 5}ms`,
      })),
    },
  },
};

/**
 * Many tasks comparison (scrolling)
 */
export const ManyTasks: Story = {
  args: {
    execution1: {
      ...baseExecution1,
      tasks: Array.from({ length: 8 }, (_, i) => ({
        taskId: `task-${i + 1}`,
        taskName: `Task ${i + 1}`,
        status: 'Succeeded',
        input: { index: i },
        output: { result: `output-${i}` },
        duration: `${(i + 1) * 100}ms`,
      })),
    },
    execution2: {
      ...baseExecution2,
      tasks: Array.from({ length: 8 }, (_, i) => ({
        taskId: `task-${i + 1}`,
        taskName: `Task ${i + 1}`,
        status: i === 5 ? 'Failed' : 'Succeeded',
        input: { index: i },
        output: i === 5 ? null : { result: `output-${i}-modified` },
        error: i === 5 ? 'Task failed' : undefined,
        duration: `${(i + 1) * 150}ms`,
      })),
    },
  },
};
