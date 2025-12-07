/**
 * Unit tests for SubWorkflowExpander component
 *
 * Tests panel that displays expanded sub-workflow graph
 * Following TDD: RED phase
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SubWorkflowExpander } from './sub-workflow-expander';

// Mock React Flow
vi.mock('@xyflow/react', async () => {
  const actual = await vi.importActual('@xyflow/react');
  return {
    ...actual,
    ReactFlow: ({ nodes, edges, children }: any) => (
      <div data-testid="react-flow" data-nodes={JSON.stringify(nodes)} data-edges={JSON.stringify(edges)}>
        {children}
      </div>
    ),
    ReactFlowProvider: ({ children }: any) => children,
    Background: () => <div data-testid="background" />,
    Controls: () => <div data-testid="controls" />,
    MiniMap: () => <div data-testid="minimap" />,
  };
});

describe('SubWorkflowExpander', () => {
  const mockWorkflow = {
    name: 'order-processing',
    tasks: [
      { id: 'validate', taskRef: 'validate-order', label: 'Validate Order' },
      { id: 'process', taskRef: 'process-payment', label: 'Process Payment', dependsOn: ['validate'] },
      { id: 'notify', taskRef: 'send-notification', label: 'Send Notification', dependsOn: ['process'] },
    ],
  };

  const mockOnClose = vi.fn();
  const mockOnNavigate = vi.fn();

  beforeEach(() => {
    mockOnClose.mockClear();
    mockOnNavigate.mockClear();
  });

  describe('Rendering', () => {
    it('should render panel with workflow name', () => {
      render(
        <SubWorkflowExpander
          workflowName="order-processing"
          tasks={mockWorkflow.tasks}
          onClose={mockOnClose}
        />
      );
      expect(screen.getByText('order-processing')).toBeInTheDocument();
    });

    it('should render React Flow graph', () => {
      render(
        <SubWorkflowExpander
          workflowName="order-processing"
          tasks={mockWorkflow.tasks}
          onClose={mockOnClose}
        />
      );
      expect(screen.getByTestId('react-flow')).toBeInTheDocument();
    });

    it('should render all tasks as nodes', () => {
      render(
        <SubWorkflowExpander
          workflowName="order-processing"
          tasks={mockWorkflow.tasks}
          onClose={mockOnClose}
        />
      );
      const flow = screen.getByTestId('react-flow');
      const nodes = JSON.parse(flow.getAttribute('data-nodes') || '[]');
      expect(nodes).toHaveLength(3);
    });

    it('should render task dependencies as edges', () => {
      render(
        <SubWorkflowExpander
          workflowName="order-processing"
          tasks={mockWorkflow.tasks}
          onClose={mockOnClose}
        />
      );
      const flow = screen.getByTestId('react-flow');
      const edges = JSON.parse(flow.getAttribute('data-edges') || '[]');
      expect(edges).toHaveLength(2);
    });

    it('should show close button', () => {
      render(
        <SubWorkflowExpander
          workflowName="order-processing"
          tasks={mockWorkflow.tasks}
          onClose={mockOnClose}
        />
      );
      expect(screen.getByTestId('close-expander-button')).toBeInTheDocument();
    });

    it('should show task count', () => {
      render(
        <SubWorkflowExpander
          workflowName="order-processing"
          tasks={mockWorkflow.tasks}
          onClose={mockOnClose}
        />
      );
      expect(screen.getByText('3 tasks')).toBeInTheDocument();
    });
  });

  describe('Close Action', () => {
    it('should call onClose when close button clicked', async () => {
      const user = userEvent.setup();
      render(
        <SubWorkflowExpander
          workflowName="order-processing"
          tasks={mockWorkflow.tasks}
          onClose={mockOnClose}
        />
      );

      await user.click(screen.getByTestId('close-expander-button'));
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should call onClose when Escape key pressed', async () => {
      const user = userEvent.setup();
      render(
        <SubWorkflowExpander
          workflowName="order-processing"
          tasks={mockWorkflow.tasks}
          onClose={mockOnClose}
        />
      );

      await user.keyboard('{Escape}');
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe('Nested Sub-Workflows', () => {
    it('should show expand button on sub-workflow tasks', () => {
      const tasksWithSubWorkflow = [
        ...mockWorkflow.tasks,
        { id: 'nested', workflowRef: 'nested-workflow', label: 'Nested Workflow' },
      ];

      render(
        <SubWorkflowExpander
          workflowName="order-processing"
          tasks={tasksWithSubWorkflow}
          onClose={mockOnClose}
          onNavigate={mockOnNavigate}
        />
      );

      // Should have a way to navigate into nested sub-workflow
      expect(screen.getByTestId('navigate-nested-workflow')).toBeInTheDocument();
    });

    it('should call onNavigate when expanding nested sub-workflow', async () => {
      const user = userEvent.setup();
      const tasksWithSubWorkflow = [
        ...mockWorkflow.tasks,
        { id: 'nested', workflowRef: 'nested-workflow', label: 'Nested Workflow' },
      ];

      render(
        <SubWorkflowExpander
          workflowName="order-processing"
          tasks={tasksWithSubWorkflow}
          onClose={mockOnClose}
          onNavigate={mockOnNavigate}
        />
      );

      await user.click(screen.getByTestId('navigate-nested-workflow'));
      expect(mockOnNavigate).toHaveBeenCalledWith('nested-workflow');
    });
  });

  describe('Empty State', () => {
    it('should show empty message when no tasks', () => {
      render(
        <SubWorkflowExpander
          workflowName="empty-workflow"
          tasks={[]}
          onClose={mockOnClose}
        />
      );
      expect(screen.getByText(/no tasks/i)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have accessible panel role', () => {
      render(
        <SubWorkflowExpander
          workflowName="order-processing"
          tasks={mockWorkflow.tasks}
          onClose={mockOnClose}
        />
      );
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('should have accessible title', () => {
      render(
        <SubWorkflowExpander
          workflowName="order-processing"
          tasks={mockWorkflow.tasks}
          onClose={mockOnClose}
        />
      );
      expect(screen.getByRole('dialog')).toHaveAttribute('aria-label', 'Sub-workflow: order-processing');
    });
  });
});
