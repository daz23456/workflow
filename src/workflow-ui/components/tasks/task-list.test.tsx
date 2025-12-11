import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TaskList } from './task-list';

// Mock next/navigation
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

// Mock the API hooks
const mockUseTasks = vi.fn();
vi.mock('@/lib/api/queries', () => ({
  useTasks: () => mockUseTasks(),
  usePrefetchTaskDetail: () => vi.fn(),
  useLabels: () => ({
    data: { tags: [], categories: [] },
    isLoading: false,
    error: null,
  }),
}));

// Create query client wrapper
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: Infinity,
      },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

// Mock data
const mockTasks = [
  {
    name: 'validate-user',
    namespace: 'default',
    description: 'Validates user data',
    endpoint: 'http://api/validate',
    inputSchemaPreview: '{}',
    stats: {
      usedByWorkflows: 3,
      totalExecutions: 100,
      avgDurationMs: 50,
      successRate: 98.5,
      lastExecuted: '2024-01-15T10:00:00Z',
    },
  },
  {
    name: 'send-email',
    namespace: 'notifications',
    description: 'Sends email notifications',
    endpoint: 'http://api/email',
    inputSchemaPreview: '{}',
    stats: {
      usedByWorkflows: 5,
      totalExecutions: 250,
      avgDurationMs: 120,
      successRate: 95.0,
      lastExecuted: '2024-01-15T11:00:00Z',
    },
  },
  {
    name: 'process-payment',
    namespace: 'billing',
    description: 'Processes payments',
    endpoint: 'http://api/payment',
    inputSchemaPreview: '{}',
    stats: {
      usedByWorkflows: 2,
      totalExecutions: 80,
      avgDurationMs: 200,
      successRate: 99.9,
      lastExecuted: '2024-01-15T09:00:00Z',
    },
  },
];

describe('TaskList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseTasks.mockReturnValue({
      data: { tasks: mockTasks, total: 3 },
      isLoading: false,
      error: null,
      dataUpdatedAt: Date.now(),
      isFetching: false,
    });
  });

  describe('Loading state', () => {
    it('shows skeleton cards when loading', () => {
      mockUseTasks.mockReturnValue({
        data: null,
        isLoading: true,
        error: null,
        dataUpdatedAt: null,
        isFetching: false,
      });

      render(<TaskList />, { wrapper: createWrapper() });

      // Check for skeleton cards (animate-pulse class)
      const skeletons = document.querySelectorAll('.animate-pulse');
      expect(skeletons.length).toBeGreaterThan(0);
    });
  });

  describe('Error state', () => {
    it('shows error message when API fails', () => {
      mockUseTasks.mockReturnValue({
        data: null,
        isLoading: false,
        error: new Error('Failed to fetch'),
        dataUpdatedAt: null,
        isFetching: false,
      });

      render(<TaskList />, { wrapper: createWrapper() });

      expect(screen.getByText('Error loading tasks')).toBeInTheDocument();
    });
  });

  describe('Empty state', () => {
    it('shows empty state when no tasks exist', () => {
      mockUseTasks.mockReturnValue({
        data: { tasks: [], total: 0 },
        isLoading: false,
        error: null,
        dataUpdatedAt: Date.now(),
        isFetching: false,
      });

      render(<TaskList />, { wrapper: createWrapper() });

      expect(screen.getByText('No tasks yet')).toBeInTheDocument();
    });

    it('shows no results message when search returns empty', () => {
      mockUseTasks.mockReturnValue({
        data: { tasks: [], total: 0 },
        isLoading: false,
        error: null,
        dataUpdatedAt: Date.now(),
        isFetching: false,
      });

      render(<TaskList defaultFilters={{ search: 'nonexistent' }} />, {
        wrapper: createWrapper(),
      });

      expect(screen.getByText('No tasks found')).toBeInTheDocument();
    });
  });

  describe('Task display', () => {
    it('renders task cards when tasks exist', () => {
      render(<TaskList />, { wrapper: createWrapper() });

      expect(screen.getByText('validate-user')).toBeInTheDocument();
      expect(screen.getByText('send-email')).toBeInTheDocument();
      expect(screen.getByText('process-payment')).toBeInTheDocument();
    });

    it('displays task count', () => {
      render(<TaskList />, { wrapper: createWrapper() });

      expect(screen.getByText(/Showing 3 of 3/)).toBeInTheDocument();
    });
  });

  describe('Navigation', () => {
    it('navigates to task detail on card click', () => {
      render(<TaskList />, { wrapper: createWrapper() });

      const taskCard = screen.getByText('validate-user').closest('[class*="cursor-pointer"]');
      if (taskCard) {
        fireEvent.click(taskCard);
      }

      expect(mockPush).toHaveBeenCalledWith('/tasks/validate-user');
    });
  });

  describe('Keyboard shortcuts', () => {
    it('displays keyboard shortcut hints', () => {
      render(<TaskList />, { wrapper: createWrapper() });

      expect(screen.getByText(/Keyboard shortcuts:/)).toBeInTheDocument();
    });
  });

  describe('Filters', () => {
    it('shows clear filters button when filters are active', () => {
      render(<TaskList defaultFilters={{ search: 'test' }} />, {
        wrapper: createWrapper(),
      });

      expect(screen.getByLabelText('Clear filters')).toBeInTheDocument();
    });

    it('clears filters when clear button is clicked', () => {
      render(<TaskList defaultFilters={{ search: 'test' }} />, {
        wrapper: createWrapper(),
      });

      const clearButton = screen.getByLabelText('Clear filters');
      fireEvent.click(clearButton);

      // The filters should be cleared - the active filter count badge should disappear
      expect(screen.queryByText(/1$/)).not.toBeInTheDocument();
    });
  });

  describe('Sorting', () => {
    it('sorts tasks by name by default', () => {
      render(<TaskList />, { wrapper: createWrapper() });

      const taskNames = screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent);
      // Should be in alphabetical order
      expect(taskNames[0]).toBe('process-payment');
      expect(taskNames[1]).toBe('send-email');
      expect(taskNames[2]).toBe('validate-user');
    });
  });

  describe('Last updated', () => {
    it('displays last updated timestamp', () => {
      render(<TaskList />, { wrapper: createWrapper() });

      expect(screen.getByText(/Updated/)).toBeInTheDocument();
    });
  });

  describe('Fetching indicator', () => {
    it('shows loading text when fetching', () => {
      mockUseTasks.mockReturnValue({
        data: { tasks: mockTasks, total: 3 },
        isLoading: false,
        error: null,
        dataUpdatedAt: Date.now(),
        isFetching: true,
      });

      render(<TaskList />, { wrapper: createWrapper() });

      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    it('reduces opacity when fetching', () => {
      mockUseTasks.mockReturnValue({
        data: { tasks: mockTasks, total: 3 },
        isLoading: false,
        error: null,
        dataUpdatedAt: Date.now(),
        isFetching: true,
      });

      const { container } = render(<TaskList />, { wrapper: createWrapper() });

      const grid = container.querySelector('.opacity-60');
      expect(grid).toBeInTheDocument();
    });
  });
});
