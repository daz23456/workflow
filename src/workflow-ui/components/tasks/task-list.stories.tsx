import type { Meta, StoryObj } from '@storybook/react';
import { TaskCard } from './task-card';
import { TaskCardSkeleton } from './task-card-skeleton';
import { TaskFilters } from './task-filters';
import { EmptyState } from './empty-state';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { Task } from '@/types/task';

// Create a client for the QueryClientProvider wrapper
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

/**
 * TaskList composition showing the task list page layout.
 *
 * This story demonstrates the full composition of TaskList components
 * since the actual TaskList component uses hooks that require app context.
 *
 * Features shown:
 * - Filters bar (search, namespace, sort)
 * - Task cards grid
 * - Loading skeleton state
 * - Empty states
 */
const meta = {
  title: 'Tasks/TaskList',
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const mockTasks: Task[] = [
  {
    name: 'user-service-task',
    namespace: 'production',
    description: 'Fetches user details from the user service API',
    endpoint: '/api/v1/tasks/user-service-task',
    stats: {
      usedByWorkflows: 5,
      totalExecutions: 12450,
      avgDurationMs: 450,
      successRate: 98.5,
      lastExecuted: new Date().toISOString(),
    },
  },
  {
    name: 'email-service-task',
    namespace: 'production',
    description: 'Sends emails via the email service',
    endpoint: '/api/v1/tasks/email-service-task',
    stats: {
      usedByWorkflows: 8,
      totalExecutions: 25000,
      avgDurationMs: 1200,
      successRate: 99.2,
      lastExecuted: new Date().toISOString(),
    },
  },
  {
    name: 'payment-processor',
    namespace: 'production',
    description: 'Processes payments through the payment gateway',
    endpoint: '/api/v1/tasks/payment-processor',
    stats: {
      usedByWorkflows: 3,
      totalExecutions: 8500,
      avgDurationMs: 850,
      successRate: 99.9,
      lastExecuted: new Date().toISOString(),
    },
  },
  {
    name: 'analytics-collector',
    namespace: 'analytics',
    description: 'Collects and aggregates analytics data',
    endpoint: '/api/v1/tasks/analytics-collector',
    stats: {
      usedByWorkflows: 2,
      totalExecutions: 100000,
      avgDurationMs: 50,
      successRate: 100,
      lastExecuted: new Date().toISOString(),
    },
  },
  {
    name: 'notification-service',
    namespace: 'production',
    description: 'Sends push notifications to mobile devices',
    endpoint: '/api/v1/tasks/notification-service',
    stats: {
      usedByWorkflows: 4,
      totalExecutions: 45000,
      avgDurationMs: 200,
      successRate: 95.5,
      lastExecuted: new Date().toISOString(),
    },
  },
  {
    name: 'test-validator',
    namespace: 'staging',
    description: 'Validates test data inputs',
    endpoint: '/api/v1/tasks/test-validator',
    stats: {
      usedByWorkflows: 1,
      totalExecutions: 0,
      avgDurationMs: 0,
      successRate: 0,
    },
  },
];

const namespaces = ['production', 'staging', 'analytics'];

/**
 * Default task list with tasks
 */
export const Default: Story = {
  render: () => (
    <QueryClientProvider client={queryClient}>
      <div>
        <div className="mb-4 rounded-md bg-blue-50 border border-blue-200 px-4 py-2 text-xs text-blue-700">
          <span className="font-medium">Keyboard shortcuts:</span>{' '}
          <kbd className="rounded bg-white px-1.5 py-0.5 border border-blue-300">/</kbd> to search,{' '}
          <kbd className="rounded bg-white px-1.5 py-0.5 border border-blue-300">Esc</kbd> to clear
          filters
        </div>
        <TaskFilters
          namespaces={namespaces}
          onFilterChange={(filters) => console.log('Filters:', filters)}
        />
        <div className="mb-4 text-sm text-gray-600">Showing {mockTasks.length} tasks</div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {mockTasks.map((task) => (
            <TaskCard key={task.name} task={task} onClick={(name) => console.log('Click:', name)} />
          ))}
        </div>
      </div>
    </QueryClientProvider>
  ),
};

/**
 * Loading state with skeletons
 */
export const Loading: Story = {
  render: () => (
    <div>
      <div className="mb-4 rounded-md bg-blue-50 border border-blue-200 px-4 py-2 text-xs text-blue-700">
        <span className="font-medium">Keyboard shortcuts:</span>{' '}
        <kbd className="rounded bg-white px-1.5 py-0.5 border border-blue-300">/</kbd> to search,{' '}
        <kbd className="rounded bg-white px-1.5 py-0.5 border border-blue-300">Esc</kbd> to clear
        filters
      </div>
      <TaskFilters namespaces={[]} onFilterChange={() => {}} isLoading={true} />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 6 }).map((_, index) => (
          <TaskCardSkeleton key={index} />
        ))}
      </div>
    </div>
  ),
};

/**
 * Empty state - no tasks
 */
export const Empty: Story = {
  render: () => (
    <div>
      <div className="mb-4 rounded-md bg-blue-50 border border-blue-200 px-4 py-2 text-xs text-blue-700">
        <span className="font-medium">Keyboard shortcuts:</span>{' '}
        <kbd className="rounded bg-white px-1.5 py-0.5 border border-blue-300">/</kbd> to search,{' '}
        <kbd className="rounded bg-white px-1.5 py-0.5 border border-blue-300">Esc</kbd> to clear
        filters
      </div>
      <TaskFilters namespaces={[]} onFilterChange={() => {}} />
      <EmptyState title="No tasks yet" description="Get started by creating your first task." />
    </div>
  ),
};

/**
 * No search results
 */
export const NoSearchResults: Story = {
  render: () => (
    <QueryClientProvider client={queryClient}>
      <div>
        <div className="mb-4 rounded-md bg-blue-50 border border-blue-200 px-4 py-2 text-xs text-blue-700">
          <span className="font-medium">Keyboard shortcuts:</span>{' '}
          <kbd className="rounded bg-white px-1.5 py-0.5 border border-blue-300">/</kbd> to search,{' '}
          <kbd className="rounded bg-white px-1.5 py-0.5 border border-blue-300">Esc</kbd> to clear
          filters
        </div>
        <TaskFilters
          namespaces={namespaces}
          onFilterChange={() => {}}
          defaultValues={{ search: 'nonexistent-task', sort: 'name' }}
        />
        <div className="mb-4">
          <button className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50">
            Clear filters
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-xs font-semibold text-blue-700">
              1
            </span>
          </button>
        </div>
        <EmptyState
          title="No tasks found"
          description="Try adjusting your filters to find what you're looking for."
        />
      </div>
    </QueryClientProvider>
  ),
};

/**
 * Error loading tasks
 */
export const Error: Story = {
  render: () => (
    <div className="p-8">
      <EmptyState
        title="Error loading tasks"
        description="Failed to load tasks. Please try again later."
      />
    </div>
  ),
};

/**
 * Filtered by namespace
 */
export const FilteredByNamespace: Story = {
  render: () => {
    const filteredTasks = mockTasks.filter((t) => t.namespace === 'production');
    return (
      <QueryClientProvider client={queryClient}>
        <div>
          <div className="mb-4 rounded-md bg-blue-50 border border-blue-200 px-4 py-2 text-xs text-blue-700">
            <span className="font-medium">Keyboard shortcuts:</span>{' '}
            <kbd className="rounded bg-white px-1.5 py-0.5 border border-blue-300">/</kbd> to search,{' '}
            <kbd className="rounded bg-white px-1.5 py-0.5 border border-blue-300">Esc</kbd> to
            clear filters
          </div>
          <TaskFilters
            namespaces={namespaces}
            onFilterChange={() => {}}
            defaultValues={{ namespace: 'production', sort: 'name' }}
          />
          <div className="mb-4">
            <button className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50">
              Clear filters
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-xs font-semibold text-blue-700">
                1
              </span>
            </button>
          </div>
          <div className="mb-4 text-sm text-gray-600">Showing {filteredTasks.length} tasks</div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredTasks.map((task) => (
              <TaskCard
                key={task.name}
                task={task}
                onClick={(name) => console.log('Click:', name)}
              />
            ))}
          </div>
        </div>
      </QueryClientProvider>
    );
  },
};
