import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';

/**
 * FilterNode provides visual editing for filter operations.
 *
 * Features:
 * - Field input (JSONPath)
 * - Operator selector (eq, ne, gt, lt, contains, etc.)
 * - Value input
 * - Condition preview
 *
 * Note: Visual-only story - actual component uses Zustand store.
 */

interface Condition {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'lt' | 'gte' | 'lte' | 'contains' | 'startsWith' | 'endsWith';
  value: string | number | boolean;
}

interface FilterNodeVisualProps {
  condition: Condition;
  onChange?: (condition: Condition) => void;
}

function FilterNodeVisual({ condition: initialCondition, onChange }: FilterNodeVisualProps) {
  const [condition, setCondition] = useState(initialCondition);

  const handleUpdate = (updates: Partial<Condition>) => {
    const newCondition = { ...condition, ...updates };
    setCondition(newCondition);
    onChange?.(newCondition);
  };

  return (
    <div className="space-y-4 p-4">
      <div>
        <h3 className="text-lg font-semibold text-gray-900">Filter</h3>
        <p className="text-sm text-gray-600">Keep only records matching a condition</p>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Field</label>
          <input
            type="text"
            value={condition.field}
            onChange={(e) => handleUpdate({ field: e.target.value })}
            className="w-full px-2 py-1 border border-gray-300 rounded-md font-mono text-sm"
            placeholder="$.field"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Operator</label>
          <select
            value={condition.operator}
            onChange={(e) => handleUpdate({ operator: e.target.value as Condition['operator'] })}
            className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm"
          >
            <option value="eq">Equals</option>
            <option value="ne">Not Equals</option>
            <option value="gt">Greater Than</option>
            <option value="lt">Less Than</option>
            <option value="gte">&ge;</option>
            <option value="lte">&le;</option>
            <option value="contains">Contains</option>
            <option value="startsWith">Starts With</option>
            <option value="endsWith">Ends With</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Value</label>
          <input
            type="text"
            value={String(condition.value)}
            onChange={(e) => handleUpdate({ value: e.target.value })}
            className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm"
          />
        </div>
      </div>
    </div>
  );
}

const meta = {
  title: 'Transforms/Nodes/FilterNode',
  component: FilterNodeVisual,
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
} satisfies Meta<typeof FilterNodeVisual>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default equals filter
 */
export const Default: Story = {
  args: {
    condition: {
      field: '$.status',
      operator: 'eq',
      value: 'active',
    },
    onChange: (condition) => console.log('Changed:', condition),
  },
};

/**
 * Numeric comparison filter
 */
export const NumericFilter: Story = {
  args: {
    condition: {
      field: '$.age',
      operator: 'gte',
      value: 18,
    },
  },
};

/**
 * String contains filter
 */
export const ContainsFilter: Story = {
  args: {
    condition: {
      field: '$.email',
      operator: 'contains',
      value: '@company.com',
    },
  },
};

/**
 * Not equals filter
 */
export const NotEqualsFilter: Story = {
  args: {
    condition: {
      field: '$.role',
      operator: 'ne',
      value: 'guest',
    },
  },
};

/**
 * Starts with filter
 */
export const StartsWithFilter: Story = {
  args: {
    condition: {
      field: '$.name',
      operator: 'startsWith',
      value: 'Dr.',
    },
  },
};
