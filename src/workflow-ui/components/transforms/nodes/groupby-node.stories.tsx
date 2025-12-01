import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';

/**
 * GroupByNode provides visual editing for groupBy operations.
 *
 * Features:
 * - Group key input (JSONPath)
 * - Add/remove aggregations per group
 * - Function selector (sum, avg, min, max, count)
 * - Field input for each aggregation
 *
 * Note: Visual-only story - actual component uses Zustand store.
 */

type AggFunction = 'sum' | 'avg' | 'min' | 'max' | 'count';

interface Aggregation {
  function: AggFunction;
  field: string;
}

interface GroupByNodeVisualProps {
  groupKey: string;
  aggregations: Record<string, Aggregation>;
  onChange?: (key: string, aggregations: Record<string, Aggregation>) => void;
}

function GroupByNodeVisual({ groupKey: initialKey, aggregations: initialAggregations, onChange }: GroupByNodeVisualProps) {
  const [groupKey, setGroupKey] = useState(initialKey);
  const [aggregations, setAggregations] = useState(initialAggregations);

  const handleKeyChange = (newKey: string) => {
    setGroupKey(newKey);
    onChange?.(newKey, aggregations);
  };

  const handleAddAggregation = () => {
    const newKey = `agg${Object.keys(aggregations).length + 1}`;
    const newAggregations = {
      ...aggregations,
      [newKey]: { function: 'count' as AggFunction, field: '$.id' },
    };
    setAggregations(newAggregations);
    onChange?.(groupKey, newAggregations);
  };

  const handleRemoveAggregation = (key: string) => {
    const { [key]: _, ...rest } = aggregations;
    setAggregations(rest);
    onChange?.(groupKey, rest);
  };

  const handleUpdateAggregation = (key: string, updates: Partial<Aggregation>) => {
    const newAggregations = {
      ...aggregations,
      [key]: { ...aggregations[key], ...updates },
    };
    setAggregations(newAggregations);
    onChange?.(groupKey, newAggregations);
  };

  return (
    <div className="space-y-4 p-4">
      <div>
        <h3 className="text-lg font-semibold text-gray-900">Group By</h3>
        <p className="text-sm text-gray-600">Group records by a field and apply aggregations</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Group By Key</label>
        <input
          type="text"
          value={groupKey}
          onChange={(e) => handleKeyChange(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md font-mono"
          placeholder="$.category"
        />
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">Aggregations</label>
        {Object.entries(aggregations).map(([key, agg]) => (
          <div key={key} className="flex gap-2 p-2 border rounded">
            <select
              value={agg.function}
              onChange={(e) => handleUpdateAggregation(key, { function: e.target.value as AggFunction })}
              className="px-2 py-1 border rounded text-sm"
            >
              <option value="sum">Sum</option>
              <option value="avg">Avg</option>
              <option value="min">Min</option>
              <option value="max">Max</option>
              <option value="count">Count</option>
            </select>
            <input
              type="text"
              value={agg.field}
              onChange={(e) => handleUpdateAggregation(key, { field: e.target.value })}
              className="flex-1 px-2 py-1 border rounded font-mono text-sm"
              placeholder="$.field"
            />
            <button onClick={() => handleRemoveAggregation(key)} className="p-1 text-red-600">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
        <button
          onClick={handleAddAggregation}
          className="flex items-center gap-2 px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded"
        >
          <Plus className="w-4 h-4" />
          Add Aggregation
        </button>
      </div>
    </div>
  );
}

const meta = {
  title: 'Transforms/Nodes/GroupByNode',
  component: GroupByNodeVisual,
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
} satisfies Meta<typeof GroupByNodeVisual>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default with single aggregation
 */
export const Default: Story = {
  args: {
    groupKey: '$.category',
    aggregations: {
      count: { function: 'count', field: '$.id' },
    },
    onChange: (key, aggs) => console.log('Changed:', key, aggs),
  },
};

/**
 * Multiple aggregations per group
 */
export const MultipleAggregations: Story = {
  args: {
    groupKey: '$.department',
    aggregations: {
      totalSalary: { function: 'sum', field: '$.salary' },
      avgSalary: { function: 'avg', field: '$.salary' },
      employeeCount: { function: 'count', field: '$.id' },
    },
  },
};

/**
 * Sales by region
 */
export const SalesByRegion: Story = {
  args: {
    groupKey: '$.region',
    aggregations: {
      totalRevenue: { function: 'sum', field: '$.revenue' },
      avgOrderValue: { function: 'avg', field: '$.orderValue' },
      orderCount: { function: 'count', field: '$.orderId' },
    },
  },
};

/**
 * Empty aggregations
 */
export const NoAggregations: Story = {
  args: {
    groupKey: '$.status',
    aggregations: {},
  },
};
