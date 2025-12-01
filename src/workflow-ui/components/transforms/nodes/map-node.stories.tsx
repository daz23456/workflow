import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';

/**
 * MapNode provides visual editing for map operations (field remapping).
 *
 * Features:
 * - Add/remove field mappings
 * - Field name display
 * - JSONPath expression input
 * - Mapping count summary
 *
 * Note: Visual-only story - actual component uses Zustand store.
 */

interface MapNodeVisualProps {
  mappings: Record<string, string>;
  onChange?: (mappings: Record<string, string>) => void;
}

function MapNodeVisual({ mappings: initialMappings, onChange }: MapNodeVisualProps) {
  const [mappings, setMappings] = useState(initialMappings);

  const handleAddMapping = () => {
    const newKey = `field${Object.keys(mappings).length + 1}`;
    const newMappings = { ...mappings, [newKey]: '$.value' };
    setMappings(newMappings);
    onChange?.(newMappings);
  };

  const handleRemoveMapping = (key: string) => {
    const { [key]: _, ...rest } = mappings;
    setMappings(rest);
    onChange?.(rest);
  };

  const handleUpdatePath = (key: string, path: string) => {
    const newMappings = { ...mappings, [key]: path };
    setMappings(newMappings);
    onChange?.(newMappings);
  };

  return (
    <div className="space-y-4 p-4">
      <div>
        <h3 className="text-lg font-semibold text-gray-900">Map</h3>
        <p className="text-sm text-gray-600">Remap fields to new names</p>
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">Field Mappings</label>
        {Object.entries(mappings).map(([fieldName, path]) => (
          <div key={fieldName} className="flex gap-2 items-center p-2 border rounded">
            <span className="px-2 py-1 bg-gray-100 rounded text-sm font-medium">{fieldName}</span>
            <span className="text-gray-500">&larr;</span>
            <input
              type="text"
              value={path}
              onChange={(e) => handleUpdatePath(fieldName, e.target.value)}
              className="flex-1 px-2 py-1 border rounded font-mono text-sm"
              placeholder="$.originalField"
            />
            <button
              onClick={() => handleRemoveMapping(fieldName)}
              className="p-1 text-red-600 hover:bg-red-50 rounded"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
        <button
          onClick={handleAddMapping}
          className="flex items-center gap-2 px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded"
        >
          <Plus className="w-4 h-4" />
          Add Mapping
        </button>
      </div>

      <div className="bg-gray-50 rounded-lg p-3 text-sm">
        <p className="text-gray-700">
          Will create <strong>{Object.keys(mappings).length}</strong> new field
          {Object.keys(mappings).length !== 1 ? 's' : ''}
        </p>
      </div>
    </div>
  );
}

const meta = {
  title: 'Transforms/Nodes/MapNode',
  component: MapNodeVisual,
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
} satisfies Meta<typeof MapNodeVisual>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default with single mapping
 */
export const Default: Story = {
  args: {
    mappings: {
      userName: '$.name',
    },
    onChange: (mappings) => console.log('Changed:', mappings),
  },
};

/**
 * Multiple field mappings
 */
export const MultipleMappings: Story = {
  args: {
    mappings: {
      id: '$.userId',
      fullName: '$.profile.name',
      email: '$.contact.email',
      createdAt: '$.metadata.created',
    },
  },
};

/**
 * Empty mappings
 */
export const Empty: Story = {
  args: {
    mappings: {},
  },
};

/**
 * Nested path mappings
 */
export const NestedPaths: Story = {
  args: {
    mappings: {
      avatar: '$.user.profile.avatar.url',
      bio: '$.user.profile.bio',
      city: '$.user.address.city',
    },
  },
};
