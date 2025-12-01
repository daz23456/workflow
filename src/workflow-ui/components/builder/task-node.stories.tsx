import type { Meta, StoryObj } from '@storybook/react';
import { TaskNode } from './task-node';
import { ReactFlowProvider, ReactFlow, Background } from '@xyflow/react';
import '@xyflow/react/dist/style.css';

/**
 * TaskNode is a custom React Flow node for workflow tasks.
 *
 * Features:
 * - Editable label (double-click)
 * - Validation indicators (error/warning/valid)
 * - Delete button on hover when selected
 * - Connection handles (source/target)
 * - Keyboard accessible
 */
const meta = {
  title: 'Builder/TaskNode',
  component: TaskNode,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <ReactFlowProvider>
        <div style={{ width: '500px', height: '300px' }}>
          <ReactFlow
            nodes={[]}
            edges={[]}
            nodeTypes={{ task: TaskNode }}
            fitView
          >
            <Background />
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
              <Story />
            </div>
          </ReactFlow>
        </div>
      </ReactFlowProvider>
    ),
  ],
} satisfies Meta<typeof TaskNode>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Valid task node with all required fields
 */
export const Valid: Story = {
  render: () => (
    <div className="relative px-4 py-3 rounded-lg border-2 border-green-300 bg-white shadow-md min-w-[200px]">
      <div className="absolute -top-2 -right-2 bg-green-500 rounded-full p-1">
        <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <div className="mb-2">
        <div className="font-semibold text-gray-900 text-sm">Fetch User Data</div>
      </div>
      <div className="text-xs text-gray-500 mb-1 font-mono">user-service-task</div>
      <div className="text-xs text-gray-600 mt-2 border-t border-gray-200 pt-2">
        Fetches user details from the user service API
      </div>
    </div>
  ),
};

/**
 * Task node with warning (missing description)
 */
export const Warning: Story = {
  render: () => (
    <div className="relative px-4 py-3 rounded-lg border-2 border-yellow-300 bg-white shadow-md min-w-[200px]">
      <div className="absolute -top-2 -right-2 bg-yellow-500 rounded-full p-1">
        <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>
      <div className="mb-2">
        <div className="font-semibold text-gray-900 text-sm">Process Data</div>
      </div>
      <div className="text-xs text-gray-500 mb-1 font-mono">data-processor-task</div>
    </div>
  ),
};

/**
 * Task node with error (missing taskRef)
 */
export const Error: Story = {
  render: () => (
    <div className="relative px-4 py-3 rounded-lg border-2 border-red-300 bg-white shadow-md min-w-[200px]">
      <div className="absolute -top-2 -right-2 bg-red-500 rounded-full p-1">
        <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <div className="mb-2">
        <div className="font-semibold text-gray-900 text-sm">New Task</div>
      </div>
      <div className="text-xs text-gray-500 mb-1 font-mono">
        <span className="text-red-500">No taskRef</span>
      </div>
    </div>
  ),
};

/**
 * Selected task node
 */
export const Selected: Story = {
  render: () => (
    <div className="relative px-4 py-3 rounded-lg border-2 border-green-300 bg-white shadow-md min-w-[200px] ring-4 ring-blue-400 ring-opacity-50">
      <div className="absolute -top-2 -right-2 bg-green-500 rounded-full p-1">
        <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <button className="absolute -top-2 -left-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </button>
      <div className="mb-2">
        <div className="font-semibold text-gray-900 text-sm">Send Email</div>
      </div>
      <div className="text-xs text-gray-500 mb-1 font-mono">email-service-task</div>
      <div className="text-xs text-gray-600 mt-2 border-t border-gray-200 pt-2">
        Sends email notification to user
      </div>
    </div>
  ),
};

/**
 * Task node in edit mode
 */
export const Editing: Story = {
  render: () => (
    <div className="relative px-4 py-3 rounded-lg border-2 border-green-300 bg-white shadow-md min-w-[200px]">
      <div className="absolute -top-2 -right-2 bg-green-500 rounded-full p-1">
        <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <div className="mb-2">
        <input
          type="text"
          defaultValue="Fetch User Data"
          className="w-full px-2 py-1 border border-blue-400 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
          autoFocus
        />
      </div>
      <div className="text-xs text-gray-500 mb-1 font-mono">user-service-task</div>
    </div>
  ),
};

/**
 * Long label and description
 */
export const LongContent: Story = {
  render: () => (
    <div className="relative px-4 py-3 rounded-lg border-2 border-green-300 bg-white shadow-md min-w-[200px] max-w-[280px]">
      <div className="absolute -top-2 -right-2 bg-green-500 rounded-full p-1">
        <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <div className="mb-2">
        <div className="font-semibold text-gray-900 text-sm">Enterprise Customer Data Aggregation Service</div>
      </div>
      <div className="text-xs text-gray-500 mb-1 font-mono">enterprise-customer-data-aggregation-task</div>
      <div className="text-xs text-gray-600 mt-2 border-t border-gray-200 pt-2">
        Aggregates customer data from multiple sources including CRM, billing system, support tickets, and usage analytics for comprehensive reporting and analysis.
      </div>
    </div>
  ),
};
