import type { Meta, StoryObj } from '@storybook/react';
import { WorkflowCardSkeleton } from './workflow-card-skeleton';

/**
 * WorkflowCardSkeleton displays a loading placeholder for workflow cards.
 *
 * Used when:
 * - Workflow list is loading
 * - Individual workflow card data is being fetched
 * - Initial page load before data arrives
 */
const meta = {
  title: 'Workflows/WorkflowCardSkeleton',
  component: WorkflowCardSkeleton,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof WorkflowCardSkeleton>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default skeleton state - single card loading
 */
export const Default: Story = {};

/**
 * Multiple skeletons arranged in a grid layout
 */
export const Multiple: Story = {
  decorators: [
    () => (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 max-w-6xl">
        <WorkflowCardSkeleton />
        <WorkflowCardSkeleton />
        <WorkflowCardSkeleton />
        <WorkflowCardSkeleton />
        <WorkflowCardSkeleton />
        <WorkflowCardSkeleton />
      </div>
    ),
  ],
};

/**
 * Single skeleton in a list layout
 */
export const ListLayout: Story = {
  decorators: [
    () => (
      <div className="space-y-4 max-w-2xl">
        <WorkflowCardSkeleton />
        <WorkflowCardSkeleton />
        <WorkflowCardSkeleton />
      </div>
    ),
  ],
};
