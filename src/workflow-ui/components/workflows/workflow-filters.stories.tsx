import type { Meta, StoryObj } from '@storybook/react';
import { WorkflowFilters } from './workflow-filters';

/**
 * WorkflowFilters provides search, namespace, and sort controls for workflow list.
 *
 * Features:
 * - Debounced search input (300ms)
 * - Single-select namespace dropdown
 * - Sort dropdown (name, success rate, executions)
 */
const meta = {
  title: 'Workflows/WorkflowFilters',
  component: WorkflowFilters,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
  args: {
    onFilterChange: () => {},
  },
} satisfies Meta<typeof WorkflowFilters>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default state - no filters applied
 */
export const Default: Story = {
  args: {
    namespaces: ['production', 'staging', 'analytics'],
  },
};

/**
 * With initial values
 */
export const WithValues: Story = {
  args: {
    namespaces: ['production', 'staging', 'analytics'],
    defaultValues: {
      search: 'user',
      namespace: 'production',
      sort: 'success-rate',
    },
  },
};

/**
 * Only production workflows
 */
export const ProductionOnly: Story = {
  args: {
    namespaces: ['production'],
    defaultValues: {
      namespace: 'production',
    },
  },
};

/**
 * Many namespaces
 */
export const ManyNamespaces: Story = {
  args: {
    namespaces: [
      'production',
      'staging',
      'development',
      'analytics',
      'data-pipeline',
      'customer-service',
      'internal-tools',
    ],
  },
};

/**
 * Loading state (disabled while loading)
 */
export const Loading: Story = {
  args: {
    namespaces: ['production', 'staging'],
    isLoading: true,
  },
};
