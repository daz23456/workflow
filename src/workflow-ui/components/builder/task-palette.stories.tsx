import type { Meta, StoryObj } from '@storybook/react';
import { Search, ChevronDown, X, AlertTriangle, Database, Mail, FileCheck } from 'lucide-react';

/**
 * TaskPalette provides a drag-and-drop palette of available tasks.
 *
 * Features:
 * - Display available tasks with search/filter
 * - Drag-and-drop tasks to canvas
 * - Task details expansion
 * - Category filtering
 * - Collapsible palette
 *
 * Note: The actual component uses useTasks hook. These stories demonstrate
 * the UI states without the API integration.
 */
const meta = {
  title: 'Builder/TaskPalette',
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const PaletteWrapper = ({ children, collapsed = false }: { children: React.ReactNode; collapsed?: boolean }) => (
  <div className={`${collapsed ? 'w-12' : 'w-64'} h-[600px] bg-white border border-gray-200 rounded-lg overflow-hidden shadow-lg flex flex-col`}>
    {children}
  </div>
);

const mockTasks = [
  { name: 'user-service', displayName: 'User Service', description: 'Fetches user data', category: 'Data' },
  { name: 'email-service', displayName: 'Email Service', description: 'Sends emails', category: 'Notifications' },
  { name: 'validator-task', displayName: 'Validator Task', description: 'Validates input data', category: 'Validation' },
  { name: 'data-processor', displayName: 'Data Processor', description: 'Processes data', category: 'Data' },
];

const TaskItem = ({ name, displayName, description, category, expanded = false }: { name: string; displayName: string; description: string; category: string; expanded?: boolean }) => {
  const Icon = category === 'Data' ? Database : category === 'Notifications' ? Mail : FileCheck;
  return (
    <div className="p-3 border border-gray-200 rounded-lg cursor-move hover:border-blue-400 hover:shadow-md">
      <div className="flex items-start gap-2">
        <Icon className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm text-gray-900">{displayName}</div>
          <div className="text-xs text-gray-600 mt-1">{description}</div>
          <div className="mt-2">
            <span className="inline-block px-2 py-0.5 text-xs bg-gray-100 text-gray-700 rounded">{category}</span>
          </div>
        </div>
      </div>
      {expanded && (
        <div className="mt-3 pt-3 border-t border-gray-200 text-xs">
          <div className="space-y-2">
            <div>
              <div className="font-semibold text-gray-700">Input:</div>
              <pre className="mt-1 p-2 bg-gray-50 rounded overflow-x-auto">{'{ "userId": "string" }'}</pre>
            </div>
            <div>
              <div className="font-semibold text-gray-700">Output:</div>
              <pre className="mt-1 p-2 bg-gray-50 rounded overflow-x-auto">{'{ "data": "object" }'}</pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Default state with tasks loaded
 */
export const Default: Story = {
  render: () => (
    <PaletteWrapper>
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Tasks</h2>
        <button className="p-1 hover:bg-gray-100 rounded">
          <ChevronDown className="w-5 h-5" />
        </button>
      </div>
      <div className="p-4 border-b border-gray-200">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search tasks..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>
      <div className="p-4 border-b border-gray-200">
        <div className="flex flex-wrap gap-2">
          <button className="px-3 py-1 text-sm rounded-full border bg-white text-gray-700 border-gray-300 hover:border-blue-400">Data</button>
          <button className="px-3 py-1 text-sm rounded-full border bg-white text-gray-700 border-gray-300 hover:border-blue-400">Notifications</button>
          <button className="px-3 py-1 text-sm rounded-full border bg-white text-gray-700 border-gray-300 hover:border-blue-400">Validation</button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {mockTasks.map((task) => (
          <TaskItem key={task.name} {...task} />
        ))}
      </div>
    </PaletteWrapper>
  ),
};

/**
 * Loading state
 */
export const Loading: Story = {
  render: () => (
    <PaletteWrapper>
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold">Tasks</h2>
      </div>
      <div className="p-4 space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 bg-gray-200 rounded animate-pulse" />
        ))}
      </div>
    </PaletteWrapper>
  ),
};

/**
 * Error state
 */
export const Error: Story = {
  render: () => (
    <PaletteWrapper>
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold">Tasks</h2>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center p-4 text-center">
        <AlertTriangle className="w-12 h-12 text-red-500 mb-2" />
        <p className="text-sm text-red-600 mb-4">Failed to load tasks</p>
        <button className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
          Retry
        </button>
      </div>
    </PaletteWrapper>
  ),
};

/**
 * With search active
 */
export const WithSearch: Story = {
  render: () => (
    <PaletteWrapper>
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Tasks</h2>
        <button className="p-1 hover:bg-gray-100 rounded">
          <ChevronDown className="w-5 h-5" />
        </button>
      </div>
      <div className="p-4 border-b border-gray-200">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value="email"
            readOnly
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded"
          />
          <button className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <X className="w-4 h-4 text-gray-400 hover:text-gray-600" />
          </button>
        </div>
      </div>
      <div className="p-4 border-b border-gray-200">
        <div className="flex flex-wrap gap-2">
          <button className="px-3 py-1 text-sm rounded-full border bg-white text-gray-700 border-gray-300">Data</button>
          <button className="px-3 py-1 text-sm rounded-full border bg-white text-gray-700 border-gray-300">Notifications</button>
          <button className="px-3 py-1 text-sm rounded-full border bg-white text-gray-700 border-gray-300">Validation</button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        <TaskItem name="email-service" displayName="Email Service" description="Sends emails" category="Notifications" />
      </div>
    </PaletteWrapper>
  ),
};

/**
 * With category filter active
 */
export const WithCategoryFilter: Story = {
  render: () => (
    <PaletteWrapper>
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Tasks</h2>
        <button className="p-1 hover:bg-gray-100 rounded">
          <ChevronDown className="w-5 h-5" />
        </button>
      </div>
      <div className="p-4 border-b border-gray-200">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" placeholder="Search tasks..." className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded" />
        </div>
      </div>
      <div className="p-4 border-b border-gray-200">
        <div className="flex flex-wrap gap-2">
          <button className="px-3 py-1 text-sm rounded-full border bg-blue-500 text-white border-blue-500">Data</button>
          <button className="px-3 py-1 text-sm rounded-full border bg-white text-gray-700 border-gray-300">Notifications</button>
          <button className="px-3 py-1 text-sm rounded-full border bg-white text-gray-700 border-gray-300">Validation</button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        <TaskItem name="user-service" displayName="User Service" description="Fetches user data" category="Data" />
        <TaskItem name="data-processor" displayName="Data Processor" description="Processes data" category="Data" />
      </div>
    </PaletteWrapper>
  ),
};

/**
 * Task expanded to show schema
 */
export const TaskExpanded: Story = {
  render: () => (
    <PaletteWrapper>
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Tasks</h2>
        <button className="p-1 hover:bg-gray-100 rounded">
          <ChevronDown className="w-5 h-5" />
        </button>
      </div>
      <div className="p-4 border-b border-gray-200">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" placeholder="Search tasks..." className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded" />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        <TaskItem name="user-service" displayName="User Service" description="Fetches user data" category="Data" expanded={true} />
        <TaskItem name="email-service" displayName="Email Service" description="Sends emails" category="Notifications" />
      </div>
    </PaletteWrapper>
  ),
};

/**
 * Empty search results
 */
export const NoResults: Story = {
  render: () => (
    <PaletteWrapper>
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Tasks</h2>
        <button className="p-1 hover:bg-gray-100 rounded">
          <ChevronDown className="w-5 h-5" />
        </button>
      </div>
      <div className="p-4 border-b border-gray-200">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value="nonexistent"
            readOnly
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded"
          />
          <button className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <X className="w-4 h-4 text-gray-400 hover:text-gray-600" />
          </button>
        </div>
      </div>
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="text-center text-gray-500">
          <p className="text-sm">No tasks found</p>
        </div>
      </div>
    </PaletteWrapper>
  ),
};

/**
 * Collapsed state
 */
export const Collapsed: Story = {
  render: () => (
    <div className="w-12 h-[600px] bg-white border border-gray-200 rounded-lg overflow-hidden shadow-lg flex flex-col">
      <div className="p-4 border-b border-gray-200 flex items-center justify-center">
        <button className="p-1 hover:bg-gray-100 rounded">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  ),
};
