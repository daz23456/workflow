/**
 * Unit tests for PropertiesPanel component
 *
 * Tests properties panel for selected workflow nodes
 * Following TDD: RED phase - these tests should FAIL until implementation
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PropertiesPanel } from './properties-panel';
import type { WorkflowBuilderNode } from '@/lib/types/workflow-builder';

// Mock Zustand store
const mockUpdateNode = vi.fn();
const mockClearSelection = vi.fn();

let mockStoreState = {
  graph: {
    nodes: [] as WorkflowBuilderNode[],
    edges: [],
    parallelGroups: [],
  },
  selection: {
    nodeIds: [] as string[],
    edgeIds: [],
  },
  updateNode: mockUpdateNode,
  clearSelection: mockClearSelection,
};

vi.mock('@/lib/stores/workflow-builder-store', () => ({
  useWorkflowBuilderStore: (selector: any) => {
    if (selector) {
      return selector(mockStoreState);
    }
    return mockStoreState;
  },
}));

describe('PropertiesPanel', () => {
  beforeEach(() => {
    mockUpdateNode.mockClear();
    mockClearSelection.mockClear();
    // Reset to default state
    mockStoreState = {
      graph: {
        nodes: [],
        edges: [],
        parallelGroups: [],
      },
      selection: {
        nodeIds: [],
        edgeIds: [],
      },
      updateNode: mockUpdateNode,
      clearSelection: mockClearSelection,
    };
  });

  describe('Rendering', () => {
    it('should render properties panel container', () => {
      render(<PropertiesPanel />);
      expect(screen.getByTestId('properties-panel')).toBeInTheDocument();
    });

    it('should render panel title', () => {
      render(<PropertiesPanel />);
      expect(screen.getByText('Properties')).toBeInTheDocument();
    });

    it('should show empty state when no node is selected', () => {
      render(<PropertiesPanel />);
      expect(screen.getByText(/no task selected/i)).toBeInTheDocument();
      expect(screen.getByText(/select.*task.*canvas/i)).toBeInTheDocument();
    });

    it('should show node properties when node is selected', () => {
      mockStoreState.graph.nodes = [
        {
          id: 'node-1',
          type: 'task',
          position: { x: 100, y: 100 },
          data: {
            label: 'Fetch User',
            taskRef: 'fetch-user',
            description: 'Fetches user data from API',
          },
        },
      ] as WorkflowBuilderNode[];
      mockStoreState.selection.nodeIds = ['node-1'];

      render(<PropertiesPanel />);

      expect(screen.getByDisplayValue('Fetch User')).toBeInTheDocument();
      expect(screen.getByDisplayValue('fetch-user')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Fetches user data from API')).toBeInTheDocument();
    });
  });

  describe('Node Selection', () => {
    it('should display first selected node when multiple nodes selected', () => {
      mockStoreState.graph.nodes = [
        {
          id: 'node-1',
          type: 'task',
          position: { x: 100, y: 100 },
          data: { label: 'Task 1', taskRef: 'task-1' },
        },
        {
          id: 'node-2',
          type: 'task',
          position: { x: 200, y: 200 },
          data: { label: 'Task 2', taskRef: 'task-2' },
        },
      ] as WorkflowBuilderNode[];
      mockStoreState.selection.nodeIds = ['node-1', 'node-2'];

      render(<PropertiesPanel />);

      // Should show first selected node
      expect(screen.getByDisplayValue('Task 1')).toBeInTheDocument();
      expect(screen.queryByDisplayValue('Task 2')).not.toBeInTheDocument();
    });

    it('should show message when multiple nodes selected', () => {
      mockStoreState.graph.nodes = [
        {
          id: 'node-1',
          type: 'task',
          position: { x: 100, y: 100 },
          data: { label: 'Task 1', taskRef: 'task-1' },
        },
        {
          id: 'node-2',
          type: 'task',
          position: { x: 200, y: 200 },
          data: { label: 'Task 2', taskRef: 'task-2' },
        },
      ] as WorkflowBuilderNode[];
      mockStoreState.selection.nodeIds = ['node-1', 'node-2'];

      render(<PropertiesPanel />);

      expect(screen.getByText(/2 tasks selected/i)).toBeInTheDocument();
      expect(screen.getByText(/editing first task/i)).toBeInTheDocument();
    });
  });

  describe('Label Editing', () => {
    beforeEach(() => {
      mockStoreState.graph.nodes = [
        {
          id: 'node-1',
          type: 'task',
          position: { x: 100, y: 100 },
          data: {
            label: 'Fetch User',
            taskRef: 'fetch-user',
            description: 'Fetches user data',
          },
        },
      ] as WorkflowBuilderNode[];
      mockStoreState.selection.nodeIds = ['node-1'];
    });

    it('should render label input field', () => {
      render(<PropertiesPanel />);
      const labelInput = screen.getByLabelText(/label/i);
      expect(labelInput).toBeInTheDocument();
      expect(labelInput).toHaveValue('Fetch User');
    });

    it('should update node label on change', async () => {
      const user = userEvent.setup();
      render(<PropertiesPanel />);

      const labelInput = screen.getByLabelText(/label/i);
      await user.clear(labelInput);
      await user.type(labelInput, 'Get User Data');

      // Should update on blur
      fireEvent.blur(labelInput);

      await waitFor(() => {
        expect(mockUpdateNode).toHaveBeenCalledWith('node-1', {
          data: expect.objectContaining({
            label: 'Get User Data',
          }),
        });
      });
    });

    it('should not update if label is empty', async () => {
      const user = userEvent.setup();
      render(<PropertiesPanel />);

      const labelInput = screen.getByLabelText(/label/i);
      await user.clear(labelInput);
      fireEvent.blur(labelInput);

      // Should not call updateNode
      expect(mockUpdateNode).not.toHaveBeenCalled();
    });

    it('should trim whitespace from label', async () => {
      const user = userEvent.setup();
      render(<PropertiesPanel />);

      const labelInput = screen.getByLabelText(/label/i);
      await user.clear(labelInput);
      await user.type(labelInput, '  Trimmed Label  ');
      fireEvent.blur(labelInput);

      await waitFor(() => {
        expect(mockUpdateNode).toHaveBeenCalledWith('node-1', {
          data: expect.objectContaining({
            label: 'Trimmed Label',
          }),
        });
      });
    });
  });

  describe('Task Reference Display', () => {
    it('should render taskRef as read-only', () => {
      mockStoreState.graph.nodes = [
        {
          id: 'node-1',
          type: 'task',
          position: { x: 100, y: 100 },
          data: { label: 'Task', taskRef: 'fetch-user' },
        },
      ] as WorkflowBuilderNode[];
      mockStoreState.selection.nodeIds = ['node-1'];

      render(<PropertiesPanel />);

      const taskRefInput = screen.getByDisplayValue('fetch-user');
      expect(taskRefInput).toBeInTheDocument();
      expect(taskRefInput).toHaveAttribute('readonly');
    });

    it('should show helper text for taskRef', () => {
      mockStoreState.graph.nodes = [
        {
          id: 'node-1',
          type: 'task',
          position: { x: 100, y: 100 },
          data: { label: 'Task', taskRef: 'fetch-user' },
        },
      ] as WorkflowBuilderNode[];
      mockStoreState.selection.nodeIds = ['node-1'];

      render(<PropertiesPanel />);

      expect(screen.getByText(/task reference.*cannot be changed/i)).toBeInTheDocument();
    });
  });

  describe('Description Editing', () => {
    beforeEach(() => {
      mockStoreState.graph.nodes = [
        {
          id: 'node-1',
          type: 'task',
          position: { x: 100, y: 100 },
          data: {
            label: 'Fetch User',
            taskRef: 'fetch-user',
            description: 'Fetches user data',
          },
        },
      ] as WorkflowBuilderNode[];
      mockStoreState.selection.nodeIds = ['node-1'];
    });

    it('should render description textarea', () => {
      render(<PropertiesPanel />);
      const descriptionTextarea = screen.getByLabelText(/description/i);
      expect(descriptionTextarea).toBeInTheDocument();
      expect(descriptionTextarea.tagName).toBe('TEXTAREA');
      expect(descriptionTextarea).toHaveValue('Fetches user data');
    });

    it('should update description on change', async () => {
      const user = userEvent.setup();
      render(<PropertiesPanel />);

      const descriptionTextarea = screen.getByLabelText(/description/i);
      await user.clear(descriptionTextarea);
      await user.type(descriptionTextarea, 'New description');
      fireEvent.blur(descriptionTextarea);

      await waitFor(() => {
        expect(mockUpdateNode).toHaveBeenCalledWith('node-1', {
          data: expect.objectContaining({
            description: 'New description',
          }),
        });
      });
    });

    it('should allow empty description', async () => {
      const user = userEvent.setup();
      render(<PropertiesPanel />);

      const descriptionTextarea = screen.getByLabelText(/description/i);
      await user.clear(descriptionTextarea);
      fireEvent.blur(descriptionTextarea);

      await waitFor(() => {
        expect(mockUpdateNode).toHaveBeenCalledWith('node-1', {
          data: expect.objectContaining({
            description: '',
          }),
        });
      });
    });
  });

  describe('Validation', () => {
    it('should show error when taskRef is missing', () => {
      mockStoreState.graph.nodes = [
        {
          id: 'node-1',
          type: 'task',
          position: { x: 100, y: 100 },
          data: { label: 'Task', taskRef: undefined as any },
        },
      ] as WorkflowBuilderNode[];
      mockStoreState.selection.nodeIds = ['node-1'];

      render(<PropertiesPanel />);

      const errorMessages = screen.getAllByText(/task reference is required/i);
      expect(errorMessages.length).toBeGreaterThan(0);
      expect(screen.getByTestId('validation-error')).toBeInTheDocument();
    });

    it('should show warning when description is missing', () => {
      mockStoreState.graph.nodes = [
        {
          id: 'node-1',
          type: 'task',
          position: { x: 100, y: 100 },
          data: { label: 'Task', taskRef: 'task-1', description: undefined },
        },
      ] as WorkflowBuilderNode[];
      mockStoreState.selection.nodeIds = ['node-1'];

      render(<PropertiesPanel />);

      expect(screen.getByText(/description is recommended/i)).toBeInTheDocument();
      expect(screen.getByTestId('validation-warning')).toBeInTheDocument();
    });

    it('should show valid indicator when all fields are complete', () => {
      mockStoreState.graph.nodes = [
        {
          id: 'node-1',
          type: 'task',
          position: { x: 100, y: 100 },
          data: {
            label: 'Task',
            taskRef: 'task-1',
            description: 'Description',
          },
        },
      ] as WorkflowBuilderNode[];
      mockStoreState.selection.nodeIds = ['node-1'];

      render(<PropertiesPanel />);

      expect(screen.getByText(/task is valid/i)).toBeInTheDocument();
      expect(screen.getByTestId('validation-valid')).toBeInTheDocument();
    });
  });

  describe('Close Action', () => {
    it('should render close button', () => {
      mockStoreState.graph.nodes = [
        {
          id: 'node-1',
          type: 'task',
          position: { x: 100, y: 100 },
          data: { label: 'Task', taskRef: 'task-1' },
        },
      ] as WorkflowBuilderNode[];
      mockStoreState.selection.nodeIds = ['node-1'];

      render(<PropertiesPanel />);

      expect(screen.getByRole('button', { name: /close/i })).toBeInTheDocument();
    });

    it('should clear selection when close button clicked', async () => {
      mockStoreState.graph.nodes = [
        {
          id: 'node-1',
          type: 'task',
          position: { x: 100, y: 100 },
          data: { label: 'Task', taskRef: 'task-1' },
        },
      ] as WorkflowBuilderNode[];
      mockStoreState.selection.nodeIds = ['node-1'];

      const user = userEvent.setup();
      render(<PropertiesPanel />);

      const closeButton = screen.getByRole('button', { name: /close/i });
      await user.click(closeButton);

      expect(mockClearSelection).toHaveBeenCalled();
    });

    it('should close panel on Escape key', async () => {
      mockStoreState.graph.nodes = [
        {
          id: 'node-1',
          type: 'task',
          position: { x: 100, y: 100 },
          data: { label: 'Task', taskRef: 'task-1' },
        },
      ] as WorkflowBuilderNode[];
      mockStoreState.selection.nodeIds = ['node-1'];

      render(<PropertiesPanel />);

      fireEvent.keyDown(document, { key: 'Escape' });

      await waitFor(() => {
        expect(mockClearSelection).toHaveBeenCalled();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have accessible label', () => {
      render(<PropertiesPanel />);
      const panel = screen.getByTestId('properties-panel');
      expect(panel).toHaveAttribute('aria-label', expect.stringMatching(/properties panel/i));
    });

    it('should have proper form labels', () => {
      mockStoreState.graph.nodes = [
        {
          id: 'node-1',
          type: 'task',
          position: { x: 100, y: 100 },
          data: { label: 'Task', taskRef: 'task-1', description: 'Desc' },
        },
      ] as WorkflowBuilderNode[];
      mockStoreState.selection.nodeIds = ['node-1'];

      render(<PropertiesPanel />);

      expect(screen.getByLabelText(/^label$/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/task reference/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
    });

    it('should announce validation errors to screen readers', () => {
      mockStoreState.graph.nodes = [
        {
          id: 'node-1',
          type: 'task',
          position: { x: 100, y: 100 },
          data: { label: 'Task', taskRef: undefined as any },
        },
      ] as WorkflowBuilderNode[];
      mockStoreState.selection.nodeIds = ['node-1'];

      render(<PropertiesPanel />);

      const errorMessage = screen.getByRole('alert');
      expect(errorMessage).toHaveTextContent(/task reference is required/i);
    });

    it('should support keyboard navigation', () => {
      mockStoreState.graph.nodes = [
        {
          id: 'node-1',
          type: 'task',
          position: { x: 100, y: 100 },
          data: { label: 'Task', taskRef: 'task-1', description: 'Desc' },
        },
      ] as WorkflowBuilderNode[];
      mockStoreState.selection.nodeIds = ['node-1'];

      render(<PropertiesPanel />);

      const labelInput = screen.getByLabelText(/^label$/i);
      const descriptionTextarea = screen.getByLabelText(/description/i);

      // Should be focusable
      labelInput.focus();
      expect(labelInput).toHaveFocus();

      descriptionTextarea.focus();
      expect(descriptionTextarea).toHaveFocus();
    });
  });

  describe('Responsive Behavior', () => {
    it('should have proper width for desktop', () => {
      const { container } = render(<PropertiesPanel />);
      const panel = container.firstChild as HTMLElement;
      expect(panel.className).toContain('w-80'); // Tailwind class for width
    });

    it('should be scrollable when content overflows', () => {
      mockStoreState.graph.nodes = [
        {
          id: 'node-1',
          type: 'task',
          position: { x: 100, y: 100 },
          data: { label: 'Task', taskRef: 'task-1', description: 'Desc' },
        },
      ] as WorkflowBuilderNode[];
      mockStoreState.selection.nodeIds = ['node-1'];

      const { container } = render(<PropertiesPanel />);
      const panel = container.firstChild as HTMLElement;
      expect(panel.className).toContain('overflow-y-auto');
    });
  });
});
