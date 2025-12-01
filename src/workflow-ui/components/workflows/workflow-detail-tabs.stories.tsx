import type { Meta, StoryObj } from '@storybook/react';
import { WorkflowDetailTabs } from './workflow-detail-tabs';
import type { WorkflowDetail } from '@/types/workflow';
import type { ExecutionHistoryItem, WorkflowExecutionResponse } from '@/types/execution';

/**
 * WorkflowDetailTabs is the main container for workflow detail pages.
 *
 * Features:
 * - Tab navigation (Overview, Execute, History)
 * - Workflow graph visualization in Overview tab
 * - Execution input form in Execute tab
 * - Execution history list in History tab
 * - Side panel for task details and execution results
 * - Integration with execution handlers
 */
const meta = {
  title: 'Workflows/WorkflowDetailTabs',
  component: WorkflowDetailTabs,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof WorkflowDetailTabs>;

export default meta;
type Story = StoryObj<typeof meta>;

const baseWorkflow: WorkflowDetail = {
  name: 'user-signup',
  namespace: 'production',
  description: 'Complete user registration flow with email verification and welcome message',
  inputSchema: {
    type: 'object',
    properties: {
      email: { type: 'string', description: 'User email address' },
      username: { type: 'string', description: 'Desired username' },
      age: { type: 'integer', description: 'User age', minimum: 18 },
    },
    required: ['email', 'username'],
  },
  outputSchema: {
    userId: 'string',
    verified: 'boolean',
  },
  tasks: [
    { id: 'validate', taskRef: 'validator', description: 'Validate input' },
    { id: 'create-user', taskRef: 'user-service', description: 'Create user account' },
    { id: 'send-email', taskRef: 'email-service', description: 'Send welcome email' },
  ],
  endpoints: {
    execute: '/api/v1/workflows/user-signup/execute',
    test: '/api/v1/workflows/user-signup/test',
    details: '/api/v1/workflows/user-signup',
  },
  graph: {
    nodes: [
      { id: 'start', type: 'start', data: { label: 'Start' } },
      { id: 'validate', type: 'task', data: { label: 'Validate Input' } },
      { id: 'create-user', type: 'task', data: { label: 'Create User' } },
      { id: 'send-email', type: 'task', data: { label: 'Send Email' } },
      { id: 'end', type: 'end', data: { label: 'End' } },
    ],
    edges: [
      { source: 'start', target: 'validate' },
      { source: 'validate', target: 'create-user' },
      { source: 'create-user', target: 'send-email' },
      { source: 'send-email', target: 'end' },
    ],
    parallelGroups: [],
  },
};

const baseStats = {
  totalExecutions: 12450,
  successRate: 98.5,
  avgDurationMs: 2340,
  lastExecuted: new Date().toISOString(),
};

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

const baseExecutionHistory: ExecutionHistoryItem[] = [
  generateExecution(1, 'success', 5),
  generateExecution(2, 'success', 12),
  generateExecution(3, 'failed', 18),
  generateExecution(4, 'success', 25),
  generateExecution(5, 'running', 2),
  generateExecution(6, 'success', 35),
];

const mockExecutionResponse: WorkflowExecutionResponse = {
  executionId: 'exec-new-001',
  workflowName: 'user-signup',
  success: true,
  input: { email: 'test@example.com', username: 'testuser' },
  output: { userId: 'usr-123', verified: true },
  executionTimeMs: 2340,
  graphBuildDurationMicros: 450,
  startedAt: new Date().toISOString(),
  completedAt: new Date(Date.now() + 2340).toISOString(),
  tasks: [
    {
      taskId: 'validate',
      taskRef: 'validator',
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
      output: { userId: 'usr-123' },
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
 * Default state showing overview tab
 */
export const Default: Story = {
  args: {
    workflow: baseWorkflow,
    stats: baseStats,
    executionHistory: baseExecutionHistory,
    onExecute: async (input) => {
      console.log('Execute:', input);
      await new Promise((resolve) => setTimeout(resolve, 1000));
      return mockExecutionResponse;
    },
    onTest: async (input) => {
      console.log('Test:', input);
      await new Promise((resolve) => setTimeout(resolve, 500));
    },
    onFetchExecution: async (id) => {
      console.log('Fetch execution:', id);
      return mockExecutionResponse;
    },
  },
};

/**
 * Workflow with complex parallel execution graph
 */
export const ParallelWorkflow: Story = {
  args: {
    workflow: {
      ...baseWorkflow,
      name: 'data-aggregation',
      description: 'Aggregates data from multiple sources in parallel',
      graph: {
        nodes: [
          { id: 'start', type: 'start', data: { label: 'Start' } },
          { id: 'validate', type: 'task', data: { label: 'Validate' } },
          { id: 'fetch-users', type: 'task', data: { label: 'Fetch Users' } },
          { id: 'fetch-orders', type: 'task', data: { label: 'Fetch Orders' } },
          { id: 'fetch-products', type: 'task', data: { label: 'Fetch Products' } },
          { id: 'aggregate', type: 'task', data: { label: 'Aggregate' } },
          { id: 'end', type: 'end', data: { label: 'End' } },
        ],
        edges: [
          { source: 'start', target: 'validate' },
          { source: 'validate', target: 'fetch-users' },
          { source: 'validate', target: 'fetch-orders' },
          { source: 'validate', target: 'fetch-products' },
          { source: 'fetch-users', target: 'aggregate' },
          { source: 'fetch-orders', target: 'aggregate' },
          { source: 'fetch-products', target: 'aggregate' },
          { source: 'aggregate', target: 'end' },
        ],
        parallelGroups: [{ level: 1, taskIds: ['fetch-users', 'fetch-orders', 'fetch-products'] }],
      },
    },
    stats: baseStats,
    executionHistory: baseExecutionHistory,
    onExecute: async () => mockExecutionResponse,
    onTest: async () => {},
    onFetchExecution: async () => mockExecutionResponse,
  },
};

/**
 * New workflow with no execution history
 */
export const NoExecutionHistory: Story = {
  args: {
    workflow: {
      ...baseWorkflow,
      namespace: 'staging',
    },
    stats: {
      totalExecutions: 0,
      successRate: 0,
      avgDurationMs: 0,
    },
    executionHistory: [],
    onExecute: async () => mockExecutionResponse,
    onTest: async () => {},
  },
};

/**
 * Workflow currently executing
 */
export const Executing: Story = {
  args: {
    workflow: baseWorkflow,
    stats: baseStats,
    executionHistory: baseExecutionHistory,
    isExecuting: true,
    onExecute: async () => mockExecutionResponse,
    onTest: async () => {},
    onFetchExecution: async () => mockExecutionResponse,
  },
};

/**
 * Workflow currently testing (dry-run)
 */
export const Testing: Story = {
  args: {
    workflow: baseWorkflow,
    stats: baseStats,
    executionHistory: baseExecutionHistory,
    isTesting: true,
    onExecute: async () => mockExecutionResponse,
    onTest: async () => {},
    onFetchExecution: async () => mockExecutionResponse,
  },
};

/**
 * Workflow with many failures in history
 */
export const WithManyFailures: Story = {
  args: {
    workflow: baseWorkflow,
    stats: {
      ...baseStats,
      successRate: 65.2,
    },
    executionHistory: [
      generateExecution(1, 'failed', 5),
      generateExecution(2, 'failed', 15),
      generateExecution(3, 'success', 25),
      generateExecution(4, 'failed', 35),
      generateExecution(5, 'success', 45),
      generateExecution(6, 'failed', 55),
    ],
    onExecute: async () => mockExecutionResponse,
    onTest: async () => {},
    onFetchExecution: async () => ({
      ...mockExecutionResponse,
      success: false,
      error: 'Service unavailable',
    }),
  },
};

/**
 * Workflow with no input schema (empty form)
 */
export const NoInputRequired: Story = {
  args: {
    workflow: {
      ...baseWorkflow,
      name: 'health-check',
      description: 'Simple health check workflow with no input',
      inputSchema: {
        type: 'object',
        properties: {},
      },
    },
    stats: {
      totalExecutions: 100000,
      successRate: 99.99,
      avgDurationMs: 50,
    },
    executionHistory: Array.from({ length: 20 }, (_, i) =>
      generateExecution(i + 1, 'success', i * 5)
    ),
    onExecute: async () => mockExecutionResponse,
    onTest: async () => {},
    onFetchExecution: async () => mockExecutionResponse,
  },
};

/**
 * Workflow with complex input schema
 */
export const ComplexInputSchema: Story = {
  args: {
    workflow: {
      ...baseWorkflow,
      inputSchema: {
        type: 'object',
        properties: {
          firstName: { type: 'string', description: 'First name' },
          lastName: { type: 'string', description: 'Last name' },
          email: { type: 'string', description: 'Email address' },
          phone: { type: 'string', description: 'Phone number' },
          age: { type: 'integer', description: 'Age', minimum: 0, maximum: 150 },
          subscribe: { type: 'boolean', description: 'Subscribe to newsletter' },
          plan: {
            type: 'string',
            description: 'Subscription plan',
            enum: ['free', 'basic', 'pro', 'enterprise'],
          },
        },
        required: ['firstName', 'lastName', 'email'],
      },
    },
    stats: baseStats,
    executionHistory: baseExecutionHistory,
    onExecute: async () => mockExecutionResponse,
    onTest: async () => {},
    onFetchExecution: async () => mockExecutionResponse,
  },
};
