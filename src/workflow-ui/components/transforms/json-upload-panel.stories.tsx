import type { Meta, StoryObj } from '@storybook/react';
import { JsonUploadPanel } from './json-upload-panel';

/**
 * JsonUploadPanel handles JSON file uploads with drag-and-drop support.
 *
 * Features:
 * - Drag and drop file upload
 * - Click to browse file picker
 * - JSON validation (must be array)
 * - File info display with record count
 * - Clear uploaded file
 * - Error message display
 */
const meta = {
  title: 'Transforms/JsonUploadPanel',
  component: JsonUploadPanel,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="w-[400px]">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof JsonUploadPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default empty state - ready for upload
 */
export const Default: Story = {
  args: {
    onUpload: (data) => console.log('Uploaded:', data),
  },
};

/**
 * With upload callback for interactive testing
 */
export const Interactive: Story = {
  args: {
    onUpload: (data) => {
      console.log('Uploaded data:', data);
      alert(`Uploaded ${data.length} records!`);
    },
  },
};
