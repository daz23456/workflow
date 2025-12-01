import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';

/**
 * FlatMapNode provides visual editing for flatMap operations.
 *
 * Features:
 * - Array path input (JSONPath)
 * - Preview text showing flatten effect
 * - Expands array elements into individual records
 *
 * Note: Visual-only story - actual component uses Zustand store.
 */

interface FlatMapNodeVisualProps {
  path: string;
  onChange?: (path: string) => void;
}

function FlatMapNodeVisual({ path: initialPath, onChange }: FlatMapNodeVisualProps) {
  const [path, setPath] = useState(initialPath);

  const handlePathChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPath(e.target.value);
    onChange?.(e.target.value);
  };

  return (
    <div className="space-y-4 p-4">
      <div>
        <h3 className="text-lg font-semibold text-gray-900">FlatMap</h3>
        <p className="text-sm text-gray-600">Flatten arrays into individual records</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Array Path (JSONPath)</label>
        <input
          type="text"
          value={path}
          onChange={handlePathChange}
          className="w-full px-3 py-2 border border-gray-300 rounded-md font-mono"
          placeholder="$.items"
        />
      </div>

      <div className="bg-gray-50 rounded-lg p-3 text-sm">
        <p className="text-gray-700">
          Each element in the array at <code className="bg-white px-1">{path}</code> will become a
          separate record
        </p>
      </div>
    </div>
  );
}

const meta = {
  title: 'Transforms/Nodes/FlatMapNode',
  component: FlatMapNodeVisual,
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
} satisfies Meta<typeof FlatMapNodeVisual>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default with items array
 */
export const Default: Story = {
  args: {
    path: '$.items',
    onChange: (path) => console.log('Changed:', path),
  },
};

/**
 * Flatten orders array
 */
export const OrderItems: Story = {
  args: {
    path: '$.orders',
  },
};

/**
 * Nested array path
 */
export const NestedArray: Story = {
  args: {
    path: '$.user.transactions',
  },
};

/**
 * Tags array
 */
export const TagsArray: Story = {
  args: {
    path: '$.metadata.tags',
  },
};
