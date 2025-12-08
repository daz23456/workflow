/**
 * Transform Builder Page Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import TransformsPage from './page';
import { useTransformBuilderStore } from '@/lib/stores/transform-builder-store';

// Mock @xyflow/react
const mockFitView = vi.fn();

vi.mock('@xyflow/react', () => ({
  ReactFlow: ({ children, nodes, _edges, nodeTypes, onPaneClick, ...props }: any) => {
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
        {children}
      </div>
    );
  },
  ReactFlowProvider: ({ children }: any) => <div>{children}</div>,
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

describe('TransformsPage', () => {
  beforeEach(() => {
    useTransformBuilderStore.getState().reset();
  });

  it('should render all main sections when data is loaded', () => {
    const store = useTransformBuilderStore.getState();
    store.setInputData([{ x: 1 }]);

    render(<TransformsPage />);

    // After data upload, shows 4-column builder layout with section headers
    expect(screen.getByRole('heading', { name: /^operations$/i, level: 2 })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /^pipeline$/i, level: 2 })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /^configure$/i, level: 2 })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /^preview$/i, level: 2 })).toBeInTheDocument();
  });

  it('should show upload section initially', () => {
    render(<TransformsPage />);
    expect(screen.getByText(/upload sample json/i)).toBeInTheDocument();
  });

  it('should allow uploading JSON data', async () => {
    const user = userEvent.setup();
    render(<TransformsPage />);

    const file = new File(['[{"name": "Alice", "age": 30}]'], 'data.json', {
      type: 'application/json',
    });

    const input = screen.getByLabelText(/upload json/i);
    await user.upload(input, file);

    await waitFor(() => {
      expect(screen.getByText(/input \(1 record/i)).toBeInTheDocument();
    });
  });

  it('should show pipeline builder after upload', async () => {
    const user = userEvent.setup();
    render(<TransformsPage />);

    const file = new File(['[{"x": 1}]'], 'data.json', { type: 'application/json' });
    const input = screen.getByLabelText(/upload json/i);
    await user.upload(input, file);

    await waitFor(() => {
      expect(screen.getByTestId('react-flow')).toBeInTheDocument();
    });
  });

  it('should show export button when pipeline has operations', async () => {
    const store = useTransformBuilderStore.getState();
    store.setInputData([{ x: 1 }]);
    store.addOperation({ operation: 'limit', count: 10 });

    render(<TransformsPage />);

    expect(screen.getByRole('button', { name: /export yaml/i })).toBeInTheDocument();
  });

  it('should export YAML when button clicked', async () => {
    const user = userEvent.setup();
    const store = useTransformBuilderStore.getState();
    store.setInputData([{ x: 1 }]);
    store.addOperation({ operation: 'limit', count: 5 });

    render(<TransformsPage />);

    const exportButton = screen.getByRole('button', { name: /export yaml/i });
    await user.click(exportButton);

    // Should show YAML in a dialog or download it
    await waitFor(() => {
      expect(screen.getByText(/apiVersion/i)).toBeInTheDocument();
    });
  });

  it('should show preview panel with results', async () => {
    const store = useTransformBuilderStore.getState();
    store.setInputData([{ name: 'Bob', age: 25 }]);
    store.addOperation({ operation: 'select', fields: { name: '$.name' } });

    render(<TransformsPage />);

    // Preview should show transformed data
    await waitFor(() => {
      expect(screen.getByText(/"name"/i)).toBeInTheDocument();
    });
  });

  it('should allow adding operations from store', async () => {
    const store = useTransformBuilderStore.getState();
    store.setInputData([{ x: 1 }]);
    store.addOperation({ operation: 'limit', count: 10 });

    render(<TransformsPage />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /operation: limit/i })).toBeInTheDocument();
    });
  });

  it('should handle reset workflow', async () => {
    const user = userEvent.setup();
    const store = useTransformBuilderStore.getState();
    store.setInputData([{ x: 1 }]);
    store.addOperation({ operation: 'limit', count: 10 });

    // Mock confirm to return true
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

    render(<TransformsPage />);

    const resetButton = screen.getByRole('button', { name: /reset/i });
    await user.click(resetButton);

    await waitFor(() => {
      const state = useTransformBuilderStore.getState();
      expect(state.pipeline).toHaveLength(0);
    });

    confirmSpy.mockRestore();
  });

  it('should show error for invalid JSON upload', async () => {
    const user = userEvent.setup();
    render(<TransformsPage />);

    const file = new File(['invalid json{'], 'bad.json', { type: 'application/json' });
    const input = screen.getByLabelText(/upload json/i);
    await user.upload(input, file);

    await waitFor(() => {
      expect(screen.getByText(/invalid json/i)).toBeInTheDocument();
    });
  });

  it('should have accessible keyboard navigation', () => {
    render(<TransformsPage />);

    // Check for proper headings hierarchy
    const mainHeading = screen.getByRole('heading', { name: /data transform assistant/i });
    expect(mainHeading).toBeInTheDocument();

    // Check for landmark regions
    expect(screen.getByRole('main')).toBeInTheDocument();
  });
});
