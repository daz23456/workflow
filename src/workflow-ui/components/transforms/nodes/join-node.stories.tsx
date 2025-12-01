import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';

/**
 * JoinNode provides visual editing for join operations.
 *
 * Features:
 * - Join type selector (inner, left, right, outer)
 * - Left key input (JSONPath)
 * - Right key input (JSONPath)
 * - Joins with another dataset
 *
 * Note: Visual-only story - actual component uses Zustand store.
 */

type JoinType = 'inner' | 'left' | 'right' | 'outer';

interface JoinNodeVisualProps {
  joinType: JoinType;
  leftKey: string;
  rightKey: string;
  onChange?: (joinType: JoinType, leftKey: string, rightKey: string) => void;
}

function JoinNodeVisual({
  joinType: initialJoinType,
  leftKey: initialLeftKey,
  rightKey: initialRightKey,
  onChange,
}: JoinNodeVisualProps) {
  const [joinType, setJoinType] = useState(initialJoinType);
  const [leftKey, setLeftKey] = useState(initialLeftKey);
  const [rightKey, setRightKey] = useState(initialRightKey);

  const handleJoinTypeChange = (newType: JoinType) => {
    setJoinType(newType);
    onChange?.(newType, leftKey, rightKey);
  };

  const handleLeftKeyChange = (newKey: string) => {
    setLeftKey(newKey);
    onChange?.(joinType, newKey, rightKey);
  };

  const handleRightKeyChange = (newKey: string) => {
    setRightKey(newKey);
    onChange?.(joinType, leftKey, newKey);
  };

  return (
    <div className="space-y-4 p-4">
      <div>
        <h3 className="text-lg font-semibold text-gray-900">Join</h3>
        <p className="text-sm text-gray-600">Join with another dataset</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Join Type</label>
        <select
          value={joinType}
          onChange={(e) => handleJoinTypeChange(e.target.value as JoinType)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        >
          <option value="inner">Inner Join</option>
          <option value="left">Left Join</option>
          <option value="right">Right Join</option>
          <option value="outer">Outer Join</option>
        </select>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Left Key</label>
          <input
            type="text"
            value={leftKey}
            onChange={(e) => handleLeftKeyChange(e.target.value)}
            className="w-full px-2 py-1 border border-gray-300 rounded-md font-mono text-sm"
            placeholder="$.id"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Right Key</label>
          <input
            type="text"
            value={rightKey}
            onChange={(e) => handleRightKeyChange(e.target.value)}
            className="w-full px-2 py-1 border border-gray-300 rounded-md font-mono text-sm"
            placeholder="$.userId"
          />
        </div>
      </div>
    </div>
  );
}

const meta = {
  title: 'Transforms/Nodes/JoinNode',
  component: JoinNodeVisual,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="w-[450px] border rounded-lg">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof JoinNodeVisual>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default inner join
 */
export const Default: Story = {
  args: {
    joinType: 'inner',
    leftKey: '$.id',
    rightKey: '$.userId',
    onChange: (type, left, right) => console.log('Changed:', type, left, right),
  },
};

/**
 * Left join
 */
export const LeftJoin: Story = {
  args: {
    joinType: 'left',
    leftKey: '$.customerId',
    rightKey: '$.id',
  },
};

/**
 * Right join
 */
export const RightJoin: Story = {
  args: {
    joinType: 'right',
    leftKey: '$.orderId',
    rightKey: '$.id',
  },
};

/**
 * Outer join
 */
export const OuterJoin: Story = {
  args: {
    joinType: 'outer',
    leftKey: '$.productId',
    rightKey: '$.id',
  },
};

/**
 * Join on nested keys
 */
export const NestedKeyJoin: Story = {
  args: {
    joinType: 'inner',
    leftKey: '$.user.profile.id',
    rightKey: '$.owner.userId',
  },
};
