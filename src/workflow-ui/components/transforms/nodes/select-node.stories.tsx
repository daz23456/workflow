import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';

/**
 * SelectNode provides visual editing for select operations (field projection).
 *
 * Features:
 * - Add/remove field selections
 * - Output field name editing
 * - Source JSONPath expression input
 * - Field count summary
 *
 * Note: Visual-only story - actual component uses Zustand store.
 */

interface SelectNodeVisualProps {
  fields: Record<string, string>;
  onChange?: (fields: Record<string, string>) => void;
}

function SelectNodeVisual({ fields: initialFields, onChange }: SelectNodeVisualProps) {
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
        <h3 className="text-lg font-semibold text-gray-900">Select</h3>
        <p className="text-sm text-gray-600">Select and rename fields from input data</p>
      </div>

      <div className="space-y-3">
        {Object.entries(fields).map(([fieldName, jsonPath]) => (
          <div key={fieldName} className="flex gap-2 items-start p-3 border border-gray-200 rounded-lg">
            <div className="flex-1 grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Output Name</label>
                <input
                  type="text"
                  value={fieldName}
                  disabled
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md bg-gray-50"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Source (JSONPath)</label>
                <input
                  type="text"
                  value={jsonPath}
                  onChange={(e) => handleUpdatePath(fieldName, e.target.value)}
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md font-mono"
                  placeholder="$.fieldName"
                />
              </div>
            </div>
            <button
              onClick={() => handleRemoveField(fieldName)}
              className="p-1 text-red-600 hover:bg-red-50 rounded"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      <button
        onClick={handleAddField}
        className="flex items-center gap-2 px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg"
      >
        <Plus className="w-4 h-4" />
        Add Field
      </button>

      <div className="bg-gray-50 rounded-lg p-3 text-sm">
        <p className="text-gray-700">
          Will select <strong>{Object.keys(fields).length}</strong> field
          {Object.keys(fields).length !== 1 ? 's' : ''} from each record
        </p>
      </div>
    </div>
  );
}

const meta = {
  title: 'Transforms/Nodes/SelectNode',
  component: SelectNodeVisual,
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
} satisfies Meta<typeof SelectNodeVisual>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default with basic fields
 */
export const Default: Story = {
  args: {
    fields: {
      id: '$.id',
      name: '$.name',
    },
    onChange: (fields) => console.log('Changed:', fields),
  },
};

/**
 * Multiple field selections
 */
export const MultipleFields: Story = {
  args: {
    fields: {
      userId: '$.id',
      fullName: '$.profile.name',
      email: '$.contact.email',
      role: '$.permissions.role',
      lastLogin: '$.metadata.lastLogin',
    },
  },
};

/**
 * Single field selection
 */
export const SingleField: Story = {
  args: {
    fields: {
      email: '$.email',
    },
  },
};

/**
 * Empty selection
 */
export const Empty: Story = {
  args: {
    fields: {},
  },
};
