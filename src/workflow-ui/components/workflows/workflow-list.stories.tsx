import type { Meta, StoryObj } from '@storybook/react';
import { WorkflowList } from './workflow-list';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

/**
 * WorkflowList is the main component for the workflows page.
 *
 * Features:
 * - Server-side filtering (search, namespace, sort)
 * - Loading and error states
 * - Empty states (no workflows vs no results)
 * - Responsive grid layout
 */
const meta = {
  title: 'Workflows/WorkflowList',
  component: WorkflowList,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => {
      const queryClient = new QueryClient({
        defaultOptions: {
          queries: {
            retry: false,
          },
        },
      });
      return (
        <QueryClientProvider client={queryClient}>
          <div className="p-8">
            <Story />
          </div>
        </QueryClientProvider>
      );
    },
  ],
} satisfies Meta<typeof WorkflowList>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default state - loads workflows from MSW handlers
 */
export const Default: Story = {};

/**
 * Filtered by namespace
 */
export const FilteredByNamespace: Story = {
  args: {
    defaultFilters: {
      namespace: 'production',
    },
  },
};

/**
 * Sorted by success rate
 */
export const SortedBySuccessRate: Story = {
  args: {
    defaultFilters: {
      sort: 'success-rate',
    },
  },
};

/**
 * Search filtered
 */
export const WithSearch: Story = {
  args: {
    defaultFilters: {
      search: 'user',
    },
  },
};

/**
 * No results found (search doesn't match anything)
 */
export const NoResults: Story = {
  args: {
    defaultFilters: {
      search: 'xxxxxxxxx',
    },
  },
};
