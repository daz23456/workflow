import type { Meta, StoryObj } from '@storybook/react';
import { TaskCard } from './task-card';
import type { Task } from '@/types/task';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Create a client for the QueryClientProvider wrapper
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

/**
 * TaskCard displays a summary of a workflow task with stats.
 *
 * Features:
 * - Task name with namespace badge
 * - Description
 * - Stats grid (success rate, executions, avg duration, workflow usage)
 * - Color-coded success rate (green/yellow/red)
 * - Click to navigate to task details
 * - Keyboard navigation support
 * - Prefetch on hover
 */
const meta = {
  title: 'Tasks/TaskCard',
  component: TaskCard,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <QueryClientProvider client={queryClient}>
        <div className="w-80">
          <Story />
        </div>
      </QueryClientProvider>
    ),
  ],
} satisfies Meta<typeof TaskCard>;

export default meta;
type Story = StoryObj<typeof meta>;

const baseTask: Task = {
  name: 'user-service-task',
  namespace: 'production',
  description: 'Fetches user details from the user service API with caching',
  endpoint: '/api/v1/tasks/user-service-task',
  stats: {
    usedByWorkflows: 5,
    totalExecutions: 12450,
    avgDurationMs: 450,
    successRate: 98.5,
    lastExecuted: new Date().toISOString(),
  },
};

/**
 * Default task with good stats
 */
export const Default: Story = {
  args: {
    task: baseTask,
    onClick: (name) => console.log('Clicked task:', name),
  },
};

/**
 * Task with 100% success rate
 */
export const HighSuccessRate: Story = {
  args: {
    task: {
      ...baseTask,
      stats: {
        ...baseTask.stats,
        successRate: 100,
        totalExecutions: 50000,
      },
    },
    onClick: (name) => console.log('Clicked task:', name),
  },
};

/**
 * Task with medium success rate (warning)
 */
export const MediumSuccessRate: Story = {
  args: {
    task: {
      ...baseTask,
      stats: {
        ...baseTask.stats,
        successRate: 75.2,
      },
    },
    onClick: (name) => console.log('Clicked task:', name),
  },
};

/**
 * Task with low success rate (error)
 */
export const LowSuccessRate: Story = {
  args: {
    task: {
      ...baseTask,
      stats: {
        ...baseTask.stats,
        successRate: 45.8,
      },
    },
    onClick: (name) => console.log('Clicked task:', name),
  },
};

/**
 * Never executed task
 */
export const NeverExecuted: Story = {
  args: {
    task: {
      ...baseTask,
      namespace: 'staging',
      stats: {
        usedByWorkflows: 1,
        totalExecutions: 0,
        avgDurationMs: 0,
        successRate: 0,
      },
    },
    onClick: (name) => console.log('Clicked task:', name),
  },
};

/**
 * Task used by many workflows
 */
export const HighUsage: Story = {
  args: {
    task: {
      ...baseTask,
      name: 'auth-service-task',
      description: 'Common authentication task used across the platform',
      stats: {
        ...baseTask.stats,
        usedByWorkflows: 25,
        totalExecutions: 500000,
      },
    },
    onClick: (name) => console.log('Clicked task:', name),
  },
};

/**
 * Task with long name and description
 */
export const LongContent: Story = {
  args: {
    task: {
      ...baseTask,
      name: 'enterprise-customer-data-aggregation-service',
      description:
        'Aggregates customer data from multiple sources including CRM, billing system, support tickets, and usage analytics for comprehensive reporting.',
    },
    onClick: (name) => console.log('Clicked task:', name),
  },
};

/**
 * Task with analytics namespace (different color)
 */
export const AnalyticsNamespace: Story = {
  args: {
    task: {
      ...baseTask,
      namespace: 'analytics',
      name: 'metrics-collector',
      description: 'Collects and aggregates metrics from all services',
    },
    onClick: (name) => console.log('Clicked task:', name),
  },
};

/**
 * Task without click handler (non-interactive)
 */
export const NonInteractive: Story = {
  args: {
    task: baseTask,
    // No onClick - card is not clickable
  },
};

/**
 * Task used by single workflow
 */
export const SingleWorkflowUsage: Story = {
  args: {
    task: {
      ...baseTask,
      stats: {
        ...baseTask.stats,
        usedByWorkflows: 1,
      },
    },
    onClick: (name) => console.log('Clicked task:', name),
  },
};
