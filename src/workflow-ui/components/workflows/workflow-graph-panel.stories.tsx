import type { Meta, StoryObj } from '@storybook/react';
import { WorkflowGraphPanel } from './workflow-graph-panel';
import type { WorkflowGraph } from '@/types/workflow';

/**
 * WorkflowGraphPanel displays a visual graph representation of workflow tasks and dependencies.
 *
 * Features:
 * - React Flow-based interactive graph
 * - Auto-layout using dagre algorithm
 * - Parallel task highlighting (blue border)
 * - Click on nodes to view task details
 * - Zoom/pan controls
 * - Support for different layout directions (TB/LR)
 */
const meta = {
  title: 'Workflows/WorkflowGraphPanel',
  component: WorkflowGraphPanel,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div style={{ height: '600px', width: '100%' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof WorkflowGraphPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

const simpleGraph: WorkflowGraph = {
  nodes: [
    { id: 'start', type: 'start', data: { label: 'Start' } },
    { id: 'validate', type: 'task', data: { label: 'Validate Input' } },
    { id: 'process', type: 'task', data: { label: 'Process Data' } },
    { id: 'end', type: 'end', data: { label: 'End' } },
  ],
  edges: [
    { source: 'start', target: 'validate' },
    { source: 'validate', target: 'process' },
    { source: 'process', target: 'end' },
  ],
  parallelGroups: [],
};

const parallelGraph: WorkflowGraph = {
  nodes: [
    { id: 'start', type: 'start', data: { label: 'Start' } },
    { id: 'validate', type: 'task', data: { label: 'Validate Input' } },
    { id: 'fetch-user', type: 'task', data: { label: 'Fetch User' } },
    { id: 'fetch-orders', type: 'task', data: { label: 'Fetch Orders' } },
    { id: 'fetch-products', type: 'task', data: { label: 'Fetch Products' } },
    { id: 'aggregate', type: 'task', data: { label: 'Aggregate Data' } },
    { id: 'end', type: 'end', data: { label: 'End' } },
  ],
  edges: [
    { source: 'start', target: 'validate' },
    { source: 'validate', target: 'fetch-user' },
    { source: 'validate', target: 'fetch-orders' },
    { source: 'validate', target: 'fetch-products' },
    { source: 'fetch-user', target: 'aggregate' },
    { source: 'fetch-orders', target: 'aggregate' },
    { source: 'fetch-products', target: 'aggregate' },
    { source: 'aggregate', target: 'end' },
  ],
  parallelGroups: [
    { level: 1, taskIds: ['fetch-user', 'fetch-orders', 'fetch-products'] },
  ],
};

const complexGraph: WorkflowGraph = {
  nodes: [
    { id: 'start', type: 'start', data: { label: 'Start' } },
    { id: 'auth', type: 'task', data: { label: 'Authenticate' } },
    { id: 'validate', type: 'task', data: { label: 'Validate Input' } },
    { id: 'fetch-user', type: 'task', data: { label: 'Fetch User Data' } },
    { id: 'fetch-config', type: 'task', data: { label: 'Fetch Config' } },
    { id: 'check-permissions', type: 'task', data: { label: 'Check Permissions' } },
    { id: 'process-a', type: 'task', data: { label: 'Process Stream A' } },
    { id: 'process-b', type: 'task', data: { label: 'Process Stream B' } },
    { id: 'merge', type: 'task', data: { label: 'Merge Results' } },
    { id: 'notify', type: 'task', data: { label: 'Send Notification' } },
    { id: 'cleanup', type: 'task', data: { label: 'Cleanup' } },
    { id: 'end', type: 'end', data: { label: 'End' } },
  ],
  edges: [
    { source: 'start', target: 'auth' },
    { source: 'auth', target: 'validate' },
    { source: 'validate', target: 'fetch-user' },
    { source: 'validate', target: 'fetch-config' },
    { source: 'fetch-user', target: 'check-permissions' },
    { source: 'fetch-config', target: 'check-permissions' },
    { source: 'check-permissions', target: 'process-a' },
    { source: 'check-permissions', target: 'process-b' },
    { source: 'process-a', target: 'merge' },
    { source: 'process-b', target: 'merge' },
    { source: 'merge', target: 'notify' },
    { source: 'notify', target: 'cleanup' },
    { source: 'cleanup', target: 'end' },
  ],
  parallelGroups: [
    { level: 1, taskIds: ['fetch-user', 'fetch-config'] },
    { level: 2, taskIds: ['process-a', 'process-b'] },
  ],
};

/**
 * Simple linear workflow with sequential tasks
 */
export const SimpleLinear: Story = {
  args: {
    graph: simpleGraph,
    onNodeClick: (nodeId) => console.log('Clicked node:', nodeId),
  },
};

/**
 * Workflow with parallel task execution
 */
export const WithParallelTasks: Story = {
  args: {
    graph: parallelGraph,
    onNodeClick: (nodeId) => console.log('Clicked node:', nodeId),
  },
};

/**
 * Complex workflow with multiple parallel groups
 */
export const ComplexWorkflow: Story = {
  args: {
    graph: complexGraph,
    onNodeClick: (nodeId) => console.log('Clicked node:', nodeId),
  },
};

/**
 * Left-to-right layout direction
 */
export const LeftToRightLayout: Story = {
  args: {
    graph: parallelGraph,
    direction: 'LR',
    onNodeClick: (nodeId) => console.log('Clicked node:', nodeId),
  },
};

/**
 * Empty graph with no tasks
 */
export const EmptyGraph: Story = {
  args: {
    graph: {
      nodes: [],
      edges: [],
      parallelGroups: [],
    },
  },
};

/**
 * Single task workflow
 */
export const SingleTask: Story = {
  args: {
    graph: {
      nodes: [
        { id: 'start', type: 'start', data: { label: 'Start' } },
        { id: 'task', type: 'task', data: { label: 'Process' } },
        { id: 'end', type: 'end', data: { label: 'End' } },
      ],
      edges: [
        { source: 'start', target: 'task' },
        { source: 'task', target: 'end' },
      ],
      parallelGroups: [],
    },
    onNodeClick: (nodeId) => console.log('Clicked node:', nodeId),
  },
};

/**
 * Long workflow with many sequential tasks
 */
export const LongSequential: Story = {
  args: {
    graph: {
      nodes: [
        { id: 'start', type: 'start', data: { label: 'Start' } },
        ...Array.from({ length: 8 }, (_, i) => ({
          id: `task-${i + 1}`,
          type: 'task' as const,
          data: { label: `Step ${i + 1}` },
        })),
        { id: 'end', type: 'end', data: { label: 'End' } },
      ],
      edges: [
        { source: 'start', target: 'task-1' },
        ...Array.from({ length: 7 }, (_, i) => ({
          source: `task-${i + 1}`,
          target: `task-${i + 2}`,
        })),
        { source: 'task-8', target: 'end' },
      ],
      parallelGroups: [],
    },
    onNodeClick: (nodeId) => console.log('Clicked node:', nodeId),
  },
};

/**
 * Wide workflow with many parallel branches
 */
export const WideParallel: Story = {
  args: {
    graph: {
      nodes: [
        { id: 'start', type: 'start', data: { label: 'Start' } },
        { id: 'split', type: 'task', data: { label: 'Split' } },
        ...Array.from({ length: 6 }, (_, i) => ({
          id: `branch-${i + 1}`,
          type: 'task' as const,
          data: { label: `Branch ${i + 1}` },
        })),
        { id: 'join', type: 'task', data: { label: 'Join' } },
        { id: 'end', type: 'end', data: { label: 'End' } },
      ],
      edges: [
        { source: 'start', target: 'split' },
        ...Array.from({ length: 6 }, (_, i) => ({
          source: 'split',
          target: `branch-${i + 1}`,
        })),
        ...Array.from({ length: 6 }, (_, i) => ({
          source: `branch-${i + 1}`,
          target: 'join',
        })),
        { source: 'join', target: 'end' },
      ],
      parallelGroups: [
        {
          level: 1,
          taskIds: ['branch-1', 'branch-2', 'branch-3', 'branch-4', 'branch-5', 'branch-6'],
        },
      ],
    },
    onNodeClick: (nodeId) => console.log('Clicked node:', nodeId),
  },
};
