import type { Meta, StoryObj } from '@storybook/react';
import { DebugLayout, type DebugLayoutProps } from './debug-layout';
import type { ExecutionTraceResponse } from '@/lib/api/types';
import type { WorkflowExecutionResponse } from '@/types/execution';

/**
 * DebugLayout is the main debugging orchestration component.
 *
 * Features:
 * - Header with execution status and back navigation
 * - Three tabs: Timeline, Inspect, Compare
 * - Left panel: Interactive workflow graph
 * - Right panel: Debug tools (timeline, inspector, comparison)
 * - Time-travel debugging via timeline scrubber
 * - Variable watching with pin support
 */
const meta = {
  title: 'Debugging/DebugLayout',
  component: DebugLayout,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="h-[700px]">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof DebugLayout>;

export default meta;
type Story = StoryObj<typeof meta>;

const mockExecutionDetail: WorkflowExecutionResponse = {
  success: true,
  executionId: 'exec-12345678-abcd-1234-efgh-567890abcdef',
  startedAt: '2024-01-15T10:00:00Z',
  completedAt: '2024-01-15T10:00:02.500Z',
  executionTimeMs: 2500,
  input: {
    email: 'user@example.com',
    name: 'John Doe',
  },
  output: {
    userId: 'usr-123',
    welcomeEmailSent: true,
  },
  tasks: [
    {
      taskId: 'validate-input',
      taskRef: 'Validate Input',
      status: 'Succeeded',
      startedAt: '2024-01-15T10:00:00Z',
      completedAt: '2024-01-15T10:00:00.100Z',
      durationMs: 100,
      input: { email: 'user@example.com', name: 'John Doe' },
      output: { valid: true, normalizedEmail: 'user@example.com' },
    },
    {
      taskId: 'create-user',
      taskRef: 'Create User',
      status: 'Succeeded',
      startedAt: '2024-01-15T10:00:00.100Z',
      completedAt: '2024-01-15T10:00:01.100Z',
      durationMs: 1000,
      input: { email: 'user@example.com', name: 'John Doe' },
      output: { userId: 'usr-123', created: true },
    },
    {
      taskId: 'send-email',
      taskRef: 'Send Welcome Email',
      status: 'Succeeded',
      startedAt: '2024-01-15T10:00:01.100Z',
      completedAt: '2024-01-15T10:00:02.500Z',
      durationMs: 1400,
      input: { userId: 'usr-123', template: 'welcome' },
      output: { sent: true, messageId: 'msg-456' },
    },
  ],
};

const mockExecutionTrace: ExecutionTraceResponse = {
  executionId: 'exec-12345678-abcd-1234-efgh-567890abcdef',
  workflowName: 'user-signup',
  status: 'Succeeded',
  startedAt: '2024-01-15T10:00:00Z',
  completedAt: '2024-01-15T10:00:02.500Z',
  totalDurationMs: 2500,
  taskTimings: [
    {
      taskId: 'validate-input',
      taskRef: 'Validate Input',
      status: 'Succeeded',
      startedAt: '2024-01-15T10:00:00Z',
      completedAt: '2024-01-15T10:00:00.100Z',
      durationMs: 100,
      waitTimeMs: 0,
      dependencies: [],
    },
    {
      taskId: 'create-user',
      taskRef: 'Create User',
      status: 'Succeeded',
      startedAt: '2024-01-15T10:00:00.100Z',
      completedAt: '2024-01-15T10:00:01.100Z',
      durationMs: 1000,
      waitTimeMs: 100,
      dependencies: ['validate-input'],
    },
    {
      taskId: 'send-email',
      taskRef: 'Send Welcome Email',
      status: 'Succeeded',
      startedAt: '2024-01-15T10:00:01.100Z',
      completedAt: '2024-01-15T10:00:02.500Z',
      durationMs: 1400,
      waitTimeMs: 1100,
      dependencies: ['create-user'],
    },
  ],
};

/**
 * Default successful execution debug view
 */
export const Default: Story = {
  args: {
    executionId: 'exec-12345678-abcd-1234-efgh-567890abcdef',
    workflowName: 'user-signup',
    executionDetail: mockExecutionDetail,
    executionTrace: mockExecutionTrace,
    onSelectComparisonExecution: () => console.log('Select comparison execution'),
  },
};

/**
 * Failed execution with error details
 */
export const FailedExecution: Story = {
  args: {
    executionId: 'exec-failed-1234',
    workflowName: 'user-signup',
    executionDetail: {
      ...mockExecutionDetail,
      success: false,
      completedAt: '2024-01-15T10:00:05Z',
      executionTimeMs: 5000,
      output: {},
      tasks: [
        mockExecutionDetail.tasks[0],
        mockExecutionDetail.tasks[1],
        {
          taskId: 'send-email',
          taskRef: 'Send Welcome Email',
          status: 'Failed',
          startedAt: '2024-01-15T10:00:01.100Z',
          completedAt: '2024-01-15T10:00:05Z',
          durationMs: 3900,
          input: { userId: 'usr-123', template: 'welcome' },
          output: null,
          error: 'SMTP connection timeout: Failed to connect to mail server after 3 retries',
        },
      ],
    },
    executionTrace: {
      ...mockExecutionTrace,
      status: 'Failed',
      completedAt: '2024-01-15T10:00:05Z',
      totalDurationMs: 5000,
      taskTimings: [
        mockExecutionTrace.taskTimings[0],
        mockExecutionTrace.taskTimings[1],
        {
          taskId: 'send-email',
          taskRef: 'Send Welcome Email',
          status: 'Failed',
          startedAt: '2024-01-15T10:00:01.100Z',
          completedAt: '2024-01-15T10:00:05Z',
          durationMs: 3900,
          waitTimeMs: 1100,
          dependencies: ['create-user'],
        },
      ],
    },
    onSelectComparisonExecution: () => console.log('Select comparison execution'),
  },
};

/**
 * With comparison execution loaded
 */
export const WithComparison: Story = {
  args: {
    executionId: 'exec-12345678-abcd-1234-efgh-567890abcdef',
    workflowName: 'user-signup',
    executionDetail: mockExecutionDetail,
    executionTrace: mockExecutionTrace,
    comparisonExecution: {
      id: 'exec-compare-5678',
      workflowName: 'user-signup',
      status: 'Succeeded',
      startedAt: '2024-01-14T15:00:00Z',
      completedAt: '2024-01-14T15:00:03Z',
      duration: '3000ms',
      tasks: [
        {
          taskId: 'validate-input',
          taskName: 'Validate Input',
          status: 'Succeeded',
          input: { email: 'other@example.com', name: 'Jane Doe' },
          output: { valid: true, normalizedEmail: 'other@example.com' },
          duration: '150ms',
        },
        {
          taskId: 'create-user',
          taskName: 'Create User',
          status: 'Succeeded',
          input: { email: 'other@example.com', name: 'Jane Doe' },
          output: { userId: 'usr-456', created: true },
          duration: '1200ms',
        },
        {
          taskId: 'send-email',
          taskName: 'Send Welcome Email',
          status: 'Succeeded',
          input: { userId: 'usr-456', template: 'welcome' },
          output: { sent: true, messageId: 'msg-789' },
          duration: '1650ms',
        },
      ],
    },
    onSelectComparisonExecution: () => console.log('Select comparison execution'),
  },
};

/**
 * Complex workflow with many tasks
 */
export const ComplexWorkflow: Story = {
  args: {
    executionId: 'exec-complex-1234',
    workflowName: 'order-processing',
    executionDetail: {
      success: true,
      executionId: 'exec-complex-1234',
      startedAt: '2024-01-15T10:00:00Z',
      completedAt: '2024-01-15T10:00:10Z',
      executionTimeMs: 10000,
      input: { orderId: 'ord-123', customerId: 'cust-456' },
      output: { orderStatus: 'shipped', trackingNumber: 'TRACK123' },
      tasks: [
        { taskId: 'validate-order', taskRef: 'Validate Order', status: 'Succeeded', startedAt: '2024-01-15T10:00:00Z', completedAt: '2024-01-15T10:00:00.500Z', durationMs: 500, input: {}, output: { valid: true } },
        { taskId: 'check-inventory', taskRef: 'Check Inventory', status: 'Succeeded', startedAt: '2024-01-15T10:00:00.500Z', completedAt: '2024-01-15T10:00:02Z', durationMs: 1500, input: {}, output: { available: true } },
        { taskId: 'reserve-stock', taskRef: 'Reserve Stock', status: 'Succeeded', startedAt: '2024-01-15T10:00:02Z', completedAt: '2024-01-15T10:00:03Z', durationMs: 1000, input: {}, output: { reserved: true } },
        { taskId: 'process-payment', taskRef: 'Process Payment', status: 'Succeeded', startedAt: '2024-01-15T10:00:03Z', completedAt: '2024-01-15T10:00:06Z', durationMs: 3000, input: {}, output: { paid: true } },
        { taskId: 'create-shipment', taskRef: 'Create Shipment', status: 'Succeeded', startedAt: '2024-01-15T10:00:06Z', completedAt: '2024-01-15T10:00:08Z', durationMs: 2000, input: {}, output: { trackingNumber: 'TRACK123' } },
        { taskId: 'send-confirmation', taskRef: 'Send Confirmation', status: 'Succeeded', startedAt: '2024-01-15T10:00:08Z', completedAt: '2024-01-15T10:00:10Z', durationMs: 2000, input: {}, output: { emailSent: true } },
      ],
    },
    executionTrace: {
      executionId: 'exec-complex-1234',
      workflowName: 'order-processing',
      status: 'Succeeded',
      startedAt: '2024-01-15T10:00:00Z',
      completedAt: '2024-01-15T10:00:10Z',
      totalDurationMs: 10000,
      taskTimings: [
        { taskId: 'validate-order', taskRef: 'Validate Order', status: 'Succeeded', startedAt: '2024-01-15T10:00:00Z', completedAt: '2024-01-15T10:00:00.500Z', durationMs: 500, waitTimeMs: 0, dependencies: [] },
        { taskId: 'check-inventory', taskRef: 'Check Inventory', status: 'Succeeded', startedAt: '2024-01-15T10:00:00.500Z', completedAt: '2024-01-15T10:00:02Z', durationMs: 1500, waitTimeMs: 500, dependencies: ['validate-order'] },
        { taskId: 'reserve-stock', taskRef: 'Reserve Stock', status: 'Succeeded', startedAt: '2024-01-15T10:00:02Z', completedAt: '2024-01-15T10:00:03Z', durationMs: 1000, waitTimeMs: 2000, dependencies: ['check-inventory'] },
        { taskId: 'process-payment', taskRef: 'Process Payment', status: 'Succeeded', startedAt: '2024-01-15T10:00:03Z', completedAt: '2024-01-15T10:00:06Z', durationMs: 3000, waitTimeMs: 3000, dependencies: ['reserve-stock'] },
        { taskId: 'create-shipment', taskRef: 'Create Shipment', status: 'Succeeded', startedAt: '2024-01-15T10:00:06Z', completedAt: '2024-01-15T10:00:08Z', durationMs: 2000, waitTimeMs: 6000, dependencies: ['process-payment'] },
        { taskId: 'send-confirmation', taskRef: 'Send Confirmation', status: 'Succeeded', startedAt: '2024-01-15T10:00:08Z', completedAt: '2024-01-15T10:00:10Z', durationMs: 2000, waitTimeMs: 8000, dependencies: ['create-shipment'] },
      ],
    },
    onSelectComparisonExecution: () => console.log('Select comparison execution'),
  },
};

/**
 * Single task execution
 */
export const SingleTask: Story = {
  args: {
    executionId: 'exec-single-1234',
    workflowName: 'health-check',
    executionDetail: {
      success: true,
      executionId: 'exec-single-1234',
      startedAt: '2024-01-15T10:00:00Z',
      completedAt: '2024-01-15T10:00:00.050Z',
      executionTimeMs: 50,
      input: {},
      output: { healthy: true },
      tasks: [
        {
          taskId: 'check',
          taskRef: 'Health Check',
          status: 'Succeeded',
          startedAt: '2024-01-15T10:00:00Z',
          completedAt: '2024-01-15T10:00:00.050Z',
          durationMs: 50,
          input: {},
          output: { healthy: true },
        },
      ],
    },
    executionTrace: {
      executionId: 'exec-single-1234',
      workflowName: 'health-check',
      status: 'Succeeded',
      startedAt: '2024-01-15T10:00:00Z',
      completedAt: '2024-01-15T10:00:00.050Z',
      totalDurationMs: 50,
      taskTimings: [
        {
          taskId: 'check',
          taskRef: 'Health Check',
          status: 'Succeeded',
          startedAt: '2024-01-15T10:00:00Z',
          completedAt: '2024-01-15T10:00:00.050Z',
          durationMs: 50,
          waitTimeMs: 0,
          dependencies: [],
        },
      ],
    },
    onSelectComparisonExecution: () => console.log('Select comparison execution'),
  },
};
