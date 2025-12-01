import type { Meta, StoryObj } from '@storybook/react';
import { AlertCircle, CheckCircle, AlertTriangle, X } from 'lucide-react';

/**
 * PropertiesPanel displays and edits properties of selected workflow nodes.
 *
 * Features:
 * - Edit node label and description
 * - Display taskRef (read-only)
 * - Validation indicators
 * - Close button and Escape key support
 * - Empty state when no node selected
 *
 * Note: The actual component uses Zustand store. These stories demonstrate
 * the UI states without the store integration.
 */
const meta = {
  title: 'Builder/PropertiesPanel',
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const PanelWrapper = ({ children }: { children: React.ReactNode }) => (
  <div className="w-80 h-[600px] bg-white border border-gray-200 rounded-lg overflow-hidden shadow-lg">
    {children}
  </div>
);

/**
 * Empty state - no node selected
 */
export const EmptyState: Story = {
  render: () => (
    <PanelWrapper>
      <div className="h-full flex flex-col">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Properties</h2>
        </div>
        <div className="flex-1 p-4">
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <AlertCircle className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Task Selected</h3>
            <p className="text-sm text-gray-600">
              Select a task on the canvas to view and edit its properties
            </p>
          </div>
        </div>
      </div>
    </PanelWrapper>
  ),
};

/**
 * Valid task selected
 */
export const ValidTask: Story = {
  render: () => (
    <PanelWrapper>
      <div className="h-full flex flex-col">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Properties</h2>
          <button className="p-1 hover:bg-gray-100 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 p-4 overflow-y-auto">
          <div className="space-y-4">
            <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <p className="text-sm text-green-700">Task is valid</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Label</label>
              <input
                type="text"
                defaultValue="Fetch User Data"
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="mt-1 text-xs text-gray-500">Display name for this task</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Task Reference</label>
              <input
                type="text"
                value="user-service-task"
                readOnly
                className="w-full px-3 py-2 border border-gray-300 rounded bg-gray-50 text-gray-600 cursor-not-allowed"
              />
              <p className="mt-1 text-xs text-gray-500">Cannot be changed after creation</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                defaultValue="Fetches user details from the user service API"
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
              <p className="mt-1 text-xs text-gray-500">Describe what this task does</p>
            </div>
          </div>
        </div>
      </div>
    </PanelWrapper>
  ),
};

/**
 * Task with warning (missing description)
 */
export const WarningState: Story = {
  render: () => (
    <PanelWrapper>
      <div className="h-full flex flex-col">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Properties</h2>
          <button className="p-1 hover:bg-gray-100 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 p-4 overflow-y-auto">
          <div className="space-y-4">
            <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded">
              <AlertTriangle className="w-5 h-5 text-yellow-500" />
              <p className="text-sm text-yellow-700">Description is recommended for clarity</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Label</label>
              <input
                type="text"
                defaultValue="Process Data"
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Task Reference</label>
              <input
                type="text"
                value="data-processor-task"
                readOnly
                className="w-full px-3 py-2 border border-gray-300 rounded bg-gray-50 text-gray-600 cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                placeholder="Task description (optional)"
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>
          </div>
        </div>
      </div>
    </PanelWrapper>
  ),
};

/**
 * Task with error (missing taskRef)
 */
export const ErrorState: Story = {
  render: () => (
    <PanelWrapper>
      <div className="h-full flex flex-col">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Properties</h2>
          <button className="p-1 hover:bg-gray-100 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 p-4 overflow-y-auto">
          <div className="space-y-4">
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded">
              <AlertCircle className="w-5 h-5 text-red-500" />
              <p className="text-sm text-red-700">Task reference is required</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Label</label>
              <input
                type="text"
                defaultValue="New Task"
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Task Reference</label>
              <input
                type="text"
                value=""
                readOnly
                className="w-full px-3 py-2 border border-red-300 rounded bg-gray-50 text-gray-600 cursor-not-allowed"
              />
              <p className="mt-1 text-xs text-red-500">Task reference is required</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                placeholder="Task description (optional)"
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>
          </div>
        </div>
      </div>
    </PanelWrapper>
  ),
};

/**
 * Multiple nodes selected
 */
export const MultipleSelection: Story = {
  render: () => (
    <PanelWrapper>
      <div className="h-full flex flex-col">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Properties</h2>
          <button className="p-1 hover:bg-gray-100 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 p-4 overflow-y-auto">
          <div className="space-y-4">
            <div className="p-3 bg-blue-50 border border-blue-200 rounded">
              <p className="text-sm text-blue-700">3 tasks selected - Editing first task</p>
            </div>

            <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <p className="text-sm text-green-700">Task is valid</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Label</label>
              <input
                type="text"
                defaultValue="Validate Input"
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Task Reference</label>
              <input
                type="text"
                value="validator-task"
                readOnly
                className="w-full px-3 py-2 border border-gray-300 rounded bg-gray-50 text-gray-600 cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                defaultValue="Validates user input against schema"
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>
          </div>
        </div>
      </div>
    </PanelWrapper>
  ),
};
