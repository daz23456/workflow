import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';

/**
 * SkipNode provides visual editing for skip operations.
 *
 * Features:
 * - Numeric input for skip count
 * - Validation for non-negative numbers
 * - Preview text showing skip effect
 * - Useful for pagination
 *
 * Note: Visual-only story - actual component uses Zustand store.
 */

interface SkipNodeVisualProps {
  count: number;
  onChange?: (count: number) => void;
}

function SkipNodeVisual({ count: initialCount, onChange }: SkipNodeVisualProps) {
  const [count, setCount] = useState(initialCount);

  const handleCountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);

    if (isNaN(value) || value < 0) {
      return;
    }

    setCount(value);
    onChange?.(value);
  };

  return (
    <div className="space-y-4 p-4">
      <div>
        <h3 className="text-lg font-semibold text-gray-900">Skip</h3>
        <p className="text-sm text-gray-600">Skip the first N records (useful for pagination)</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Skip Count</label>
        <input
          type="number"
          value={count}
          onChange={handleCountChange}
          min={0}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        />
      </div>

      <div className="bg-gray-50 rounded-lg p-3 text-sm">
        <p className="text-gray-700">
          {count === 0 ? (
            <span>Will not skip any records</span>
          ) : (
            <span>
              Will skip the first <strong>{count}</strong> records
            </span>
          )}
        </p>
      </div>
    </div>
  );
}

const meta = {
  title: 'Transforms/Nodes/SkipNode',
  component: SkipNodeVisual,
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
} satisfies Meta<typeof SkipNodeVisual>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default skip of 0
 */
export const Default: Story = {
  args: {
    count: 0,
    onChange: (count) => console.log('Changed:', count),
  },
};

/**
 * Skip first page (pagination)
 */
export const SkipFirstPage: Story = {
  args: {
    count: 10,
  },
};

/**
 * Skip many records
 */
export const LargeSkip: Story = {
  args: {
    count: 100,
  },
};

/**
 * Skip single record
 */
export const SkipOne: Story = {
  args: {
    count: 1,
  },
};
