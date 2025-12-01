import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';

/**
 * EnrichNode provides visual editing for enrich operations.
 *
 * Features:
 * - Add/remove computed fields
 * - Field name display
 * - JSONPath expression input
 * - Adds new fields to existing records
 *
 * Note: Visual-only story - actual component uses Zustand store.
 */

interface EnrichNodeVisualProps {
  fields: Record<string, string>;
  onChange?: (fields: Record<string, string>) => void;
}

function EnrichNodeVisual({ fields: initialFields, onChange }: EnrichNodeVisualProps) {
  const [fields, setFields] = useState(initialFields);

  const handleAddField = () => {
    const newKey = `field${Object.keys(fields).length + 1}`;
    const newFields = { ...fields, [newKey]: '$.value' };
    setFields(newFields);
    onChange?.(newFields);
  };

  const handleRemoveField = (key: string) => {
    const { [key]: _, ...rest } = fields;
    setFields(rest);
    onChange?.(rest);
  };

  const handleUpdatePath = (key: string, path: string) => {
    const newFields = { ...fields, [key]: path };
    setFields(newFields);
    onChange?.(newFields);
  };

  return (
    <div className="space-y-4 p-4">
      <div>
        <h3 className="text-lg font-semibold text-gray-900">Enrich</h3>
        <p className="text-sm text-gray-600">Add computed fields to records</p>
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">Fields to Add</label>
        {Object.entries(fields).map(([name, path]) => (
          <div key={name} className="flex gap-2 p-2 border rounded">
            <span className="px-2 py-1 bg-gray-100 rounded text-sm">{name}</span>
            <input
              type="text"
              value={path}
              onChange={(e) => handleUpdatePath(name, e.target.value)}
              className="flex-1 px-2 py-1 border rounded font-mono text-sm"
              placeholder="$.field"
            />
            <button onClick={() => handleRemoveField(name)} className="p-1 text-red-600">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
        <button
          onClick={handleAddField}
          className="flex items-center gap-2 px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded"
        >
          <Plus className="w-4 h-4" />
          Add Field
        </button>
      </div>
    </div>
  );
}

const meta = {
  title: 'Transforms/Nodes/EnrichNode',
  component: EnrichNodeVisual,
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
} satisfies Meta<typeof EnrichNodeVisual>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default with single field
 */
export const Default: Story = {
  args: {
    fields: {
      fullName: '$.firstName + " " + $.lastName',
    },
    onChange: (fields) => console.log('Changed:', fields),
  },
};

/**
 * Multiple computed fields
 */
export const MultipleFields: Story = {
  args: {
    fields: {
      fullName: '$.profile.firstName',
      displayEmail: '$.contact.email',
      isActive: '$.status == "active"',
      createdYear: '$.metadata.createdAt',
    },
  },
};

/**
 * Empty fields
 */
export const Empty: Story = {
  args: {
    fields: {},
  },
};

/**
 * Derived calculations
 */
export const DerivedFields: Story = {
  args: {
    fields: {
      totalPrice: '$.quantity * $.unitPrice',
      discountedPrice: '$.price * (1 - $.discount)',
      profitMargin: '($.revenue - $.cost) / $.revenue',
    },
  },
};
