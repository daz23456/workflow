import type { Meta, StoryObj } from '@storybook/react';
import { WorkflowGraphDebugger, type GraphData } from './workflow-graph-debugger';

/**
 * WorkflowGraphDebugger provides interactive workflow graph visualization for debugging.
 *
 * Features:
 * - Zoom controls (in, out, reset, fit)
 * - Layout switching (horizontal/vertical)
 * - Node status visualization (completed, running, failed, pending)
 * - Click nodes to see details
 * - Data flow indicators on edges
 * - Execution path highlighting
 */
const meta = {
  title: 'Debugging/WorkflowGraphDebugger',
  component: WorkflowGraphDebugger,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="w-[700px] h-[500px] border rounded-lg">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof WorkflowGraphDebugger>;

export default meta;
type Story = StoryObj<typeof meta>;

const simpleGraphData: GraphData = {
  nodes: [
    { id: 'validate', label: 'Validate Input', type: 'task' },
    { id: 'create-user', label: 'Create User', type: 'task' },
    { id: 'send-email', label: 'Send Email', type: 'task' },
  ],
  edges: [
    { id: 'edge-1', source: 'validate', target: 'create-user' },
    { id: 'edge-2', source: 'create-user', target: 'send-email' },
  ],
};

const complexGraphData: GraphData = {
  nodes: [
    { id: 'start', label: 'Start', type: 'start' },
    { id: 'validate', label: 'Validate Input', type: 'task' },
    { id: 'fetch-user', label: 'Fetch User', type: 'task' },
    { id: 'fetch-orders', label: 'Fetch Orders', type: 'task' },
    { id: 'aggregate', label: 'Aggregate Data', type: 'task' },
    { id: 'transform', label: 'Transform', type: 'task' },
    { id: 'notify', label: 'Send Notification', type: 'task' },
    { id: 'end', label: 'End', type: 'end' },
  ],
  edges: [
    { id: 'edge-1', source: 'start', target: 'validate' },
    { id: 'edge-2', source: 'validate', target: 'fetch-user' },
    { id: 'edge-3', source: 'validate', target: 'fetch-orders' },
    { id: 'edge-4', source: 'fetch-user', target: 'aggregate' },
    { id: 'edge-5', source: 'fetch-orders', target: 'aggregate' },
    { id: 'edge-6', source: 'aggregate', target: 'transform' },
    { id: 'edge-7', source: 'transform', target: 'notify' },
    { id: 'edge-8', source: 'notify', target: 'end' },
  ],
};

/**
 * Default graph with no execution state
 */
export const Default: Story = {
  args: {
    graphData: simpleGraphData,
  },
};

/**
 * Empty graph - no nodes
 */
export const Empty: Story = {
  args: {
    graphData: {
      nodes: [],
      edges: [],
    },
  },
};

/**
 * Graph with running execution (midway through)
 */
export const RunningExecution: Story = {
  args: {
    graphData: simpleGraphData,
    executionState: {
      completedTasks: ['validate'],
      runningTasks: ['create-user'],
      failedTasks: [],
      pendingTasks: ['send-email'],
    },
  },
};

/**
 * Completed successful execution
 */
export const CompletedSuccess: Story = {
  args: {
    graphData: simpleGraphData,
    executionState: {
      completedTasks: ['validate', 'create-user', 'send-email'],
      runningTasks: [],
      failedTasks: [],
      pendingTasks: [],
    },
    highlightPath: true,
  },
};

/**
 * Failed execution with error details
 */
export const FailedExecution: Story = {
  args: {
    graphData: simpleGraphData,
    executionState: {
      completedTasks: ['validate', 'create-user'],
      runningTasks: [],
      failedTasks: ['send-email'],
      pendingTasks: [],
      taskErrors: {
        'send-email': 'SMTP connection timeout after 30s',
      },
    },
    highlightPath: true,
  },
};

/**
 * Graph with data flow indicators
 */
export const WithDataFlow: Story = {
  args: {
    graphData: simpleGraphData,
    executionState: {
      completedTasks: ['validate', 'create-user'],
      runningTasks: ['send-email'],
      failedTasks: [],
      pendingTasks: [],
      taskData: {
        validate: { valid: true, email: 'user@example.com' },
        'create-user': { userId: 'usr-123', created: true },
      },
    },
    showDataFlow: true,
    highlightPath: true,
  },
};

/**
 * Complex workflow graph
 */
export const ComplexWorkflow: Story = {
  args: {
    graphData: complexGraphData,
    executionState: {
      completedTasks: ['start', 'validate', 'fetch-user', 'fetch-orders', 'aggregate'],
      runningTasks: ['transform'],
      failedTasks: [],
      pendingTasks: ['notify', 'end'],
      taskData: {
        validate: { inputValid: true },
        'fetch-user': { userId: 'usr-123', name: 'John Doe' },
        'fetch-orders': { orders: [{ id: 1 }, { id: 2 }] },
        aggregate: { totalOrders: 2, userData: { name: 'John Doe' } },
      },
    },
    showDataFlow: true,
    highlightPath: true,
  },
};

/**
 * Path highlighting showing execution flow
 */
export const PathHighlighting: Story = {
  args: {
    graphData: simpleGraphData,
    executionState: {
      completedTasks: ['validate'],
      runningTasks: ['create-user'],
      failedTasks: [],
      pendingTasks: ['send-email'],
    },
    highlightPath: true,
  },
};

/**
 * Single task workflow
 */
export const SingleTask: Story = {
  args: {
    graphData: {
      nodes: [{ id: 'health-check', label: 'Health Check', type: 'task' }],
      edges: [],
    },
    executionState: {
      completedTasks: [],
      runningTasks: ['health-check'],
      failedTasks: [],
      pendingTasks: [],
    },
  },
};

/**
 * Multiple failed tasks
 */
export const MultipleFailures: Story = {
  args: {
    graphData: complexGraphData,
    executionState: {
      completedTasks: ['start', 'validate'],
      runningTasks: [],
      failedTasks: ['fetch-user', 'fetch-orders'],
      pendingTasks: ['aggregate', 'transform', 'notify', 'end'],
      taskErrors: {
        'fetch-user': 'User service unavailable',
        'fetch-orders': 'Orders API returned 500',
      },
    },
    highlightPath: true,
  },
};
