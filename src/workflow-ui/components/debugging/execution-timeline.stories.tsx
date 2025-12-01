import type { Meta, StoryObj } from '@storybook/react';
import { ExecutionTimeline, type ExecutionEvent } from './execution-timeline';

/**
 * ExecutionTimeline displays a timeline of workflow execution events.
 *
 * Features:
 * - Timeline scrubber for time-travel debugging
 * - Event list with status and timestamps
 * - Click events to jump to that point in time
 * - Keyboard navigation (arrow keys)
 * - Hover to see additional details
 */
const meta = {
  title: 'Debugging/ExecutionTimeline',
  component: ExecutionTimeline,
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
} satisfies Meta<typeof ExecutionTimeline>;

export default meta;
type Story = StoryObj<typeof meta>;

const baseTime = new Date('2024-01-15T10:00:00Z');

const createEvents = (offsetMs: number[]): ExecutionEvent[] => {
  return [
    {
      id: 'wf-start',
      type: 'workflow_started',
      timestamp: new Date(baseTime.getTime() + offsetMs[0]).toISOString(),
      workflowName: 'user-signup',
    },
    {
      id: 'task-1-start',
      type: 'task_started',
      timestamp: new Date(baseTime.getTime() + offsetMs[1]).toISOString(),
      taskId: 'validate-input',
      taskName: 'Input Validator',
    },
    {
      id: 'task-1-complete',
      type: 'task_completed',
      timestamp: new Date(baseTime.getTime() + offsetMs[2]).toISOString(),
      taskId: 'validate-input',
      taskName: 'Input Validator',
      status: 'Succeeded',
    },
    {
      id: 'task-2-start',
      type: 'task_started',
      timestamp: new Date(baseTime.getTime() + offsetMs[3]).toISOString(),
      taskId: 'create-user',
      taskName: 'User Service',
    },
    {
      id: 'task-2-complete',
      type: 'task_completed',
      timestamp: new Date(baseTime.getTime() + offsetMs[4]).toISOString(),
      taskId: 'create-user',
      taskName: 'User Service',
      status: 'Succeeded',
    },
    {
      id: 'wf-complete',
      type: 'workflow_completed',
      timestamp: new Date(baseTime.getTime() + offsetMs[5]).toISOString(),
      workflowName: 'user-signup',
    },
  ];
};

const successfulEvents = createEvents([0, 100, 200, 210, 1500, 1510]);

/**
 * Default timeline with successful execution
 */
export const Default: Story = {
  args: {
    events: successfulEvents,
    onTimeChange: (timestamp) => console.log('Time changed:', timestamp),
  },
};

/**
 * Empty timeline - no events
 */
export const Empty: Story = {
  args: {
    events: [],
    onTimeChange: (timestamp) => console.log('Time changed:', timestamp),
  },
};

/**
 * Long running workflow with many events
 */
export const LongWorkflow: Story = {
  args: {
    events: [
      { id: 'wf-start', type: 'workflow_started', timestamp: baseTime.toISOString(), workflowName: 'data-pipeline' },
      ...Array.from({ length: 10 }, (_, i) => [
        { id: `task-${i}-start`, type: 'task_started' as const, timestamp: new Date(baseTime.getTime() + i * 2000).toISOString(), taskId: `task-${i}`, taskName: `Task ${i + 1}` },
        { id: `task-${i}-complete`, type: 'task_completed' as const, timestamp: new Date(baseTime.getTime() + i * 2000 + 1500).toISOString(), taskId: `task-${i}`, taskName: `Task ${i + 1}`, status: 'Succeeded' },
      ]).flat(),
      { id: 'wf-complete', type: 'workflow_completed', timestamp: new Date(baseTime.getTime() + 21000).toISOString(), workflowName: 'data-pipeline' },
    ],
    onTimeChange: (timestamp) => console.log('Time changed:', timestamp),
  },
};

/**
 * Failed workflow execution
 */
export const FailedExecution: Story = {
  args: {
    events: [
      { id: 'wf-start', type: 'workflow_started', timestamp: baseTime.toISOString(), workflowName: 'user-signup' },
      { id: 'task-1-start', type: 'task_started', timestamp: new Date(baseTime.getTime() + 100).toISOString(), taskId: 'validate-input', taskName: 'Input Validator' },
      { id: 'task-1-complete', type: 'task_completed', timestamp: new Date(baseTime.getTime() + 200).toISOString(), taskId: 'validate-input', taskName: 'Input Validator', status: 'Succeeded' },
      { id: 'task-2-start', type: 'task_started', timestamp: new Date(baseTime.getTime() + 210).toISOString(), taskId: 'create-user', taskName: 'User Service' },
      { id: 'task-2-complete', type: 'task_completed', timestamp: new Date(baseTime.getTime() + 5000).toISOString(), taskId: 'create-user', taskName: 'User Service', status: 'Failed' },
      { id: 'wf-complete', type: 'workflow_completed', timestamp: new Date(baseTime.getTime() + 5010).toISOString(), workflowName: 'user-signup' },
    ],
    onTimeChange: (timestamp) => console.log('Time changed:', timestamp),
  },
};

/**
 * Single task workflow
 */
export const SingleTask: Story = {
  args: {
    events: [
      { id: 'wf-start', type: 'workflow_started', timestamp: baseTime.toISOString(), workflowName: 'health-check' },
      { id: 'task-1-start', type: 'task_started', timestamp: new Date(baseTime.getTime() + 10).toISOString(), taskId: 'check', taskName: 'Health Check' },
      { id: 'task-1-complete', type: 'task_completed', timestamp: new Date(baseTime.getTime() + 50).toISOString(), taskId: 'check', taskName: 'Health Check', status: 'Succeeded' },
      { id: 'wf-complete', type: 'workflow_completed', timestamp: new Date(baseTime.getTime() + 55).toISOString(), workflowName: 'health-check' },
    ],
    onTimeChange: (timestamp) => console.log('Time changed:', timestamp),
  },
};
