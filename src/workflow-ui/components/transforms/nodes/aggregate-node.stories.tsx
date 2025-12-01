import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';

/**
 * AggregateNode provides visual editing for aggregate operations.
 *
 * Features:
 * - Add/remove aggregations
 * - Function selector (sum, avg, min, max, count)
 * - Field input (JSONPath)
 * - Result field name
 * - Aggregation count summary
 *
 * Note: Visual-only story - actual component uses Zustand store.
 */

type AggFunction = 'sum' | 'avg' | 'min' | 'max' | 'count';

interface Aggregation {
  function: AggFunction;
  field: string;
}

interface AggregateNodeVisualProps {
  aggregations: Record<string, Aggregation>;
  onChange?: (aggregations: Record<string, Aggregation>) => void;
}

function AggregateNodeVisual({ aggregations: initialAggregations, onChange }: AggregateNodeVisualProps) {
  const [aggregations, setAggregations] = useState(initialAggregations);

  const handleAddAggregation = () => {
    const newKey = `result${Object.keys(aggregations).length + 1}`;
    const newAggregations = {
      ...aggregations,
      [newKey]: { function: 'sum' as AggFunction, field: '$.value' },
    };
    setAggregations(newAggregations);
    onChange?.(newAggregations);
  };

  const handleRemoveAggregation = (key: string) => {
    const { [key]: _, ...rest } = aggregations;
    setAggregations(rest);
    onChange?.(rest);
  };

  const handleUpdateAggregation = (key: string, updates: Partial<Aggregation>) => {
    const newAggregations = {
      ...aggregations,
      [key]: { ...aggregations[key], ...updates },
    };
    setAggregations(newAggregations);
    onChange?.(newAggregations);
  };

  return (
    <div className="space-y-4 p-4">
      <div>
        <h3 className="text-lg font-semibold text-gray-900">Aggregate</h3>
        <p className="text-sm text-gray-600">Apply aggregation functions (sum, avg, min, max, count)</p>
      </div>

      <div className="space-y-3">
        {Object.entries(aggregations).map(([key, aggregation]) => (
          <div key={key} className="flex gap-2 items-start p-3 border border-gray-200 rounded-lg">
            <div className="flex-1 space-y-2">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Result Field Name</label>
                <input
                  type="text"
                  value={key}
                  disabled
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md bg-gray-50 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Function</label>
                <select
                  value={aggregation.function}
                  onChange={(e) => handleUpdateAggregation(key, { function: e.target.value as AggFunction })}
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md"
                >
                  <option value="sum">Sum</option>
                  <option value="avg">Average</option>
                  <option value="min">Min</option>
                  <option value="max">Max</option>
                  <option value="count">Count</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Field (JSONPath)</label>
                <input
                  type="text"
                  value={aggregation.field}
                  onChange={(e) => handleUpdateAggregation(key, { field: e.target.value })}
                  placeholder="$.fieldName"
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md font-mono"
                />
              </div>
            </div>

            <button
              onClick={() => handleRemoveAggregation(key)}
              className="p-1 text-red-600 hover:bg-red-50 rounded"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      <button
        onClick={handleAddAggregation}
        className="flex items-center gap-2 px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg"
      >
        <Plus className="w-4 h-4" />
        Add Aggregation
      </button>

      <div className="bg-gray-50 rounded-lg p-3 text-sm">
        <p className="text-gray-700">
          Will apply <strong>{Object.keys(aggregations).length}</strong> aggregation
          {Object.keys(aggregations).length !== 1 ? 's' : ''}
        </p>
      </div>
    </div>
  );
}

const meta = {
  title: 'Transforms/Nodes/AggregateNode',
  component: AggregateNodeVisual,
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
} satisfies Meta<typeof AggregateNodeVisual>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default with single aggregation
 */
export const Default: Story = {
  args: {
    aggregations: {
      total: { function: 'sum', field: '$.amount' },
    },
    onChange: (aggs) => console.log('Changed:', aggs),
  },
};

/**
 * Multiple aggregations
 */
export const MultipleAggregations: Story = {
  args: {
    aggregations: {
      totalAmount: { function: 'sum', field: '$.amount' },
      avgAmount: { function: 'avg', field: '$.amount' },
      orderCount: { function: 'count', field: '$.id' },
    },
  },
};

/**
 * Statistical aggregations
 */
export const StatisticalAggregations: Story = {
  args: {
    aggregations: {
      minPrice: { function: 'min', field: '$.price' },
      maxPrice: { function: 'max', field: '$.price' },
      avgPrice: { function: 'avg', field: '$.price' },
    },
  },
};

/**
 * Empty aggregations
 */
export const Empty: Story = {
  args: {
    aggregations: {},
  },
};
