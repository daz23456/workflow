import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';

/**
 * SortNode provides visual editing for sortBy operations.
 *
 * Features:
 * - Field input (JSONPath)
 * - Sort order selector (ascending/descending)
 * - Sort preview text
 *
 * Note: Visual-only story - actual component uses Zustand store.
 */

interface SortNodeVisualProps {
  field: string;
  order: 'asc' | 'desc';
  onChange?: (field: string, order: 'asc' | 'desc') => void;
}

function SortNodeVisual({ field: initialField, order: initialOrder, onChange }: SortNodeVisualProps) {
  const [field, setField] = useState(initialField);
  const [order, setOrder] = useState(initialOrder);

  const handleFieldChange = (newField: string) => {
    setField(newField);
    onChange?.(newField, order);
  };

  const handleOrderChange = (newOrder: 'asc' | 'desc') => {
    setOrder(newOrder);
    onChange?.(field, newOrder);
  };

  return (
    <div className="space-y-4 p-4">
      <div>
        <h3 className="text-lg font-semibold text-gray-900">Sort By</h3>
        <p className="text-sm text-gray-600">Sort records by a field in ascending or descending order</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Field (JSONPath)</label>
        <input
          type="text"
          value={field}
          onChange={(e) => handleFieldChange(e.target.value)}
          placeholder="$.fieldName"
          className="w-full px-3 py-2 border border-gray-300 rounded-md font-mono"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Order</label>
        <select
          value={order}
          onChange={(e) => handleOrderChange(e.target.value as 'asc' | 'desc')}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        >
          <option value="asc">Ascending (A&rarr;Z, 0&rarr;9)</option>
          <option value="desc">Descending (Z&rarr;A, 9&rarr;0)</option>
        </select>
      </div>

      <div className="bg-gray-50 rounded-lg p-3 text-sm">
        <p className="text-gray-700">
          Will sort by <code className="bg-white px-1 py-0.5 rounded">{field}</code> in{' '}
          <strong>{order === 'asc' ? 'ascending' : 'descending'}</strong> order
        </p>
      </div>
    </div>
  );
}

const meta = {
  title: 'Transforms/Nodes/SortNode',
  component: SortNodeVisual,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="w-[400px] border rounded-lg">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof SortNodeVisual>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default ascending sort
 */
export const Default: Story = {
  args: {
    field: '$.name',
    order: 'asc',
    onChange: (field, order) => console.log('Changed:', field, order),
  },
};

/**
 * Descending sort
 */
export const Descending: Story = {
  args: {
    field: '$.createdAt',
    order: 'desc',
  },
};

/**
 * Numeric field sort
 */
export const NumericSort: Story = {
  args: {
    field: '$.price',
    order: 'asc',
  },
};

/**
 * Nested field sort
 */
export const NestedFieldSort: Story = {
  args: {
    field: '$.user.profile.lastLogin',
    order: 'desc',
  },
};
