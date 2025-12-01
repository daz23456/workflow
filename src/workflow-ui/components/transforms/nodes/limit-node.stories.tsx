import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';

/**
 * LimitNode provides visual editing for limit operations.
 *
 * Features:
 * - Numeric input for limit count
 * - Validation for positive numbers
 * - Preview text showing limit effect
 *
 * Note: Visual-only story - actual component uses Zustand store.
 */

interface LimitNodeVisualProps {
  count: number;
  onChange?: (count: number) => void;
}

function LimitNodeVisual({ count: initialCount, onChange }: LimitNodeVisualProps) {
  const [count, setCount] = useState(initialCount);
  const [error, setError] = useState('');

  const handleCountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);

    if (isNaN(value) || value <= 0) {
      setError('Count must be greater than 0');
      return;
    }

    setError('');
    setCount(value);
    onChange?.(value);
  };

  return (
    <div className="space-y-4 p-4">
      <div>
        <h3 className="text-lg font-semibold text-gray-900">Limit</h3>
        <p className="text-sm text-gray-600">Limit the number of records returned</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Limit Count</label>
        <input
          type="number"
          value={count}
          onChange={handleCountChange}
          min={1}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        />
        {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
      </div>

      <div className="bg-gray-50 rounded-lg p-3 text-sm">
        <p className="text-gray-700">
          Will return the first <strong>{count}</strong> records
        </p>
      </div>
    </div>
  );
}

const meta = {
  title: 'Transforms/Nodes/LimitNode',
  component: LimitNodeVisual,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="w-[350px] border rounded-lg">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof LimitNodeVisual>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default limit of 10
 */
export const Default: Story = {
  args: {
    count: 10,
    onChange: (count) => console.log('Changed:', count),
  },
};

/**
 * Small limit
 */
export const SmallLimit: Story = {
  args: {
    count: 5,
  },
};

/**
 * Large limit
 */
export const LargeLimit: Story = {
  args: {
    count: 1000,
  },
};

/**
 * Single record limit
 */
export const SingleRecord: Story = {
  args: {
    count: 1,
  },
};
