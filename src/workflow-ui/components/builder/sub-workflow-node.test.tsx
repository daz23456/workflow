/**
 * Unit tests for SubWorkflowNode component
 *
 * Tests custom React Flow node for sub-workflow references
 * Following TDD: RED phase - these tests should FAIL until implementation
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SubWorkflowNode } from './sub-workflow-node';

// Create mock functions
const mockUpdateNode = vi.fn();
const mockDeleteNode = vi.fn();
const mockOnExpand = vi.fn();

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

describe('SubWorkflowNode', () => {
  const mockNodeProps = {
    id: 'subworkflow-1',
    type: 'subworkflow',
    data: {
      label: 'Order Processing',
      workflowRef: 'order-processing-v2',
      taskCount: 5,
      description: 'Processes customer orders',
      isExpanded: false,
      executionStatus: 'idle' as const,
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
    mockOnExpand.mockClear();
  });

  describe('Rendering', () => {
    it('should render sub-workflow node with label', () => {
      render(<SubWorkflowNode {...mockNodeProps} />);
      expect(screen.getByText('Order Processing')).toBeInTheDocument();
    });

    it('should render workflowRef', () => {
      render(<SubWorkflowNode {...mockNodeProps} />);
      expect(screen.getByText('order-processing-v2')).toBeInTheDocument();
    });

    it('should render nested workflow icon', () => {
      render(<SubWorkflowNode {...mockNodeProps} />);
      const icon = screen.getByTestId('subworkflow-icon');
      expect(icon).toBeInTheDocument();
    });

    it('should render task count badge', () => {
      render(<SubWorkflowNode {...mockNodeProps} />);
      expect(screen.getByText('5 tasks')).toBeInTheDocument();
    });

    it('should render description when provided', () => {
      render(<SubWorkflowNode {...mockNodeProps} />);
      expect(screen.getByText('Processes customer orders')).toBeInTheDocument();
    });

    it('should render connection handles', () => {
      render(<SubWorkflowNode {...mockNodeProps} />);
      expect(screen.getByTestId('handle-target-top')).toBeInTheDocument();
      expect(screen.getByTestId('handle-source-bottom')).toBeInTheDocument();
    });

    it('should have distinct visual styling from task nodes', () => {
      const { container } = render(<SubWorkflowNode {...mockNodeProps} />);
      const node = container.querySelector('[data-node-type="subworkflow"]');
      expect(node).toBeInTheDocument();
    });
  });

  describe('Expand/Collapse', () => {
    it('should show expand button', () => {
      render(<SubWorkflowNode {...mockNodeProps} />);
      const expandButton = screen.getByTestId('expand-subworkflow-button');
      expect(expandButton).toBeInTheDocument();
    });

    it('should call onExpand callback when expand button clicked', async () => {
      const user = userEvent.setup();
      render(<SubWorkflowNode {...mockNodeProps} onExpand={mockOnExpand} />);

      const expandButton = screen.getByTestId('expand-subworkflow-button');
      await user.click(expandButton);

      expect(mockOnExpand).toHaveBeenCalledWith('subworkflow-1', 'order-processing-v2');
    });

    it('should show collapse button when expanded', () => {
      const expandedProps = {
        ...mockNodeProps,
        data: { ...mockNodeProps.data, isExpanded: true },
      };
      render(<SubWorkflowNode {...expandedProps} />);

      const collapseButton = screen.getByTestId('collapse-subworkflow-button');
      expect(collapseButton).toBeInTheDocument();
    });
  });

  describe('Execution Status', () => {
    it('should show idle status indicator', () => {
      render(<SubWorkflowNode {...mockNodeProps} />);
      const status = screen.getByTestId('execution-status');
      expect(status).toHaveAttribute('data-status', 'idle');
    });

    it('should show running status with animation', () => {
      const runningProps = {
        ...mockNodeProps,
        data: { ...mockNodeProps.data, executionStatus: 'running' as const },
      };
      render(<SubWorkflowNode {...runningProps} />);

      const status = screen.getByTestId('execution-status');
      expect(status).toHaveAttribute('data-status', 'running');
      expect(status.className).toContain('animate');
    });

    it('should show success status', () => {
      const successProps = {
        ...mockNodeProps,
        data: { ...mockNodeProps.data, executionStatus: 'success' as const },
      };
      render(<SubWorkflowNode {...successProps} />);

      const status = screen.getByTestId('execution-status');
      expect(status).toHaveAttribute('data-status', 'success');
    });

    it('should show failed status', () => {
      const failedProps = {
        ...mockNodeProps,
        data: { ...mockNodeProps.data, executionStatus: 'failed' as const },
      };
      render(<SubWorkflowNode {...failedProps} />);

      const status = screen.getByTestId('execution-status');
      expect(status).toHaveAttribute('data-status', 'failed');
    });
  });

  describe('Cycle Warning', () => {
    it('should show cycle warning icon when cycleWarning is set', () => {
      const warningProps = {
        ...mockNodeProps,
        data: {
          ...mockNodeProps.data,
          cycleWarning: 'Cycle detected: order-processing → notify → order-processing',
        },
      };
      render(<SubWorkflowNode {...warningProps} />);

      const warning = screen.getByTestId('cycle-warning');
      expect(warning).toBeInTheDocument();
    });

    it('should show cycle warning tooltip on hover', async () => {
      const user = userEvent.setup();
      const warningProps = {
        ...mockNodeProps,
        data: {
          ...mockNodeProps.data,
          cycleWarning: 'Cycle detected: order-processing → notify → order-processing',
        },
      };
      render(<SubWorkflowNode {...warningProps} />);

      const warning = screen.getByTestId('cycle-warning');
      await user.hover(warning);

      await waitFor(() => {
        expect(screen.getByText(/Cycle detected/)).toBeInTheDocument();
      });
    });

    it('should not show cycle warning when cycleWarning is not set', () => {
      render(<SubWorkflowNode {...mockNodeProps} />);
      expect(screen.queryByTestId('cycle-warning')).not.toBeInTheDocument();
    });
  });

  describe('Validation', () => {
    it('should show error when workflowRef is missing', () => {
      const invalidProps = {
        ...mockNodeProps,
        data: { ...mockNodeProps.data, workflowRef: undefined },
      };
      const { container } = render(<SubWorkflowNode {...invalidProps} />);

      const errorIndicator = container.querySelector('[data-validation="error"]');
      expect(errorIndicator).toBeInTheDocument();
    });

    it('should show valid indicator when workflowRef is set', () => {
      const { container } = render(<SubWorkflowNode {...mockNodeProps} />);

      const validIndicator = container.querySelector('[data-validation="valid"]');
      expect(validIndicator).toBeInTheDocument();
    });
  });

  describe('Selection and Deletion', () => {
    it('should apply selected styles when selected', () => {
      const selectedProps = { ...mockNodeProps, selected: true };
      const { container } = render(<SubWorkflowNode {...selectedProps} />);

      const nodeElement = container.querySelector('[data-selected="true"]');
      expect(nodeElement).toBeInTheDocument();
    });

    it('should show delete button on hover when selected', async () => {
      const user = userEvent.setup();
      const selectedProps = { ...mockNodeProps, selected: true };
      const { container } = render(<SubWorkflowNode {...selectedProps} />);

      const node = container.firstChild as HTMLElement;
      await user.hover(node);

      const deleteButton = screen.getByTestId('delete-node-button');
      expect(deleteButton).toBeInTheDocument();
    });

    it('should call deleteNode when delete button clicked', async () => {
      const selectedProps = { ...mockNodeProps, selected: true };
      const { container } = render(<SubWorkflowNode {...selectedProps} />);

      const node = container.firstChild as HTMLElement;
      fireEvent.mouseEnter(node);

      const deleteButton = await screen.findByTestId('delete-node-button');
      fireEvent.click(deleteButton);

      expect(mockDeleteNode).toHaveBeenCalledWith('subworkflow-1');
    });
  });

  describe('Accessibility', () => {
    it('should have accessible label', () => {
      render(<SubWorkflowNode {...mockNodeProps} />);

      const node = screen.getByRole('article');
      expect(node).toHaveAttribute('aria-label', 'Sub-workflow: Order Processing');
    });

    it('should announce cycle warnings to screen readers', () => {
      const warningProps = {
        ...mockNodeProps,
        data: {
          ...mockNodeProps.data,
          cycleWarning: 'Cycle detected',
        },
      };
      render(<SubWorkflowNode {...warningProps} />);

      const alertMessage = screen.getByRole('alert');
      expect(alertMessage).toHaveTextContent(/Cycle detected/);
    });
  });
});
