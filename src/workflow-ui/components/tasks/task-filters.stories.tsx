import type { Meta, StoryObj } from '@storybook/react';
import { TaskFilters } from './task-filters';

/**
 * TaskFilters provides search, namespace filter, and sorting controls for tasks.
 *
 * Features:
 * - Search input with debounced updates
 * - Namespace dropdown filter
 * - Sort by name, success rate, executions, or usage
 * - Disabled state during loading
 * - Ref forwarding for search input (keyboard shortcut support)
 */
const meta = {
  title: 'Tasks/TaskFilters',
  component: TaskFilters,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof TaskFilters>;

export default meta;
type Story = StoryObj<typeof meta>;

const namespaces = ['production', 'staging', 'analytics', 'testing', 'development'];

/**
 * Default state with available namespaces
 */
export const Default: Story = {
  args: {
    namespaces,
    onFilterChange: (filters) => console.log('Filter changed:', filters),
    defaultValues: {
      search: '',
      sort: 'name',
    },
  },
};

/**
 * With search pre-filled
 */
export const WithSearch: Story = {
  args: {
    namespaces,
    onFilterChange: (filters) => console.log('Filter changed:', filters),
    defaultValues: {
      search: 'user-service',
      sort: 'name',
    },
  },
};

/**
 * With namespace selected
 */
export const WithNamespace: Story = {
  args: {
    namespaces,
    onFilterChange: (filters) => console.log('Filter changed:', filters),
    defaultValues: {
      namespace: 'production',
      sort: 'name',
    },
  },
};

/**
 * Sorted by success rate
 */
export const SortBySuccessRate: Story = {
  args: {
    namespaces,
    onFilterChange: (filters) => console.log('Filter changed:', filters),
    defaultValues: {
      sort: 'success-rate',
    },
  },
};

/**
 * Sorted by executions
 */
export const SortByExecutions: Story = {
  args: {
    namespaces,
    onFilterChange: (filters) => console.log('Filter changed:', filters),
    defaultValues: {
      sort: 'executions',
    },
  },
};

/**
 * Sorted by usage
 */
export const SortByUsage: Story = {
  args: {
    namespaces,
    onFilterChange: (filters) => console.log('Filter changed:', filters),
    defaultValues: {
      sort: 'usage',
    },
  },
};

/**
 * Loading state (controls disabled)
 */
export const Loading: Story = {
  args: {
    namespaces,
    onFilterChange: (filters) => console.log('Filter changed:', filters),
    isLoading: true,
  },
};

/**
 * No namespaces available (new system)
 */
export const NoNamespaces: Story = {
  args: {
    namespaces: [],
    onFilterChange: (filters) => console.log('Filter changed:', filters),
  },
};

/**
 * All filters applied
 */
export const AllFiltersApplied: Story = {
  args: {
    namespaces,
    onFilterChange: (filters) => console.log('Filter changed:', filters),
    defaultValues: {
      search: 'api',
      namespace: 'production',
      sort: 'success-rate',
    },
  },
};

/**
 * Many namespaces (shows scroll in dropdown)
 */
export const ManyNamespaces: Story = {
  args: {
    namespaces: [
      'production',
      'staging',
      'development',
      'analytics',
      'testing',
      'qa',
      'integration',
      'performance',
      'security',
      'compliance',
    ],
    onFilterChange: (filters) => console.log('Filter changed:', filters),
  },
};
