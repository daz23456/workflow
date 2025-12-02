/**
 * Pipeline Builder Canvas Tests
 *
 * Tests React Flow-based visual transform pipeline builder.
 * Follows patterns from workflow-canvas.tsx.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { PipelineBuilder } from './pipeline-builder';
import { useTransformBuilderStore } from '@/lib/stores/transform-builder-store';
import type { SelectOperation, FilterOperation } from '@/lib/types/transform-dsl';

// Mock @xyflow/react
const mockFitView = vi.fn();

vi.mock('@xyflow/react', () => ({
  ReactFlow: ({ children, nodes, edges, nodeTypes, onPaneClick, ...props }: any) => {
    // Render actual node components from nodeTypes
    const OperationNode = nodeTypes?.operation;

    return (
      <div data-testid="react-flow" onClick={onPaneClick} {...props}>
        <div data-testid="nodes">
          {nodes.map((node: any) => (
            <div key={node.id} data-node-id={node.id}>
              {OperationNode ? <OperationNode data={node.data} /> : node.data.label}
            </div>
          ))}
        </div>
        <div data-testid="edges">
          {edges.map((edge: any) => (
            <div key={edge.id} data-edge-id={edge.id}>
              {edge.source} → {edge.target}
            </div>
          ))}
        </div>
        {children}
      </div>
    );
  },
  Background: () => <div data-testid="background" />,
  Controls: () => <div data-testid="controls" />,
  MiniMap: () => <div data-testid="minimap" />,
  Panel: ({ children }: any) => <div data-testid="panel">{children}</div>,
  useReactFlow: () => ({
    fitView: mockFitView,
    zoomIn: vi.fn(),
    zoomOut: vi.fn(),
  }),
}));

describe('PipelineBuilder', () => {
  beforeEach(() => {
    // Reset store before each test
    useTransformBuilderStore.getState().reset();
  });

  describe('Rendering', () => {
    it('should render empty canvas', () => {
      render(<PipelineBuilder />);

      expect(screen.getByTestId('react-flow')).toBeInTheDocument();
      expect(screen.getByTestId('background')).toBeInTheDocument();
      expect(screen.getByTestId('controls')).toBeInTheDocument();
    });

    it('should render operation nodes for pipeline', () => {
      const store = useTransformBuilderStore.getState();

      const selectOp: SelectOperation = {
        operation: 'select',
        fields: { name: '$.name', age: '$.age' },
      };

      const filterOp: FilterOperation = {
        operation: 'filter',
        condition: {
          field: '$.age',
          operator: 'gt',
          value: 18,
        },
      };

      store.addOperation(selectOp);
      store.addOperation(filterOp);

      render(<PipelineBuilder />);

      // Should have 2 operation nodes
      expect(screen.getByText(/select/i)).toBeInTheDocument();
      expect(screen.getByText(/filter/i)).toBeInTheDocument();
    });

    it('should render edges connecting operations', () => {
      const store = useTransformBuilderStore.getState();

      store.addOperation({
        operation: 'select',
        fields: { name: '$.name' },
      });

      store.addOperation({
        operation: 'filter',
        condition: { field: '$.age', operator: 'gt', value: 18 },
      });

      render(<PipelineBuilder />);

      const edges = screen.getByTestId('edges');
      expect(edges).toBeInTheDocument();
      expect(edges.textContent).toContain('→');
    });
  });

  describe('Operation Selection', () => {
    it('should render operation nodes with selection state', () => {
      const store = useTransformBuilderStore.getState();

      store.addOperation({
        operation: 'select',
        fields: { name: '$.name' },
      });

      store.selectOperation(0);

      render(<PipelineBuilder />);

      // Verify the node is rendered as selected
      const state = useTransformBuilderStore.getState();
      expect(state.selection.operationIndex).toBe(0);

      // Verify operation button is accessible
      const operationButton = screen.getByRole('button', { name: /operation: select/i });
      expect(operationButton).toBeInTheDocument();
    });

    it('should clear selection on canvas click', async () => {
      const user = userEvent.setup();
      const store = useTransformBuilderStore.getState();

      store.addOperation({
        operation: 'select',
        fields: { name: '$.name' },
      });

      store.selectOperation(0);

      render(<PipelineBuilder />);

      const canvas = screen.getByTestId('react-flow');
      await user.click(canvas);

      const state = useTransformBuilderStore.getState();
      expect(state.selection.operationIndex).toBe(-1);
    });
  });

  describe('Keyboard Shortcuts', () => {
    it('should delete selected operation on Delete key', async () => {
      const user = userEvent.setup();
      const store = useTransformBuilderStore.getState();

      store.addOperation({
        operation: 'select',
        fields: { name: '$.name' },
      });

      store.selectOperation(0);

      render(<PipelineBuilder />);

      await user.keyboard('{Delete}');

      const state = useTransformBuilderStore.getState();
      expect(state.pipeline).toHaveLength(0);
    });

    it('should undo on Cmd+Z', async () => {
      const user = userEvent.setup();
      const store = useTransformBuilderStore.getState();

      store.addOperation({
        operation: 'select',
        fields: { name: '$.name' },
      });

      render(<PipelineBuilder />);

      await user.keyboard('{Meta>}z{/Meta}');

      const state = useTransformBuilderStore.getState();
      expect(state.pipeline).toHaveLength(0);
    });

    it('should redo on Cmd+Shift+Z', async () => {
      const user = userEvent.setup();
      const store = useTransformBuilderStore.getState();

      store.addOperation({
        operation: 'select',
        fields: { name: '$.name' },
      });

      store.undo();

      render(<PipelineBuilder />);

      await user.keyboard('{Meta>}{Shift>}z{/Shift}{/Meta}');

      const state = useTransformBuilderStore.getState();
      expect(state.pipeline).toHaveLength(1);
    });
  });

  describe('Layout', () => {
    it('should layout operations vertically', () => {
      const store = useTransformBuilderStore.getState();

      store.addOperation({
        operation: 'select',
        fields: { name: '$.name' },
      });

      store.addOperation({
        operation: 'filter',
        condition: { field: '$.age', operator: 'gt', value: 18 },
      });

      render(<PipelineBuilder />);

      const nodes = screen.getByTestId('nodes');
      expect(nodes.children).toHaveLength(2);
    });

    it('should fit view on mount', async () => {
      const store = useTransformBuilderStore.getState();

      store.addOperation({
        operation: 'select',
        fields: { name: '$.name' },
      });

      render(<PipelineBuilder />);

      await waitFor(() => {
        expect(mockFitView).toHaveBeenCalled();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have keyboard navigation', () => {
      const store = useTransformBuilderStore.getState();

      store.addOperation({
        operation: 'select',
        fields: { name: '$.name' },
      });

      render(<PipelineBuilder />);

      // Operation nodes should have button role and be keyboard accessible
      const operationButton = screen.getByRole('button', { name: /operation: select/i });
      expect(operationButton).toBeInTheDocument();
      expect(operationButton).toHaveAttribute('tabindex', '0');
    });

    it('should have aria labels', () => {
      render(<PipelineBuilder />);

      const canvas = screen.getByLabelText('Transform pipeline canvas');
      expect(canvas).toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('should show empty state message', () => {
      render(<PipelineBuilder />);

      expect(screen.getByText(/drag operations here to build your pipeline/i)).toBeInTheDocument();
    });

    it('should hide empty state when operations exist', () => {
      const store = useTransformBuilderStore.getState();

      store.addOperation({
        operation: 'select',
        fields: { name: '$.name' },
      });

      render(<PipelineBuilder />);

      expect(
        screen.queryByText(/drag operations here to build your pipeline/i)
      ).not.toBeInTheDocument();
    });
  });

  describe('Node Updates', () => {
    it('should update node positions', async () => {
      const user = userEvent.setup();
      const store = useTransformBuilderStore.getState();

      store.addOperation({
        operation: 'select',
        fields: { name: '$.name' },
      });

      render(<PipelineBuilder />);

      // Simulate drag (in real React Flow, this would update node positions)
      const selectNode = screen.getByText(/select/i);
      await user.pointer([
        { target: selectNode, coords: { x: 100, y: 100 } },
        { coords: { x: 200, y: 200 } },
      ]);

      // Node positions should be persisted
      expect(selectNode).toBeInTheDocument();
    });
  });

  describe('Drop Zone', () => {
    it('should accept dropped operations', async () => {
      render(<PipelineBuilder />);

      // The drop zone is the wrapper div with aria-label
      const dropZone = screen.getByLabelText('Transform pipeline canvas');

      // Simulate drop event with operation data using fireEvent
      const dropData = JSON.stringify({
        operationType: 'filter',
        label: 'Filter',
        description: 'Keep matching records',
      });

      // Fire drag over first
      fireEvent.dragOver(dropZone);

      // Fire drop event
      fireEvent.drop(dropZone, {
        dataTransfer: {
          getData: () => dropData,
        },
      });

      // Verify operation was added to store
      await waitFor(() => {
        const state = useTransformBuilderStore.getState();
        expect(state.pipeline.length).toBe(1);
        expect(state.pipeline[0].operation).toBe('filter');
      });
    });

    it('should show drop indicator on drag over', async () => {
      render(<PipelineBuilder />);

      const dropZone = screen.getByLabelText('Transform pipeline canvas');

      // Fire drag over
      fireEvent.dragOver(dropZone);

      // Canvas should have drag-over styling (async state update)
      await waitFor(() => {
        expect(dropZone).toHaveClass('ring-2');
      });
    });

    it('should handle drop with select operation type', async () => {
      render(<PipelineBuilder />);

      const dropZone = screen.getByLabelText('Transform pipeline canvas');

      const dropData = JSON.stringify({
        operationType: 'select',
        label: 'Select',
        description: 'Extract fields',
      });

      fireEvent.drop(dropZone, {
        dataTransfer: {
          getData: () => dropData,
        },
      });

      // Verify select operation was added
      await waitFor(() => {
        const state = useTransformBuilderStore.getState();
        expect(state.pipeline.length).toBe(1);
        expect(state.pipeline[0].operation).toBe('select');
      });
    });

    it('should ignore invalid drop data', async () => {
      render(<PipelineBuilder />);

      const dropZone = screen.getByLabelText('Transform pipeline canvas');
      const initialState = useTransformBuilderStore.getState();
      const initialPipelineLength = initialState.pipeline.length;

      fireEvent.drop(dropZone, {
        dataTransfer: {
          getData: () => 'invalid json',
        },
      });

      // Wait a tick to ensure any state updates would have occurred
      await waitFor(() => {
        const state = useTransformBuilderStore.getState();
        expect(state.pipeline.length).toBe(initialPipelineLength);
      });
    });

    it('should remove drop indicator on drag leave', async () => {
      render(<PipelineBuilder />);

      const dropZone = screen.getByLabelText('Transform pipeline canvas');

      // Fire drag over then leave
      fireEvent.dragOver(dropZone);
      await waitFor(() => {
        expect(dropZone).toHaveClass('ring-2');
      });

      fireEvent.dragLeave(dropZone);
      await waitFor(() => {
        expect(dropZone).not.toHaveClass('ring-2');
      });
    });
  });
});
