import type { Meta, StoryObj } from '@storybook/react';
import { EmptyState } from './empty-state';

/**
 * EmptyState displays a message when no workflows are found.
 *
 * Shows different messages for:
 * - No workflows in system
 * - No workflows match filters
 */
const meta = {
  title: 'Workflows/EmptyState',
  component: EmptyState,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof EmptyState>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default state - no workflows in the system
 */
export const NoWorkflows: Story = {
  args: {
    title: 'No workflows found',
    description: 'Get started by creating your first workflow.',
  },
};

/**
 * No results match the search/filter criteria
 */
export const NoResults: Story = {
  args: {
    title: 'No workflows match your filters',
    description: "Try adjusting your search or filters to find what you're looking for.",
  },
};

/**
 * With action button
 */
export const WithAction: Story = {
  args: {
    title: 'No workflows found',
    description: 'Get started by creating your first workflow.',
    actionLabel: 'Create Workflow',
    onAction: () => alert('Create workflow clicked'),
  },
};

/**
 * Custom messaging
 */
export const CustomMessage: Story = {
  args: {
    title: 'Nothing here yet',
    description: 'Workflows will appear here once they are created and deployed.',
  },
};
