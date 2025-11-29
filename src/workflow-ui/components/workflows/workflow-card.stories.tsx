import type { Meta, StoryObj } from '@storybook/react';
import { WorkflowCard } from './workflow-card';

/**
 * WorkflowCard displays a workflow summary with stats and metadata.
 *
 * Used in the workflow list page to show:
 * - Workflow name and description
 * - Namespace
 * - Task count
 * - Success rate with color-coded badge
 * - Total executions
 * - Average duration
 * - Last execution time
 */
const meta = {
  title: 'Workflows/WorkflowCard',
  component: WorkflowCard,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof WorkflowCard>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default workflow card with good stats
 */
export const Default: Story = {
  args: {
    workflow: {
      name: 'user-signup',
      namespace: 'production',
      description: 'Complete user registration flow with email verification',
      taskCount: 3,
      endpoint: '/api/v1/workflows/user-signup/execute',
      inputSchemaPreview: '{ email, password, username }',
      stats: {
        totalExecutions: 1247,
        successRate: 98.5,
        avgDurationMs: 2500,
        lastExecuted: '2025-11-23T10:30:00Z',
      },
    },
  },
};

/**
 * Workflow with perfect success rate
 */
export const HighSuccessRate: Story = {
  args: {
    workflow: {
      name: 'order-processing',
      namespace: 'production',
      description: 'Process customer orders with inventory check and payment',
      taskCount: 6,
      endpoint: '/api/v1/workflows/order-processing/execute',
      inputSchemaPreview: '{ orderId, items, paymentMethod }',
      stats: {
        totalExecutions: 8945,
        successRate: 100,
        avgDurationMs: 3200,
        lastExecuted: '2025-11-23T11:45:00Z',
      },
    },
  },
};

/**
 * Workflow with medium success rate (warning state)
 */
export const MediumSuccessRate: Story = {
  args: {
    workflow: {
      name: 'data-pipeline',
      namespace: 'analytics',
      description: 'ETL pipeline for customer data processing',
      taskCount: 8,
      endpoint: '/api/v1/workflows/data-pipeline/execute',
      inputSchemaPreview: '{ sourceUrl, format }',
      stats: {
        totalExecutions: 3421,
        successRate: 76.3,
        avgDurationMs: 15000,
        lastExecuted: '2025-11-23T09:15:00Z',
      },
    },
  },
};

/**
 * Workflow with low success rate (error state)
 */
export const LowSuccessRate: Story = {
  args: {
    workflow: {
      name: 'payment-flow',
      namespace: 'production',
      description: 'Secure payment processing with fraud detection',
      taskCount: 5,
      endpoint: '/api/v1/workflows/payment-flow/execute',
      inputSchemaPreview: '{ amount, currency, cardToken }',
      stats: {
        totalExecutions: 15234,
        successRate: 65.2,
        avgDurationMs: 4500,
        lastExecuted: '2025-11-23T11:50:00Z',
      },
    },
  },
};

/**
 * Workflow that has never been executed
 */
export const NeverExecuted: Story = {
  args: {
    workflow: {
      name: 'user-onboarding',
      namespace: 'staging',
      description: 'New user onboarding flow with account setup',
      taskCount: 4,
      endpoint: '/api/v1/workflows/user-onboarding/execute',
      inputSchemaPreview: '{ userId, plan }',
      stats: {
        totalExecutions: 0,
        successRate: 0,
        avgDurationMs: 0,
        lastExecuted: undefined,
      },
    },
  },
};

/**
 * Workflow with very long name and description
 */
export const LongContent: Story = {
  args: {
    workflow: {
      name: 'enterprise-customer-onboarding-with-verification',
      namespace: 'production',
      description:
        'Complete enterprise customer onboarding workflow including identity verification, compliance checks, multi-level approval process, and automated account provisioning across all systems',
      taskCount: 12,
      endpoint: '/api/v1/workflows/enterprise-customer-onboarding-with-verification/execute',
      inputSchemaPreview: '{ customerId, companyInfo, verificationDocs, approvers }',
      stats: {
        totalExecutions: 234,
        successRate: 94.2,
        avgDurationMs: 45000,
        lastExecuted: '2025-11-23T08:20:00Z',
      },
    },
  },
};

/**
 * Workflow in different namespace
 */
export const AnalyticsNamespace: Story = {
  args: {
    workflow: {
      name: 'daily-report',
      namespace: 'analytics',
      description: 'Generate daily analytics reports',
      taskCount: 5,
      endpoint: '/api/v1/workflows/daily-report/execute',
      inputSchemaPreview: '{ date, format }',
      stats: {
        totalExecutions: 567,
        successRate: 99.1,
        avgDurationMs: 8500,
        lastExecuted: '2025-11-23T06:00:00Z',
      },
    },
  },
};

/**
 * Interactive state - hover effect
 */
export const Interactive: Story = {
  args: {
    ...Default.args,
  },
  parameters: {
    docs: {
      description: {
        story: 'Hover over the card to see the interactive hover effect',
      },
    },
  },
};
