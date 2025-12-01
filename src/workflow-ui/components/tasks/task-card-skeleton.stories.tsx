import type { Meta, StoryObj } from '@storybook/react';
import { TaskCardSkeleton } from './task-card-skeleton';

/**
 * TaskCardSkeleton displays a loading placeholder for TaskCard.
 *
 * Features:
 * - Matches TaskCard layout dimensions
 * - Animated pulse effect
 * - Placeholder blocks for all content areas
 */
const meta = {
  title: 'Tasks/TaskCardSkeleton',
  component: TaskCardSkeleton,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="w-80">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof TaskCardSkeleton>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default skeleton state
 */
export const Default: Story = {};

/**
 * Multiple skeletons in a grid (loading state for task list)
 */
export const Multiple: Story = {
  decorators: [
    () => (
      <div className="grid grid-cols-2 gap-4 w-[680px]">
        <TaskCardSkeleton />
        <TaskCardSkeleton />
        <TaskCardSkeleton />
        <TaskCardSkeleton />
      </div>
    ),
  ],
};

/**
 * Grid layout matching tasks page
 */
export const GridLayout: Story = {
  decorators: [
    () => (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 max-w-6xl">
        {Array.from({ length: 8 }).map((_, index) => (
          <TaskCardSkeleton key={index} />
        ))}
      </div>
    ),
  ],
};
