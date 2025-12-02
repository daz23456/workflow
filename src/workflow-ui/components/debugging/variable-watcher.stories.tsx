import type { Meta, StoryObj } from '@storybook/react';
import { VariableWatcher, type Variable } from './variable-watcher';

/**
 * VariableWatcher displays and tracks variables during workflow execution.
 *
 * Features:
 * - Search/filter variables
 * - Pin important variables
 * - Expand complex values
 * - View variable history
 * - Highlight changed values
 * - Group by source (input, tasks, output)
 */
const meta = {
  title: 'Debugging/VariableWatcher',
  component: VariableWatcher,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="w-[500px] border rounded-lg">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof VariableWatcher>;

export default meta;
type Story = StoryObj<typeof meta>;

const baseVariables: Variable[] = [
  { name: 'input.userId', value: 'usr-123', timestamp: '2024-01-15T10:00:00Z' },
  { name: 'input.email', value: 'user@example.com', timestamp: '2024-01-15T10:00:00Z' },
  { name: 'tasks.validate.output.valid', value: true, timestamp: '2024-01-15T10:00:01Z' },
  { name: 'tasks.fetch-user.output.name', value: 'John Doe', timestamp: '2024-01-15T10:00:02Z' },
  { name: 'tasks.fetch-user.output.profile', value: { avatar: 'url', bio: 'Developer' }, timestamp: '2024-01-15T10:00:02Z' },
  { name: 'output.success', value: true, timestamp: '2024-01-15T10:00:03Z' },
];

/**
 * Default variable watcher with various types
 */
export const Default: Story = {
  args: {
    variables: baseVariables,
    onPin: (name) => console.log('Pin:', name),
  },
};

/**
 * Empty state - no variables
 */
export const Empty: Story = {
  args: {
    variables: [],
  },
};

/**
 * With pinned variables
 */
export const WithPinnedVariables: Story = {
  args: {
    variables: baseVariables,
    pinnedVariables: ['input.userId', 'tasks.fetch-user.output.name'],
    onPin: (name) => console.log('Pin:', name),
  },
};

/**
 * With changed variables highlighted
 */
export const WithChangedVariables: Story = {
  args: {
    variables: baseVariables,
    changedVariables: ['tasks.fetch-user.output.name', 'output.success'],
    onPin: (name) => console.log('Pin:', name),
  },
};

/**
 * Grouped by source
 */
export const GroupedBySource: Story = {
  args: {
    variables: baseVariables,
    groupBySource: true,
    onPin: (name) => console.log('Pin:', name),
  },
};

/**
 * With variable history
 */
export const WithHistory: Story = {
  args: {
    variables: baseVariables,
    variableHistory: [
      {
        name: 'tasks.fetch-user.output.name',
        changes: [
          { value: 'Loading...', timestamp: '2024-01-15T10:00:01Z' },
          { value: 'John Doe', timestamp: '2024-01-15T10:00:02Z' },
        ],
      },
    ],
    onPin: (name) => console.log('Pin:', name),
  },
};

/**
 * Many variables (scrolling)
 */
export const ManyVariables: Story = {
  args: {
    variables: [
      ...baseVariables,
      { name: 'tasks.process.output.count', value: 100, timestamp: '2024-01-15T10:00:04Z' },
      { name: 'tasks.process.output.errors', value: 0, timestamp: '2024-01-15T10:00:04Z' },
      { name: 'tasks.process.output.warnings', value: 5, timestamp: '2024-01-15T10:00:04Z' },
      { name: 'tasks.notify.output.sent', value: true, timestamp: '2024-01-15T10:00:05Z' },
      { name: 'tasks.notify.output.recipients', value: ['a@b.com', 'c@d.com'], timestamp: '2024-01-15T10:00:05Z' },
      { name: 'tasks.cleanup.output.removed', value: 3, timestamp: '2024-01-15T10:00:06Z' },
    ],
    groupBySource: true,
    onPin: (name) => console.log('Pin:', name),
  },
};

/**
 * Complex nested values
 */
export const ComplexValues: Story = {
  args: {
    variables: [
      { name: 'input.userId', value: 'usr-123', timestamp: '2024-01-15T10:00:00Z' },
      {
        name: 'tasks.aggregate.output.data',
        value: {
          users: [
            { id: 1, name: 'Alice' },
            { id: 2, name: 'Bob' },
          ],
          metadata: {
            count: 2,
            hasMore: false,
          },
        },
        timestamp: '2024-01-15T10:00:02Z',
      },
    ],
    onPin: (name) => console.log('Pin:', name),
  },
};
