/**
 * Unit tests for Workflow Builder Page
 *
 * Tests complete visual workflow builder with integrated components
 * Following TDD: RED phase - these tests should FAIL until implementation
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import WorkflowBuilderPage from './page';

// Hoist mock functions so they're available to vi.mock()
const mockConvertToYaml = vi.hoisted(() => vi.fn());
const mockConvertFromYaml = vi.hoisted(() => vi.fn());
const mockSetGraph = vi.hoisted(() => vi.fn());
const mockClearGraph = vi.hoisted(() => vi.fn());
const mockPush = vi.hoisted(() => vi.fn());
const mockBack = vi.hoisted(() => vi.fn());
const mockUseTemplateDetail = vi.hoisted(() => vi.fn());

// Mock TaskPalette
vi.mock('@/components/builder/task-palette', () => ({
  TaskPalette: () => (
    <div data-testid="task-palette">
      <h2>Tasks</h2>
    </div>
  ),
}));

// Mock WorkflowCanvas
vi.mock('@/components/builder/workflow-canvas', () => ({
  WorkflowCanvas: () => (
    <div data-testid="workflow-canvas">
      <div>Canvas Area</div>
    </div>
  ),
}));

// Mock PropertiesPanel
vi.mock('@/components/builder/properties-panel', () => ({
  PropertiesPanel: () => (
    <div data-testid="properties-panel">
      <h2>Properties</h2>
    </div>
  ),
}));

// Mock YAML adapter
vi.mock('@/lib/adapters/yaml-adapter', () => ({
  graphToYaml: mockConvertToYaml,
  yamlToGraph: mockConvertFromYaml,
}));

// Mock graph state
let mockGraphState = {
  nodes: [] as any[],
  edges: [] as any[],
  parallelGroups: [],
};

// Mock Zustand store
vi.mock('@/lib/stores/workflow-builder-store', () => ({
  useWorkflowBuilderStore: (selector: any) => {
    const store = {
      graph: mockGraphState,
      metadata: { name: '', namespace: 'default', description: '' },
      inputSchema: {},
      outputMapping: {},
      selection: { nodeIds: [], edgeIds: [] },
      validation: { isValid: true, errors: [], warnings: [] },
      history: { past: [], future: [], currentCheckpoint: null },
      autosave: { isDirty: false, lastSaved: null, isAutosaving: false },
      setGraph: mockSetGraph,
      clearGraph: mockClearGraph,
      setMetadata: vi.fn(),
      reset: vi.fn(),
      importFromYaml: vi.fn(),
    };
    return selector ? selector(store) : store;
  },
}));

// Mock router
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    back: mockBack,
  }),
  useSearchParams: () => ({
    get: vi.fn().mockReturnValue(null),
  }),
}));

// Mock API queries
vi.mock('@/lib/api/queries', () => ({
  useTemplateDetail: mockUseTemplateDetail,
}));

describe('WorkflowBuilderPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockConvertToYaml.mockReturnValue('# Workflow YAML');
    mockConvertFromYaml.mockReturnValue({
      graph: {
        nodes: [],
        edges: [],
        parallelGroups: [],
      },
      metadata: { name: 'test-workflow', namespace: 'default', description: '' },
      inputSchema: {},
      outputMapping: {},
      selection: { nodeIds: [], edgeIds: [] },
      validation: { isValid: true, errors: [], warnings: [] },
      history: { past: [], future: [], currentCheckpoint: null },
      autosave: { isDirty: false, lastSaved: null, isAutosaving: false },
    });
    // Mock template detail hook
    mockUseTemplateDetail.mockReturnValue({
      data: null,
      isLoading: false,
      error: null,
    });
    // Reset graph state
    mockGraphState = {
      nodes: [],
      edges: [],
      parallelGroups: [],
    };
  });

  describe('Page Layout', () => {
    it('should render workflow builder page', () => {
      render(<WorkflowBuilderPage />);
      expect(screen.getByTestId('workflow-builder-page')).toBeInTheDocument();
    });

    it('should render page header with title', () => {
      render(<WorkflowBuilderPage />);
      expect(screen.getByRole('heading', { name: /create.*workflow/i })).toBeInTheDocument();
    });

    it('should render all three main components', () => {
      render(<WorkflowBuilderPage />);

      expect(screen.getByTestId('task-palette')).toBeInTheDocument();
      expect(screen.getByTestId('workflow-canvas')).toBeInTheDocument();
      expect(screen.getByTestId('properties-panel')).toBeInTheDocument();
    });

    it('should render toolbar with actions', () => {
      render(<WorkflowBuilderPage />);

      expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /load/i })).toBeInTheDocument();
    });
  });

  describe('Workflow Naming', () => {
    it('should render workflow name input', () => {
      render(<WorkflowBuilderPage />);

      const nameInput = screen.getByLabelText(/workflow name/i);
      expect(nameInput).toBeInTheDocument();
      expect(nameInput).toHaveAttribute('type', 'text');
    });

    it('should update workflow name on change', async () => {
      const user = userEvent.setup();
      render(<WorkflowBuilderPage />);

      const nameInput = screen.getByLabelText(/workflow name/i);
      await user.type(nameInput, 'user-onboarding');

      expect(nameInput).toHaveValue('user-onboarding');
    });

    it('should validate workflow name format', async () => {
      const user = userEvent.setup();
      render(<WorkflowBuilderPage />);

      const nameInput = screen.getByLabelText(/workflow name/i);
      await user.type(nameInput, 'User Onboarding');
      fireEvent.blur(nameInput);

      expect(screen.getByText(/must be lowercase/i)).toBeInTheDocument();
    });
  });

  describe('Save Workflow', () => {
    it('should disable save button when workflow is empty', () => {
      render(<WorkflowBuilderPage />);

      const saveButton = screen.getByRole('button', { name: /save/i });
      expect(saveButton).toBeDisabled();
    });

    it('should convert graph to YAML when save clicked', async () => {
      const user = userEvent.setup();

      mockGraphState.nodes = [
        {
          id: 'node-1',
          type: 'task',
          position: { x: 0, y: 0 },
          data: { taskRef: 'fetch-user', label: 'Fetch User' },
        },
      ];

      const mockFileHandle = {
        createWritable: vi.fn().mockResolvedValue({
          write: vi.fn(),
          close: vi.fn(),
        }),
      };

      // Properly mock showSaveFilePicker on window object
      Object.defineProperty(window, 'showSaveFilePicker', {
        value: vi.fn().mockResolvedValue(mockFileHandle),
        writable: true,
        configurable: true,
        enumerable: true,
      });

      render(<WorkflowBuilderPage />);

      const nameInput = screen.getByLabelText(/workflow name/i);
      await user.type(nameInput, 'test-workflow');

      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);

      expect(mockConvertToYaml).toHaveBeenCalled();
    });
  });

  describe('Cancel Action', () => {
    it('should navigate back when cancel clicked', async () => {
      const user = userEvent.setup();
      render(<WorkflowBuilderPage />);

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      expect(mockBack).toHaveBeenCalled();
    });

    it('should show confirmation dialog if workflow has unsaved changes', async () => {
      const user = userEvent.setup();

      mockGraphState.nodes = [
        { id: 'node-1', type: 'task', position: { x: 0, y: 0 }, data: { taskRef: 'fetch-user' } },
      ];

      render(<WorkflowBuilderPage />);

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /unsaved changes/i })).toBeInTheDocument();
      });
    });
  });

  describe('Keyboard Shortcuts', () => {
    it('should save on Cmd+S', async () => {
      mockGraphState.nodes = [
        { id: 'node-1', type: 'task', position: { x: 0, y: 0 }, data: { taskRef: 'fetch-user' } },
      ];

      const mockFileHandle = {
        createWritable: vi.fn().mockResolvedValue({
          write: vi.fn(),
          close: vi.fn(),
        }),
      };

      // Properly mock showSaveFilePicker on window object
      Object.defineProperty(window, 'showSaveFilePicker', {
        value: vi.fn().mockResolvedValue(mockFileHandle),
        writable: true,
        configurable: true,
        enumerable: true,
      });

      render(<WorkflowBuilderPage />);

      const nameInput = screen.getByLabelText(/workflow name/i);
      fireEvent.change(nameInput, { target: { value: 'test-workflow' } });

      fireEvent.keyDown(document, { key: 's', metaKey: true });

      await waitFor(() => {
        expect(mockConvertToYaml).toHaveBeenCalled();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have accessible page title', () => {
      render(<WorkflowBuilderPage />);

      const heading = screen.getByRole('heading', { name: /create.*workflow/i });
      expect(heading.tagName).toBe('H1');
    });

    it('should have keyboard-accessible toolbar', () => {
      // Add a node so save button is enabled
      mockGraphState.nodes = [
        { id: 'node-1', type: 'task', position: { x: 0, y: 0 }, data: { taskRef: 'fetch-user' } },
      ];

      render(<WorkflowBuilderPage />);

      // Set workflow name so save is enabled
      const nameInput = screen.getByLabelText(/workflow name/i);
      fireEvent.change(nameInput, { target: { value: 'test-workflow' } });

      const saveButton = screen.getByRole('button', { name: /save/i });
      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      const loadButton = screen.getByRole('button', { name: /load/i });

      // Buttons should be keyboard accessible
      cancelButton.focus();
      expect(cancelButton).toHaveFocus();

      loadButton.focus();
      expect(loadButton).toHaveFocus();

      saveButton.focus();
      expect(saveButton).toHaveFocus();
    });
  });
});
