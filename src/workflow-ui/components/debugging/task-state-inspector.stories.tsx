import type { Meta, StoryObj } from '@storybook/react';
import { TaskStateInspector, type TaskState } from './task-state-inspector';

/**
 * TaskStateInspector displays detailed task state for debugging.
 *
 * Features:
 * - Task status with timing information
 * - Input/output JSON display
 * - Toggle between formatted and raw JSON
 * - Copy output to clipboard
 * - Highlight changed values when comparing states
 */
const meta = {
  title: 'Debugging/TaskStateInspector',
  component: TaskStateInspector,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="w-[500px] border rounded-lg">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof TaskStateInspector>;

export default meta;
type Story = StoryObj<typeof meta>;

const baseTaskState: TaskState = {
  taskId: 'fetch-user',
  taskName: 'Fetch User Data',
  status: 'Succeeded',
  input: {
    userId: 'usr-123',
    includeProfile: true,
  },
  output: {
    id: 'usr-123',
    name: 'John Doe',
    email: 'john@example.com',
    profile: {
      avatar: 'https://example.com/avatar.jpg',
      bio: 'Software developer',
    },
  },
  startTime: '2024-01-15T10:00:00Z',
  endTime: '2024-01-15T10:00:01Z',
  duration: '1000ms',
};

/**
 * Default succeeded task state
 */
export const Default: Story = {
  args: {
    taskState: baseTaskState,
  },
};

/**
 * No task selected
 */
export const Empty: Story = {
  args: {
    taskState: null,
  },
};

/**
 * Failed task state
 */
export const FailedTask: Story = {
  args: {
    taskState: {
      ...baseTaskState,
      taskName: 'Send Email',
      status: 'Failed',
      output: {},
      duration: '30000ms',
    },
  },
};

/**
 * Task with complex nested output
 */
export const ComplexOutput: Story = {
  args: {
    taskState: {
      ...baseTaskState,
      taskName: 'Aggregate Data',
      output: {
        users: [
          { id: 'usr-1', name: 'Alice', status: 'active' },
          { id: 'usr-2', name: 'Bob', status: 'pending' },
          { id: 'usr-3', name: 'Charlie', status: 'inactive' },
        ],
        orders: [
          { id: 'ord-1', total: 99.99, items: 3 },
          { id: 'ord-2', total: 149.99, items: 5 },
        ],
        metadata: {
          processedAt: '2024-01-15T10:00:01Z',
          recordCount: 5,
          source: 'api-gateway',
        },
      },
    },
  },
};

/**
 * With previous state for comparison (showing changed values)
 */
export const WithComparison: Story = {
  args: {
    taskState: {
      ...baseTaskState,
      output: {
        id: 'usr-123',
        name: 'John Doe Updated',
        email: 'john.new@example.com',
      },
    },
    previousState: {
      ...baseTaskState,
      output: {
        id: 'usr-123',
        name: 'John Doe',
        email: 'john@example.com',
      },
    },
  },
};

/**
 * Task with minimal input/output
 */
export const MinimalData: Story = {
  args: {
    taskState: {
      taskId: 'health-check',
      taskName: 'Health Check',
      status: 'Succeeded',
      input: {},
      output: { healthy: true },
      startTime: '2024-01-15T10:00:00Z',
      endTime: '2024-01-15T10:00:00Z',
      duration: '50ms',
    },
  },
};

/**
 * Long running task
 */
export const LongRunningTask: Story = {
  args: {
    taskState: {
      ...baseTaskState,
      taskName: 'Data Processing',
      duration: '45000ms',
      output: {
        recordsProcessed: 100000,
        errors: 0,
        warnings: 12,
      },
    },
  },
};
