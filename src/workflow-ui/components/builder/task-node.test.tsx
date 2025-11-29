/**
 * Unit tests for TaskNode component
 *
 * Tests custom React Flow node for workflow tasks
 * Following TDD: RED phase - these tests should FAIL until implementation
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TaskNode } from './task-node';
import type { NodeProps } from '@xyflow/react';
import type { WorkflowBuilderNodeData } from '@/lib/types/workflow-builder';

// Create mock functions
const mockUpdateNode = vi.fn();
const mockDeleteNode = vi.fn();

// Mock Zustand store
vi.mock('@/lib/stores/workflow-builder-store', () => ({
  useWorkflowBuilderStore: (selector: any) => {
    const store = {
      updateNode: mockUpdateNode,
      deleteNode: mockDeleteNode,
    };
    return selector(store);
  },
}));

// Mock React Flow hooks
vi.mock('@xyflow/react', async () => {
  const actual = await vi.importActual('@xyflow/react');
  return {
    ...actual,
    Handle: ({ type, position, id, isConnectable, ...props }: any) => (
      <div
        data-testid={`handle-${type}-${position}`}
        data-handleid={id}
        data-connectable={String(isConnectable)}
        {...props}
      />
    ),
    Position: {
      Top: 'top',
      Right: 'right',
      Bottom: 'bottom',
      Left: 'left',
    },
  };
});

describe('TaskNode', () => {
  const mockNodeProps = {
    id: 'task-1',
    type: 'task',
    data: {
      label: 'Fetch User',
      taskRef: 'fetch-user',
      description: 'Fetches user data from API',
    },
    selected: false,
    isConnectable: true,
    xPos: 0,
    yPos: 0,
    zIndex: 0,
    dragging: false,
  } as any;

  beforeEach(() => {
    mockUpdateNode.mockClear();
    mockDeleteNode.mockClear();
  });

  describe('Rendering', () => {
    it('should render task node with label', () => {
      render(<TaskNode {...mockNodeProps} />);
      expect(screen.getByText('Fetch User')).toBeInTheDocument();
    });

    it('should render taskRef', () => {
      render(<TaskNode {...mockNodeProps} />);
      expect(screen.getByText('fetch-user')).toBeInTheDocument();
    });

    it('should render description when provided', () => {
      render(<TaskNode {...mockNodeProps} />);
      expect(screen.getByText('Fetches user data from API')).toBeInTheDocument();
    });

    it('should not render description when not provided', () => {
      const propsWithoutDescription = {
        ...mockNodeProps,
        data: {
          ...mockNodeProps.data,
          description: undefined,
        },
      };
      render(<TaskNode {...propsWithoutDescription} />);
      expect(screen.queryByText('Fetches user data from API')).not.toBeInTheDocument();
    });

    it('should render connection handles (source and target)', () => {
      render(<TaskNode {...mockNodeProps} />);

      // Should have target handle (for incoming edges)
      expect(screen.getByTestId('handle-target-top')).toBeInTheDocument();

      // Should have source handle (for outgoing edges)
      expect(screen.getByTestId('handle-source-bottom')).toBeInTheDocument();
    });
  });

  describe('Selection State', () => {
    it('should apply selected styles when selected', () => {
      const selectedProps = { ...mockNodeProps, selected: true };
      const { container } = render(<TaskNode {...selectedProps} />);

      const nodeElement = container.querySelector('[data-selected="true"]');
      expect(nodeElement).toBeInTheDocument();
    });

    it('should not apply selected styles when not selected', () => {
      const { container } = render(<TaskNode {...mockNodeProps} />);

      const nodeElement = container.querySelector('[data-selected="false"]');
      expect(nodeElement).toBeInTheDocument();
    });

    it('should show selection ring when selected', () => {
      const selectedProps = { ...mockNodeProps, selected: true };
      const { container } = render(<TaskNode {...selectedProps} />);

      // Check for ring class or style (implementation detail, but verifies visual feedback)
      const nodeElement = container.querySelector('[class*="ring"]');
      expect(nodeElement).toBeInTheDocument();
    });
  });

  describe('Edit Mode', () => {
    it('should enter edit mode on double-click', async () => {
      const user = userEvent.setup();
      render(<TaskNode {...mockNodeProps} />);

      const labelElement = screen.getByText('Fetch User');
      await user.dblClick(labelElement);

      // Should show input field in edit mode
      const input = screen.getByDisplayValue('Fetch User');
      expect(input).toBeInTheDocument();
      expect(input.tagName).toBe('INPUT');
    });

    it('should save changes on blur', async () => {
      const user = userEvent.setup();
      render(<TaskNode {...mockNodeProps} />);

      const labelElement = screen.getByText('Fetch User');
      await user.dblClick(labelElement);

      const input = screen.getByDisplayValue('Fetch User');
      await user.clear(input);
      await user.type(input, 'Get User Data');

      // Blur to save
      fireEvent.blur(input);

      await waitFor(() => {
        expect(mockUpdateNode).toHaveBeenCalledWith('task-1', {
          data: expect.objectContaining({
            label: 'Get User Data',
          }),
        });
      });
    });

    it('should save changes on Enter key', async () => {
      const user = userEvent.setup();
      render(<TaskNode {...mockNodeProps} />);

      const labelElement = screen.getByText('Fetch User');
      await user.dblClick(labelElement);

      const input = screen.getByDisplayValue('Fetch User');
      await user.clear(input);
      await user.type(input, 'Get User Data{Enter}');

      // Should exit edit mode and update node
      await waitFor(() => {
        expect(mockUpdateNode).toHaveBeenCalledWith('task-1', {
          data: expect.objectContaining({
            label: 'Get User Data',
          }),
        });
      });
    });

    it('should cancel edit on Escape key', async () => {
      const user = userEvent.setup();
      render(<TaskNode {...mockNodeProps} />);

      const labelElement = screen.getByText('Fetch User');
      await user.dblClick(labelElement);

      const input = screen.getByDisplayValue('Fetch User');
      await user.clear(input);
      await user.type(input, 'Modified{Escape}');

      // Should revert to original label
      await waitFor(() => {
        expect(screen.getByText('Fetch User')).toBeInTheDocument();
        expect(screen.queryByDisplayValue('Modified')).not.toBeInTheDocument();
      });
    });
  });

  describe('Validation States', () => {
    it('should show error indicator when taskRef is missing', () => {
      const invalidProps = {
        ...mockNodeProps,
        data: {
          ...mockNodeProps.data,
          taskRef: undefined,
        },
      };
      const { container } = render(<TaskNode {...invalidProps} />);

      // Should show error indicator (red border or icon)
      const errorIndicator = container.querySelector('[data-validation="error"]');
      expect(errorIndicator).toBeInTheDocument();
    });

    it('should show warning indicator when description is missing', () => {
      const propsWithoutDescription = {
        ...mockNodeProps,
        data: {
          ...mockNodeProps.data,
          description: undefined,
        },
      };
      const { container } = render(<TaskNode {...propsWithoutDescription} />);

      // Should show warning indicator (yellow border or icon)
      const warningIndicator = container.querySelector('[data-validation="warning"]');
      expect(warningIndicator).toBeInTheDocument();
    });

    it('should show valid indicator when all required fields present', () => {
      const { container } = render(<TaskNode {...mockNodeProps} />);

      // Should show valid indicator (green checkmark or border)
      const validIndicator = container.querySelector('[data-validation="valid"]');
      expect(validIndicator).toBeInTheDocument();
    });

    it('should show error tooltip on hover over error indicator', async () => {
      const user = userEvent.setup();
      const invalidProps = {
        ...mockNodeProps,
        data: {
          ...mockNodeProps.data,
          taskRef: undefined,
        },
      };
      render(<TaskNode {...invalidProps} />);

      const errorIndicator = screen.getByTestId('validation-error');
      await user.hover(errorIndicator);

      await waitFor(() => {
        expect(screen.getByText(/taskRef is required/i)).toBeInTheDocument();
      });
    });
  });

  describe('Delete Action', () => {
    it('should show delete button on hover when selected', async () => {
      const user = userEvent.setup();
      const selectedProps = { ...mockNodeProps, selected: true };
      const { container } = render(<TaskNode {...selectedProps} />);

      const node = container.firstChild as HTMLElement;
      await user.hover(node);

      const deleteButton = screen.getByTestId('delete-node-button');
      expect(deleteButton).toBeInTheDocument();
    });

    it('should not show delete button when not selected', () => {
      render(<TaskNode {...mockNodeProps} />);

      const deleteButton = screen.queryByTestId('delete-node-button');
      expect(deleteButton).not.toBeInTheDocument();
    });

    it('should call deleteNode when delete button clicked', async () => {
      mockDeleteNode.mockClear(); // Clear before this specific test
      const user = userEvent.setup();
      const selectedProps = { ...mockNodeProps, selected: true };
      const { container } = render(<TaskNode {...selectedProps} />);

      const node = container.firstChild as HTMLElement;
      fireEvent.mouseEnter(node); // Trigger hover state

      // Wait for delete button to appear
      const deleteButton = await screen.findByTestId('delete-node-button');

      // Click the button
      fireEvent.click(deleteButton);

      // Verify deleteNode was called
      expect(mockDeleteNode).toHaveBeenCalledTimes(1);
      expect(mockDeleteNode).toHaveBeenCalledWith('task-1');
    });
  });

  describe('Connection Handles', () => {
    it('should render target handle at top for incoming edges', () => {
      render(<TaskNode {...mockNodeProps} />);

      const targetHandle = screen.getByTestId('handle-target-top');
      expect(targetHandle).toBeInTheDocument();
      expect(targetHandle).toHaveAttribute('data-handleid', 'target');
    });

    it('should render source handle at bottom for outgoing edges', () => {
      render(<TaskNode {...mockNodeProps} />);

      const sourceHandle = screen.getByTestId('handle-source-bottom');
      expect(sourceHandle).toBeInTheDocument();
      expect(sourceHandle).toHaveAttribute('data-handleid', 'source');
    });

    it('should disable handles when node is not connectable', () => {
      const nonConnectableProps = { ...mockNodeProps, isConnectable: false };
      render(<TaskNode {...nonConnectableProps} />);

      // Both handles should have data-connectable="false"
      const targetHandle = screen.getByTestId('handle-target-top');
      const sourceHandle = screen.getByTestId('handle-source-bottom');

      expect(targetHandle).toHaveAttribute('data-connectable', 'false');
      expect(sourceHandle).toHaveAttribute('data-connectable', 'false');
    });
  });

  describe('Accessibility', () => {
    it('should have accessible label', () => {
      render(<TaskNode {...mockNodeProps} />);

      const node = screen.getByRole('article');
      expect(node).toHaveAttribute('aria-label', 'Task: Fetch User');
    });

    it('should support keyboard navigation in edit mode', async () => {
      const user = userEvent.setup();
      render(<TaskNode {...mockNodeProps} />);

      // Focus on node container
      const node = screen.getByRole('article');
      node.focus();

      // Enter edit mode with Enter key
      await user.keyboard('{Enter}');

      // Should show input in edit mode
      const input = screen.getByDisplayValue('Fetch User');
      expect(input).toBeInTheDocument();
      expect(input).toHaveFocus();
    });

    it('should announce validation errors to screen readers', () => {
      const invalidProps = {
        ...mockNodeProps,
        data: {
          ...mockNodeProps.data,
          taskRef: undefined,
        },
      };
      render(<TaskNode {...invalidProps} />);

      const errorMessage = screen.getByRole('alert');
      expect(errorMessage).toHaveTextContent(/taskRef is required/i);
    });
  });

  describe('Styling and Visual Feedback', () => {
    it('should apply custom styles based on node type', () => {
      const { container } = render(<TaskNode {...mockNodeProps} />);

      const node = container.querySelector('[data-node-type="task"]');
      expect(node).toBeInTheDocument();
    });

    it('should show hover state on mouse enter', async () => {
      const user = userEvent.setup();
      const { container } = render(<TaskNode {...mockNodeProps} />);

      const node = container.firstChild as HTMLElement;
      await user.hover(node);

      // Check for hover class (hover:border-blue-400 applies on hover)
      // We verify the class exists in the className string
      const classNames = node.className;
      expect(classNames).toContain('hover:border-blue-400');
    });

    it('should apply dragging styles when being dragged', () => {
      const draggingProps = { ...mockNodeProps, dragging: true };
      const { container } = render(<TaskNode {...draggingProps} />);

      const node = container.querySelector('[data-dragging="true"]');
      expect(node).toBeInTheDocument();
    });
  });
});
