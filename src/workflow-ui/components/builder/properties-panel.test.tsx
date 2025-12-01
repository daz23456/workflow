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

// Mock getTaskDetail API
const mockGetTaskDetail = vi.fn();
vi.mock('@/lib/api/client', () => ({
  getTaskDetail: (...args: any[]) => mockGetTaskDetail(...args),
}));

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
  panel: {
    activePanel: 'task' as string,
    selectedTaskId: null as string | null,
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
    mockGetTaskDetail.mockClear();
    // Default mock - resolve with empty details
    mockGetTaskDetail.mockResolvedValue({
      name: 'task-1',
      inputSchema: { type: 'object', properties: {} },
      outputSchema: { type: 'object', properties: {} },
    });
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
      panel: {
        activePanel: 'task',
        selectedTaskId: null,
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
      // Component uses aria-label instead of visible title
      expect(screen.getByLabelText('Properties panel')).toBeInTheDocument();
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
      const labelInput = screen.getByLabelText(/^label$/i);
      expect(labelInput).toBeInTheDocument();
      expect(labelInput).toHaveValue('Fetch User');
    });

    it('should update node label on change', async () => {
      const user = userEvent.setup();
      render(<PropertiesPanel />);

      const labelInput = screen.getByLabelText(/^label$/i);
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

      const labelInput = screen.getByLabelText(/^label$/i);
      await user.clear(labelInput);
      fireEvent.blur(labelInput);

      // Should not call updateNode
      expect(mockUpdateNode).not.toHaveBeenCalled();
    });

    it('should trim whitespace from label', async () => {
      const user = userEvent.setup();
      render(<PropertiesPanel />);

      const labelInput = screen.getByLabelText(/^label$/i);
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
      const descriptionTextarea = screen.getByLabelText(/^description$/i);
      expect(descriptionTextarea).toBeInTheDocument();
      expect(descriptionTextarea.tagName).toBe('TEXTAREA');
      expect(descriptionTextarea).toHaveValue('Fetches user data');
    });

    it('should update description on change', async () => {
      const user = userEvent.setup();
      render(<PropertiesPanel />);

      const descriptionTextarea = screen.getByLabelText(/^description$/i);
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

      const descriptionTextarea = screen.getByLabelText(/^description$/i);
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
      expect(screen.getByLabelText(/^task reference$/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^description$/i)).toBeInTheDocument();
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
      const descriptionTextarea = screen.getByLabelText(/^description$/i);

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
      expect(panel.className).toContain('w-full'); // Full width within parent container
    });

    it('should handle overflow properly', () => {
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
      expect(panel.className).toContain('overflow-hidden'); // Overflow is managed by flex layout
    });
  });

  describe('Input Configuration', () => {
    beforeEach(() => {
      // Mock API response for task-fetch-hn-story
      mockGetTaskDetail.mockResolvedValue({
        name: 'task-fetch-hn-story',
        namespace: 'default',
        description: 'Fetches a Hacker News story by ID',
        inputSchema: {
          type: 'object',
          properties: {
            storyId: { type: 'integer', description: 'Hacker News story ID' },
          },
          required: ['storyId'],
        },
        outputSchema: {
          type: 'object',
          properties: {
            by: { type: 'string' },
            title: { type: 'string' },
            url: { type: 'string' },
          },
        },
      });

      // Setup with task details loaded (mocking API response)
      mockStoreState.graph.nodes = [
        {
          id: 'node-1',
          type: 'task',
          position: { x: 100, y: 100 },
          data: {
            label: 'Fetch Story',
            taskRef: 'task-fetch-hn-story',
            description: 'Fetches story details',
            input: {},
          },
        },
      ] as WorkflowBuilderNode[];
      mockStoreState.selection.nodeIds = ['node-1'];
    });

    it('should render input configuration section when task has input schema', async () => {
      render(<PropertiesPanel />);

      // Wait for task details to load
      await waitFor(() => {
        expect(screen.getByTestId('input-configuration-section')).toBeInTheDocument();
      });
    });

    it('should render input field for each schema property', async () => {
      render(<PropertiesPanel />);

      await waitFor(() => {
        // Should show input field for storyId (from task schema)
        expect(screen.getByTestId('input-field-storyId')).toBeInTheDocument();
      });
    });

    it('should show required indicator for required inputs', async () => {
      render(<PropertiesPanel />);

      await waitFor(() => {
        const inputField = screen.getByTestId('input-field-storyId');
        expect(inputField).toHaveAttribute('data-required', 'true');
      });
    });

    it('should allow entering literal value in input field', async () => {
      const user = userEvent.setup();
      render(<PropertiesPanel />);

      await waitFor(() => {
        expect(screen.getByTestId('input-field-storyId')).toBeInTheDocument();
      });

      const inputField = screen.getByPlaceholderText(/enter value or template/i);
      await user.type(inputField, '12345');
      fireEvent.blur(inputField);

      await waitFor(() => {
        expect(mockUpdateNode).toHaveBeenCalledWith('node-1', {
          data: expect.objectContaining({
            input: expect.objectContaining({
              storyId: '12345',
            }),
          }),
        });
      });
    });

    it('should allow entering template expression in input field', async () => {
      render(<PropertiesPanel />);

      await waitFor(() => {
        expect(screen.getByTestId('input-field-storyId')).toBeInTheDocument();
      });

      const inputField = screen.getByPlaceholderText(/enter value or template/i);
      // Use fireEvent.change to avoid userEvent special character escaping
      fireEvent.change(inputField, { target: { value: '{{tasks.get-stories.output.data[0]}}' } });
      fireEvent.blur(inputField);

      await waitFor(() => {
        expect(mockUpdateNode).toHaveBeenCalledWith('node-1', {
          data: expect.objectContaining({
            input: expect.objectContaining({
              storyId: '{{tasks.get-stories.output.data[0]}}',
            }),
          }),
        });
      });
    });

    it('should display existing input values', async () => {
      mockStoreState.graph.nodes = [
        {
          id: 'node-1',
          type: 'task',
          position: { x: 100, y: 100 },
          data: {
            label: 'Fetch Story',
            taskRef: 'task-fetch-hn-story',
            description: 'Fetches story details',
            input: {
              storyId: '{{tasks.get-stories.output.data[0]}}',
            },
          },
        },
      ] as WorkflowBuilderNode[];

      render(<PropertiesPanel />);

      await waitFor(() => {
        const inputField = screen.getByDisplayValue('{{tasks.get-stories.output.data[0]}}');
        expect(inputField).toBeInTheDocument();
      });
    });

    it('should highlight template expressions with visual indicator', async () => {
      mockStoreState.graph.nodes = [
        {
          id: 'node-1',
          type: 'task',
          position: { x: 100, y: 100 },
          data: {
            label: 'Fetch Story',
            taskRef: 'task-fetch-hn-story',
            description: 'Fetches story details',
            input: {
              storyId: '{{tasks.get-stories.output.data[0]}}',
            },
          },
        },
      ] as WorkflowBuilderNode[];

      render(<PropertiesPanel />);

      await waitFor(() => {
        const inputField = screen.getByTestId('input-field-storyId');
        expect(inputField).toHaveAttribute('data-is-template', 'true');
      });
    });

    it('should show validation error for empty required input', async () => {
      mockStoreState.graph.nodes = [
        {
          id: 'node-1',
          type: 'task',
          position: { x: 100, y: 100 },
          data: {
            label: 'Fetch Story',
            taskRef: 'task-fetch-hn-story',
            description: 'Fetches story details',
            input: {}, // Required storyId is missing
          },
        },
      ] as WorkflowBuilderNode[];

      render(<PropertiesPanel />);

      await waitFor(() => {
        expect(screen.getByText(/storyId is required/i)).toBeInTheDocument();
      });
    });
  });

  describe('Template Expression Suggestions', () => {
    beforeEach(() => {
      // Mock API response based on taskRef
      mockGetTaskDetail.mockImplementation((taskRef: string) => {
        if (taskRef === 'task-fetch-hn-story') {
          return Promise.resolve({
            name: 'task-fetch-hn-story',
            inputSchema: {
              type: 'object',
              properties: {
                storyId: { type: 'integer', description: 'Hacker News story ID' },
              },
              required: ['storyId'],
            },
            outputSchema: {
              type: 'object',
              properties: {
                by: { type: 'string' },
                title: { type: 'string' },
              },
            },
          });
        }
        if (taskRef === 'task-fetch-hn-top-stories') {
          return Promise.resolve({
            name: 'task-fetch-hn-top-stories',
            inputSchema: {
              type: 'object',
              properties: {},
            },
            outputSchema: {
              type: 'object',
              properties: {
                data: { type: 'array', items: { type: 'integer' } },
              },
            },
          });
        }
        return Promise.resolve({
          name: taskRef,
          inputSchema: { type: 'object', properties: {} },
          outputSchema: { type: 'object', properties: {} },
        });
      });

      // Setup with multiple tasks to enable template suggestions
      mockStoreState.graph.nodes = [
        {
          id: 'get-stories',
          type: 'task',
          position: { x: 100, y: 100 },
          data: {
            label: 'Get Stories',
            taskRef: 'task-fetch-hn-top-stories',
            description: 'Fetches top stories',
          },
        },
        {
          id: 'fetch-story',
          type: 'task',
          position: { x: 300, y: 100 },
          data: {
            label: 'Fetch Story',
            taskRef: 'task-fetch-hn-story',
            description: 'Fetches story details',
            input: {},
          },
        },
      ] as WorkflowBuilderNode[];
      mockStoreState.graph.edges = [
        {
          id: 'edge-1',
          source: 'get-stories',
          target: 'fetch-story',
          type: 'dependency',
        },
      ];
      mockStoreState.selection.nodeIds = ['fetch-story'];
    });

    it('should show template suggestions when typing {{', async () => {
      render(<PropertiesPanel />);

      await waitFor(() => {
        expect(screen.getByTestId('input-field-storyId')).toBeInTheDocument();
      });

      const inputField = screen.getByPlaceholderText(/enter value or template/i);
      // Use fireEvent to avoid userEvent escape sequence issues with {{
      fireEvent.change(inputField, { target: { value: '{{' } });

      await waitFor(() => {
        expect(screen.getByTestId('template-suggestions')).toBeInTheDocument();
      });
    });

    it('should show available upstream task outputs in suggestions', async () => {
      render(<PropertiesPanel />);

      await waitFor(() => {
        expect(screen.getByTestId('input-field-storyId')).toBeInTheDocument();
      });

      const inputField = screen.getByPlaceholderText(/enter value or template/i);
      fireEvent.change(inputField, { target: { value: '{{' } });

      await waitFor(() => {
        // Should show get-stories task outputs (upstream dependency)
        expect(screen.getByText(/tasks\.get-stories\.output/i)).toBeInTheDocument();
      });
    });

    it('should not show current task in suggestions', async () => {
      render(<PropertiesPanel />);

      await waitFor(() => {
        expect(screen.getByTestId('input-field-storyId')).toBeInTheDocument();
      });

      const inputField = screen.getByPlaceholderText(/enter value or template/i);
      fireEvent.change(inputField, { target: { value: '{{' } });

      await waitFor(() => {
        // Should NOT show fetch-story (current task)
        expect(screen.queryByText(/tasks\.fetch-story\.output/i)).not.toBeInTheDocument();
      });
    });

    it('should insert selected suggestion into input field', async () => {
      const user = userEvent.setup();
      render(<PropertiesPanel />);

      await waitFor(() => {
        expect(screen.getByTestId('input-field-storyId')).toBeInTheDocument();
      });

      const inputField = screen.getByPlaceholderText(/enter value or template/i);
      fireEvent.change(inputField, { target: { value: '{{' } });

      await waitFor(() => {
        expect(screen.getByTestId('template-suggestions')).toBeInTheDocument();
      });

      // Click on a suggestion
      const suggestion = screen.getByText(/tasks\.get-stories\.output\.data/i);
      await user.click(suggestion);

      expect(inputField).toHaveValue('{{tasks.get-stories.output.data}}');
    });

    it('should show workflow input variables in suggestions', async () => {
      // Add workflow input schema
      mockStoreState = {
        ...mockStoreState,
        inputSchema: {
          userId: { type: 'string', required: true },
        },
      } as any;

      render(<PropertiesPanel />);

      await waitFor(() => {
        expect(screen.getByTestId('input-field-storyId')).toBeInTheDocument();
      });

      const inputField = screen.getByPlaceholderText(/enter value or template/i);
      fireEvent.change(inputField, { target: { value: '{{' } });

      await waitFor(() => {
        expect(screen.getByText(/input\.userId/i)).toBeInTheDocument();
      });
    });

    it('should close suggestions when pressing Escape', async () => {
      render(<PropertiesPanel />);

      await waitFor(() => {
        expect(screen.getByTestId('input-field-storyId')).toBeInTheDocument();
      });

      const inputField = screen.getByPlaceholderText(/enter value or template/i);
      fireEvent.change(inputField, { target: { value: '{{' } });

      await waitFor(() => {
        expect(screen.getByTestId('template-suggestions')).toBeInTheDocument();
      });

      fireEvent.keyDown(inputField, { key: 'Escape' });

      await waitFor(() => {
        expect(screen.queryByTestId('template-suggestions')).not.toBeInTheDocument();
      });
    });
  });

  describe('Panel Selection (Real Canvas Behavior)', () => {
    it('should display task details when panel.selectedTaskId is set (canvas click)', () => {
      mockStoreState.graph.nodes = [
        {
          id: 'node-1',
          type: 'task',
          position: { x: 100, y: 100 },
          data: { label: 'Fetch User', taskRef: 'fetch-user', description: 'Fetches user data' },
        },
      ] as WorkflowBuilderNode[];
      // This is what the canvas actually does - sets panel.selectedTaskId, NOT selection.nodeIds
      mockStoreState.panel.selectedTaskId = 'node-1';
      mockStoreState.selection.nodeIds = []; // Empty, as it is in real app

      render(<PropertiesPanel />);

      // Should show task details, NOT "No Task Selected"
      expect(screen.getByDisplayValue('Fetch User')).toBeInTheDocument();
      expect(screen.queryByText(/no task selected/i)).not.toBeInTheDocument();
    });

    it('should show empty state when panel.selectedTaskId is null', () => {
      mockStoreState.graph.nodes = [
        {
          id: 'node-1',
          type: 'task',
          position: { x: 100, y: 100 },
          data: { label: 'Fetch User', taskRef: 'fetch-user', description: 'Fetches user data' },
        },
      ] as WorkflowBuilderNode[];
      mockStoreState.panel.selectedTaskId = null;
      mockStoreState.selection.nodeIds = [];

      render(<PropertiesPanel />);

      expect(screen.getByText(/no task selected/i)).toBeInTheDocument();
    });
  });
});
