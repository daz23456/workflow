import type { Meta, StoryObj } from '@storybook/react';
import { EmptyState } from './empty-state';

/**
 * EmptyState displays a placeholder when no data is available.
 *
 * Features:
 * - Icon placeholder
 * - Customizable title
 * - Optional description
 * - Dashed border styling
 */
const meta = {
  title: 'Tasks/EmptyState',
  component: EmptyState,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="w-[600px]">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof EmptyState>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default empty state for no tasks
 */
export const Default: Story = {
  args: {
    title: 'No tasks yet',
    description: 'Get started by creating your first task.',
  },
};

/**
 * Empty search results
 */
export const NoSearchResults: Story = {
  args: {
    title: 'No tasks found',
    description: "Try adjusting your filters to find what you're looking for.",
  },
};

/**
 * Error loading tasks
 */
export const LoadError: Story = {
  args: {
    title: 'Error loading tasks',
    description: 'Failed to load tasks. Please try again later.',
  },
};

/**
 * Title only (no description)
 */
export const TitleOnly: Story = {
  args: {
    title: 'Nothing to display',
  },
};

/**
 * No workflows empty state
 */
export const NoWorkflows: Story = {
  args: {
    title: 'No workflows yet',
    description: 'Create your first workflow to get started with orchestration.',
  },
};

/**
 * No execution history
 */
export const NoExecutions: Story = {
  args: {
    title: 'No executions yet',
    description: 'Execute a workflow to see the history here.',
  },
};

/**
 * Filter returns no results
 */
export const FilterNoResults: Story = {
  args: {
    title: 'No matching results',
    description: 'No items match your current filter criteria. Try removing some filters.',
  },
};
