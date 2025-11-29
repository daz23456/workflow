/**
 * Unit tests for TaskPalette component
 *
 * Tests drag-and-drop task palette for workflow builder
 * Following TDD: RED phase - these tests should FAIL until implementation
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TaskPalette } from './task-palette';

// Mock Zustand store
const mockAddNode = vi.fn();

vi.mock('@/lib/stores/workflow-builder-store', () => ({
  useWorkflowBuilderStore: (selector: any) => {
    const store = {
      addNode: mockAddNode,
    };
    return selector(store);
  },
}));

// Mock task discovery API - matches actual API response shape
const mockTasks = {
  tasks: [
    {
      name: 'fetch-user',
      description: 'Fetches user data from API',
      inputSchema: { type: 'object', properties: { userId: { type: 'string' } } },
      outputSchema: { type: 'object', properties: { user: { type: 'object' } } },
    },
    {
      name: 'send-email',
      description: 'Sends an email notification',
      inputSchema: {
        type: 'object',
        properties: { to: { type: 'string' }, subject: { type: 'string' } },
      },
      outputSchema: { type: 'object', properties: { messageId: { type: 'string' } } },
    },
    {
      name: 'validate-data',
      description: 'Validates data against schema',
      inputSchema: { type: 'object', properties: { data: { type: 'object' } } },
      outputSchema: { type: 'object', properties: { valid: { type: 'boolean' } } },
    },
  ],
};

// Controllable mock state for useTasks
let mockQueryState = {
  data: mockTasks,
  isLoading: false,
  error: null as Error | null,
  refetch: vi.fn(),
};

vi.mock('@/lib/api/queries', () => ({
  useTasks: () => mockQueryState,
}));

describe('TaskPalette', () => {
  beforeEach(() => {
    mockAddNode.mockClear();
    // Reset query state to default (success)
    mockQueryState = {
      data: mockTasks,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    };
  });

  describe('Rendering', () => {
    it('should render task palette container', () => {
      render(<TaskPalette />);
      expect(screen.getByTestId('task-palette')).toBeInTheDocument();
    });

    it('should render palette title', () => {
      render(<TaskPalette />);
      expect(screen.getByText('Tasks')).toBeInTheDocument();
    });

    it('should render all available tasks', () => {
      render(<TaskPalette />);
      expect(screen.getByText('Fetch User')).toBeInTheDocument();
      expect(screen.getByText('Send Email')).toBeInTheDocument();
      expect(screen.getByText('Validate Data')).toBeInTheDocument();
    });

    it('should render task descriptions', () => {
      render(<TaskPalette />);
      expect(screen.getByText('Fetches user data from API')).toBeInTheDocument();
      expect(screen.getByText('Sends an email notification')).toBeInTheDocument();
    });

    it('should render task categories', () => {
      render(<TaskPalette />);
      // Should show category badges (both as filter buttons and task badges)
      const fetchCategory = screen.getAllByText('Fetch');
      expect(fetchCategory.length).toBeGreaterThan(0);
      const sendCategory = screen.getAllByText('Send');
      expect(sendCategory.length).toBeGreaterThan(0);
    });
  });

  describe('Search and Filter', () => {
    it('should render search input', () => {
      render(<TaskPalette />);
      const searchInput = screen.getByPlaceholderText(/search tasks/i);
      expect(searchInput).toBeInTheDocument();
    });

    it('should filter tasks by search query', async () => {
      const user = userEvent.setup();
      render(<TaskPalette />);

      const searchInput = screen.getByPlaceholderText(/search tasks/i);
      await user.type(searchInput, 'email');

      // Should only show Send Email task
      expect(screen.getByText('Send Email')).toBeInTheDocument();
      expect(screen.queryByText('Fetch User')).not.toBeInTheDocument();
      expect(screen.queryByText('Validate Data')).not.toBeInTheDocument();
    });

    it('should filter by category', async () => {
      const user = userEvent.setup();
      render(<TaskPalette />);

      // Click on Fetch category filter
      const fetchFilter = screen.getByRole('button', { name: /fetch/i });
      await user.click(fetchFilter);

      // Should only show Fetch category tasks
      expect(screen.getByText('Fetch User')).toBeInTheDocument();
      expect(screen.queryByText('Send Email')).not.toBeInTheDocument();
      expect(screen.queryByText('Validate Data')).not.toBeInTheDocument();
    });

    it('should show all tasks when search is cleared', async () => {
      const user = userEvent.setup();
      render(<TaskPalette />);

      const searchInput = screen.getByPlaceholderText(/search tasks/i);
      await user.type(searchInput, 'email');

      // Clear search
      await user.clear(searchInput);

      // All tasks should be visible again
      expect(screen.getByText('Fetch User')).toBeInTheDocument();
      expect(screen.getByText('Send Email')).toBeInTheDocument();
      expect(screen.getByText('Validate Data')).toBeInTheDocument();
    });

    it('should show empty state when no tasks match search', async () => {
      const user = userEvent.setup();
      render(<TaskPalette />);

      const searchInput = screen.getByPlaceholderText(/search tasks/i);
      await user.type(searchInput, 'nonexistent');

      expect(screen.getByText(/no tasks found/i)).toBeInTheDocument();
    });
  });

  describe('Drag and Drop', () => {
    it('should make task items draggable', () => {
      render(<TaskPalette />);

      const taskItem = screen.getByTestId('task-item-fetch-user');
      expect(taskItem).toHaveAttribute('draggable', 'true');
    });

    it('should set drag data on drag start', () => {
      render(<TaskPalette />);

      const taskItem = screen.getByTestId('task-item-fetch-user');
      const mockDataTransfer = {
        setData: vi.fn(),
        effectAllowed: '',
      };

      fireEvent.dragStart(taskItem, {
        dataTransfer: mockDataTransfer,
      });

      expect(mockDataTransfer.setData).toHaveBeenCalledWith(
        'application/reactflow',
        expect.stringContaining('fetch-user')
      );
      expect(mockDataTransfer.effectAllowed).toBe('move');
    });

    it('should include task metadata in drag data', () => {
      render(<TaskPalette />);

      const taskItem = screen.getByTestId('task-item-fetch-user');
      const mockDataTransfer = {
        setData: vi.fn(),
        effectAllowed: '',
      };

      fireEvent.dragStart(taskItem, {
        dataTransfer: mockDataTransfer,
      });

      const dragData = mockDataTransfer.setData.mock.calls[0][1];
      const parsedData = JSON.parse(dragData);

      expect(parsedData).toMatchObject({
        taskRef: 'fetch-user',
        label: 'Fetch User',
        description: 'Fetches user data from API',
        type: 'task',
      });
    });

    it('should apply dragging styles on drag start', () => {
      render(<TaskPalette />);

      const taskItem = screen.getByTestId('task-item-fetch-user');

      fireEvent.dragStart(taskItem);

      expect(taskItem).toHaveAttribute('data-dragging', 'true');
    });

    it('should remove dragging styles on drag end', () => {
      render(<TaskPalette />);

      const taskItem = screen.getByTestId('task-item-fetch-user');

      fireEvent.dragStart(taskItem);
      fireEvent.dragEnd(taskItem);

      expect(taskItem).toHaveAttribute('data-dragging', 'false');
    });
  });

  describe('Task Item Display', () => {
    it('should show task icon based on category', () => {
      render(<TaskPalette />);

      const dataTaskIcon = screen.getByTestId('task-icon-fetch-user');
      expect(dataTaskIcon).toBeInTheDocument();
    });

    it('should expand task details on click', async () => {
      const user = userEvent.setup();
      render(<TaskPalette />);

      const taskItem = screen.getByTestId('task-item-fetch-user');
      await user.click(taskItem);

      // Should show expanded details
      expect(screen.getByText(/full schema/i)).toBeInTheDocument();
    });

    it('should collapse task details on second click', async () => {
      const user = userEvent.setup();
      render(<TaskPalette />);

      const taskItem = screen.getByTestId('task-item-fetch-user');

      // Click to expand
      await user.click(taskItem);
      expect(screen.getByText(/full schema/i)).toBeInTheDocument();

      // Click to collapse
      await user.click(taskItem);
      expect(screen.queryByText(/full schema/i)).not.toBeInTheDocument();
    });
  });

  describe('Loading and Error States', () => {
    it('should show loading skeleton when tasks are loading', () => {
      // Set loading state
      mockQueryState = {
        data: undefined as any,
        isLoading: true,
        error: null,
        refetch: vi.fn(),
      };

      render(<TaskPalette />);
      expect(screen.getByTestId('loading-skeleton')).toBeInTheDocument();
    });

    it('should show error message when tasks fail to load', () => {
      // Set error state
      mockQueryState = {
        data: undefined as any,
        isLoading: false,
        error: new Error('Failed to fetch tasks'),
        refetch: vi.fn(),
      };

      render(<TaskPalette />);
      expect(screen.getByText(/failed to load tasks/i)).toBeInTheDocument();
    });

    it('should show retry button on error', async () => {
      const user = userEvent.setup();
      const mockRefetch = vi.fn();

      // Set error state
      mockQueryState = {
        data: undefined as any,
        isLoading: false,
        error: new Error('Failed to fetch tasks'),
        refetch: mockRefetch,
      };

      render(<TaskPalette />);
      const retryButton = screen.getByRole('button', { name: /retry/i });
      await user.click(retryButton);

      expect(mockRefetch).toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('should have accessible label', () => {
      render(<TaskPalette />);
      const palette = screen.getByTestId('task-palette');
      expect(palette).toHaveAttribute('aria-label', expect.stringMatching(/task palette/i));
    });

    it('should support keyboard navigation', () => {
      render(<TaskPalette />);

      // Task items should be keyboard accessible (tab index 0)
      const firstTask = screen.getByTestId('task-item-fetch-user');
      expect(firstTask).toHaveAttribute('tabindex', '0');

      // Verify task can receive focus
      firstTask.focus();
      expect(firstTask).toHaveFocus();
    });

    it('should announce drag instructions to screen readers', () => {
      render(<TaskPalette />);

      const taskItem = screen.getByTestId('task-item-fetch-user');
      expect(taskItem).toHaveAttribute('aria-label', expect.stringMatching(/drag.*canvas/i));
    });

    it('should have proper heading hierarchy', () => {
      render(<TaskPalette />);

      const heading = screen.getByRole('heading', { name: /tasks/i });
      expect(heading.tagName).toBe('H2');
    });
  });

  describe('Collapsible Sections', () => {
    it('should collapse palette when collapse button clicked', async () => {
      const user = userEvent.setup();
      render(<TaskPalette />);

      const collapseButton = screen.getByRole('button', { name: /collapse/i });
      await user.click(collapseButton);

      // Task list should be hidden
      expect(screen.queryByText('Fetch User')).not.toBeInTheDocument();
    });

    it('should expand palette when expand button clicked', async () => {
      const user = userEvent.setup();
      render(<TaskPalette />);

      // Collapse first
      const collapseButton = screen.getByRole('button', { name: /collapse/i });
      await user.click(collapseButton);

      // Then expand
      const expandButton = screen.getByRole('button', { name: /expand/i });
      await user.click(expandButton);

      // Tasks should be visible again
      expect(screen.getByText('Fetch User')).toBeInTheDocument();
    });

    it('should remember collapsed state', async () => {
      const user = userEvent.setup();
      const { rerender } = render(<TaskPalette />);

      // Collapse
      const collapseButton = screen.getByRole('button', { name: /collapse/i });
      await user.click(collapseButton);

      // Rerender (simulates re-mount)
      rerender(<TaskPalette />);

      // Should still be collapsed
      expect(screen.queryByText('Fetch User')).not.toBeInTheDocument();
    });
  });
});
