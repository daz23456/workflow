import type { Meta, StoryObj } from '@storybook/react';
import { StepThroughController, type ExecutionState } from './step-through-controller';

/**
 * StepThroughController provides controls for step-through debugging.
 *
 * Features:
 * - Pause/Resume execution
 * - Step forward one task at a time
 * - Skip to specific task
 * - Progress indicator
 * - Completed/pending task lists
 */
const meta = {
  title: 'Debugging/StepThroughController',
  component: StepThroughController,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="w-[600px]">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof StepThroughController>;

export default meta;
type Story = StoryObj<typeof meta>;

const baseExecutionState: ExecutionState = {
  executionId: 'exec-12345',
  workflowName: 'user-signup',
  status: 'Running',
  currentTaskId: 'create-user',
  completedTasks: ['validate-input'],
  pendingTasks: ['create-user', 'send-email', 'update-analytics'],
};

/**
 * Running state with controls visible
 */
export const Running: Story = {
  args: {
    executionState: baseExecutionState,
    onPause: () => console.log('Paused'),
    onResume: () => console.log('Resumed'),
    onStepForward: () => console.log('Step forward'),
    onSkipTo: (taskId) => console.log('Skip to:', taskId),
  },
};

/**
 * Paused state with step controls
 */
export const Paused: Story = {
  args: {
    executionState: {
      ...baseExecutionState,
      status: 'Paused',
    },
    onPause: () => console.log('Paused'),
    onResume: () => console.log('Resumed'),
    onStepForward: () => console.log('Step forward'),
    onSkipTo: (taskId) => console.log('Skip to:', taskId),
  },
};

/**
 * Succeeded execution (controls hidden)
 */
export const Succeeded: Story = {
  args: {
    executionState: {
      ...baseExecutionState,
      status: 'Succeeded',
      currentTaskId: null,
      completedTasks: ['validate-input', 'create-user', 'send-email', 'update-analytics'],
      pendingTasks: [],
    },
    onPause: () => console.log('Paused'),
    onResume: () => console.log('Resumed'),
  },
};

/**
 * Failed execution
 */
export const Failed: Story = {
  args: {
    executionState: {
      ...baseExecutionState,
      status: 'Failed',
      currentTaskId: null,
      completedTasks: ['validate-input', 'create-user'],
      pendingTasks: ['send-email', 'update-analytics'],
    },
    onPause: () => console.log('Paused'),
    onResume: () => console.log('Resumed'),
  },
};

/**
 * At start - no completed tasks
 */
export const AtStart: Story = {
  args: {
    executionState: {
      ...baseExecutionState,
      currentTaskId: 'validate-input',
      completedTasks: [],
      pendingTasks: ['validate-input', 'create-user', 'send-email', 'update-analytics'],
    },
    onPause: () => console.log('Paused'),
    onResume: () => console.log('Resumed'),
    onStepForward: () => console.log('Step forward'),
    onSkipTo: (taskId) => console.log('Skip to:', taskId),
  },
};

/**
 * Near completion
 */
export const NearCompletion: Story = {
  args: {
    executionState: {
      ...baseExecutionState,
      currentTaskId: 'update-analytics',
      completedTasks: ['validate-input', 'create-user', 'send-email'],
      pendingTasks: ['update-analytics'],
    },
    onPause: () => console.log('Paused'),
    onResume: () => console.log('Resumed'),
    onStepForward: () => console.log('Step forward'),
    onSkipTo: (taskId) => console.log('Skip to:', taskId),
  },
};

/**
 * Many tasks (scrolling)
 */
export const ManyTasks: Story = {
  args: {
    executionState: {
      ...baseExecutionState,
      completedTasks: Array.from({ length: 8 }, (_, i) => `task-${i + 1}`),
      pendingTasks: Array.from({ length: 5 }, (_, i) => `task-${i + 9}`),
      currentTaskId: 'task-9',
    },
    onPause: () => console.log('Paused'),
    onResume: () => console.log('Resumed'),
    onStepForward: () => console.log('Step forward'),
    onSkipTo: (taskId) => console.log('Skip to:', taskId),
  },
};
