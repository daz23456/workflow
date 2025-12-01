import type { Meta, StoryObj } from '@storybook/react';
import { WorkflowDetailHeader } from './workflow-detail-header';
import type { WorkflowDetail } from '@/types/workflow';

/**
 * WorkflowDetailHeader displays the header section of a workflow detail page.
 *
 * Features:
 * - Workflow name with namespace badge
 * - Description
 * - Stats grid (tasks, success rate, executions, avg duration)
 * - Execute and Test buttons
 * - Breadcrumb navigation back to workflows list
 */
const meta = {
  title: 'Workflows/WorkflowDetailHeader',
  component: WorkflowDetailHeader,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof WorkflowDetailHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

const baseWorkflow: WorkflowDetail = {
  name: 'user-signup',
  namespace: 'production',
  description: 'Complete user registration flow with email verification and welcome message',
  inputSchema: {
    type: 'object',
    properties: {
      email: { type: 'string' },
      username: { type: 'string' },
    },
    required: ['email', 'username'],
  },
  outputSchema: {
    userId: 'string',
    verified: 'boolean',
  },
  tasks: [
    { id: 'validate', taskRef: 'validator', description: 'Validate input' },
    { id: 'create-user', taskRef: 'user-service', description: 'Create user' },
    { id: 'send-email', taskRef: 'email-service', description: 'Send welcome email' },
  ],
  endpoints: {
    execute: '/api/v1/workflows/user-signup/execute',
    test: '/api/v1/workflows/user-signup/test',
    details: '/api/v1/workflows/user-signup',
  },
};

const baseStats = {
  totalExecutions: 12450,
  successRate: 98.5,
  avgDurationMs: 2340,
  lastExecuted: new Date().toISOString(),
};

/**
 * Default state with good stats
 */
export const Default: Story = {
  args: {
    workflow: baseWorkflow,
    stats: baseStats,
    onExecute: () => console.log('Execute clicked'),
    onTest: () => console.log('Test clicked'),
  },
};

/**
 * Workflow with high success rate
 */
export const HighSuccessRate: Story = {
  args: {
    workflow: baseWorkflow,
    stats: {
      ...baseStats,
      successRate: 100,
      totalExecutions: 50000,
    },
    onExecute: () => console.log('Execute clicked'),
    onTest: () => console.log('Test clicked'),
  },
};

/**
 * Workflow with medium success rate (warning)
 */
export const MediumSuccessRate: Story = {
  args: {
    workflow: baseWorkflow,
    stats: {
      ...baseStats,
      successRate: 75.2,
    },
    onExecute: () => console.log('Execute clicked'),
    onTest: () => console.log('Test clicked'),
  },
};

/**
 * Workflow with low success rate (error)
 */
export const LowSuccessRate: Story = {
  args: {
    workflow: baseWorkflow,
    stats: {
      ...baseStats,
      successRate: 45.8,
    },
    onExecute: () => console.log('Execute clicked'),
    onTest: () => console.log('Test clicked'),
  },
};

/**
 * Never executed workflow
 */
export const NeverExecuted: Story = {
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
    onExecute: () => console.log('Execute clicked'),
    onTest: () => console.log('Test clicked'),
  },
};

/**
 * Currently executing
 */
export const Executing: Story = {
  args: {
    workflow: baseWorkflow,
    stats: baseStats,
    isExecuting: true,
    onExecute: () => console.log('Execute clicked'),
    onTest: () => console.log('Test clicked'),
  },
};

/**
 * Currently testing
 */
export const Testing: Story = {
  args: {
    workflow: baseWorkflow,
    stats: baseStats,
    isTesting: true,
    onExecute: () => console.log('Execute clicked'),
    onTest: () => console.log('Test clicked'),
  },
};

/**
 * On Execute tab (buttons hidden)
 */
export const ExecuteTab: Story = {
  args: {
    workflow: baseWorkflow,
    stats: baseStats,
    activeTab: 'execute',
    onExecute: () => console.log('Execute clicked'),
    onTest: () => console.log('Test clicked'),
  },
};

/**
 * Long workflow name and description
 */
export const LongContent: Story = {
  args: {
    workflow: {
      ...baseWorkflow,
      name: 'enterprise-customer-onboarding-verification-flow',
      description:
        'Complete enterprise customer onboarding workflow including identity verification, KYC compliance checks, multi-level approval process, automated account provisioning across all systems, and sending customized welcome communications.',
      tasks: Array.from({ length: 15 }, (_, i) => ({
        id: `task-${i}`,
        taskRef: `service-${i}`,
        description: `Task ${i} description`,
      })),
    },
    stats: {
      ...baseStats,
      avgDurationMs: 45000,
    },
    onExecute: () => console.log('Execute clicked'),
    onTest: () => console.log('Test clicked'),
  },
};

/**
 * Different namespaces showing color variation
 */
export const AnalyticsNamespace: Story = {
  args: {
    workflow: {
      ...baseWorkflow,
      namespace: 'analytics',
      name: 'daily-report-generator',
      description: 'Generates daily analytics reports and distributes to stakeholders',
    },
    stats: baseStats,
    onExecute: () => console.log('Execute clicked'),
    onTest: () => console.log('Test clicked'),
  },
};

/**
 * Single task workflow
 */
export const SingleTask: Story = {
  args: {
    workflow: {
      ...baseWorkflow,
      name: 'health-check',
      description: 'Simple health check workflow',
      tasks: [{ id: 'check', taskRef: 'health-service', description: 'Check health' }],
    },
    stats: {
      totalExecutions: 100000,
      successRate: 99.99,
      avgDurationMs: 50,
    },
    onExecute: () => console.log('Execute clicked'),
    onTest: () => console.log('Test clicked'),
  },
};
