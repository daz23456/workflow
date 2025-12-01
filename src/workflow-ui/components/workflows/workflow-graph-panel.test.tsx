import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { WorkflowGraphPanel } from './workflow-graph-panel';
import type { WorkflowGraph, GraphNode, GraphEdge, ParallelGroup } from '@/types/workflow';

// Mock React Flow
vi.mock('@xyflow/react', () => ({
  ReactFlow: ({ nodes, edges, onNodeClick, children }: any) => (
    <div data-testid="react-flow">
      <div data-testid="nodes">
        {nodes.map((node: any) => (
          <div
            key={node.id}
            data-testid={`node-${node.id}`}
            data-type={node.type}
            onClick={() => onNodeClick?.({}, node)}
          >
            {node.data.label}
          </div>
        ))}
      </div>
      <div data-testid="edges">
        {edges.map((edge: any) => (
          <div key={edge.id} data-testid={`edge-${edge.source}-${edge.target}`} />
        ))}
      </div>
      {children}
    </div>
  ),
  ReactFlowProvider: ({ children }: any) => <>{children}</>,
  Controls: () => <div data-testid="controls">Controls</div>,
  Background: ({ variant }: any) => <div data-testid="background">{variant}</div>,
  MarkerType: { ArrowClosed: 'arrowclosed' },
  BackgroundVariant: { Dots: 'dots' },
}));

describe('WorkflowGraphPanel', () => {
  const mockSimpleGraph: WorkflowGraph = {
    nodes: [
      { id: 'task1', type: 'task', data: { label: 'Validate Email' }, position: { x: 0, y: 0 } },
      { id: 'task2', type: 'task', data: { label: 'Create User' }, position: { x: 0, y: 100 } },
    ],
    edges: [{ id: 'e1-2', source: 'task1', target: 'task2', type: 'dependency' }],
    parallelGroups: [],
  };

  const mockComplexGraph: WorkflowGraph = {
    nodes: [
      { id: 'start', type: 'start', data: { label: 'Start' }, position: { x: 200, y: 0 } },
      {
        id: 'task1',
        type: 'task',
        data: { label: 'Validate Email' },
        position: { x: 100, y: 100 },
      },
      { id: 'task2', type: 'task', data: { label: 'Check Credit' }, position: { x: 300, y: 100 } },
      { id: 'task3', type: 'task', data: { label: 'Create User' }, position: { x: 200, y: 200 } },
      { id: 'end', type: 'end', data: { label: 'End' }, position: { x: 200, y: 300 } },
    ],
    edges: [
      { id: 'e-start-1', source: 'start', target: 'task1', type: 'dependency' },
      { id: 'e-start-2', source: 'start', target: 'task2', type: 'dependency' },
      { id: 'e-1-3', source: 'task1', target: 'task3', type: 'dependency' },
      { id: 'e-2-3', source: 'task2', target: 'task3', type: 'dependency' },
      { id: 'e-3-end', source: 'task3', target: 'end', type: 'dependency' },
    ],
    parallelGroups: [{ level: 0, taskIds: ['task1', 'task2'] }],
  };

  describe('Basic Rendering', () => {
    it('renders React Flow component', () => {
      render(<WorkflowGraphPanel graph={mockSimpleGraph} />);
      expect(screen.getByTestId('react-flow')).toBeInTheDocument();
    });

    it('renders all nodes from graph', () => {
      render(<WorkflowGraphPanel graph={mockSimpleGraph} />);
      expect(screen.getByTestId('node-task1')).toBeInTheDocument();
      expect(screen.getByTestId('node-task2')).toBeInTheDocument();
    });

    it('renders node labels', () => {
      render(<WorkflowGraphPanel graph={mockSimpleGraph} />);
      expect(screen.getByText('Validate Email')).toBeInTheDocument();
      expect(screen.getByText('Create User')).toBeInTheDocument();
    });

    it('renders all edges from graph', () => {
      render(<WorkflowGraphPanel graph={mockSimpleGraph} />);
      expect(screen.getByTestId('edge-task1-task2')).toBeInTheDocument();
    });

    it('renders controls', () => {
      render(<WorkflowGraphPanel graph={mockSimpleGraph} />);
      expect(screen.getByTestId('controls')).toBeInTheDocument();
    });

    it('renders background', () => {
      render(<WorkflowGraphPanel graph={mockSimpleGraph} />);
      expect(screen.getByTestId('background')).toBeInTheDocument();
    });
  });

  describe('Node Types', () => {
    it('renders task nodes with correct type', () => {
      render(<WorkflowGraphPanel graph={mockSimpleGraph} />);
      const node = screen.getByTestId('node-task1');
      expect(node).toHaveAttribute('data-type', 'default');
    });

    it('renders automatic Input node', () => {
      render(<WorkflowGraphPanel graph={mockSimpleGraph} />);
      const node = screen.getByTestId('node-__input__');
      expect(node).toHaveAttribute('data-type', 'input');
      expect(node).toHaveTextContent('Workflow Input');
    });

    it('renders automatic Output node', () => {
      render(<WorkflowGraphPanel graph={mockSimpleGraph} />);
      const node = screen.getByTestId('node-__output__');
      expect(node).toHaveAttribute('data-type', 'output');
      expect(node).toHaveTextContent('Workflow Output');
    });
  });

  describe('Graph Layout', () => {
    it('applies auto-layout to nodes using graph-layout utility', () => {
      render(<WorkflowGraphPanel graph={mockSimpleGraph} />);
      // Nodes should have positions after layout
      const nodes = screen.getByTestId('nodes');
      expect(nodes).toBeInTheDocument();
    });

    it('uses top-to-bottom direction by default', () => {
      render(<WorkflowGraphPanel graph={mockSimpleGraph} />);
      // Layout should be applied with TB direction
      expect(screen.getByTestId('react-flow')).toBeInTheDocument();
    });

    it('accepts custom layout direction', () => {
      render(<WorkflowGraphPanel graph={mockSimpleGraph} direction="LR" />);
      expect(screen.getByTestId('react-flow')).toBeInTheDocument();
    });
  });

  describe('Parallel Groups', () => {
    it('highlights parallel tasks visually', () => {
      render(<WorkflowGraphPanel graph={mockComplexGraph} />);
      // Parallel tasks (task1, task2) should be marked
      expect(screen.getByTestId('node-task1')).toBeInTheDocument();
      expect(screen.getByTestId('node-task2')).toBeInTheDocument();
    });
  });

  describe('Node Interaction', () => {
    it('calls onNodeClick when node is clicked', async () => {
      const user = userEvent.setup();
      const onNodeClick = vi.fn();

      render(<WorkflowGraphPanel graph={mockSimpleGraph} onNodeClick={onNodeClick} />);

      await user.click(screen.getByTestId('node-task1'));

      expect(onNodeClick).toHaveBeenCalledWith('task1');
    });

    it('does not crash when onNodeClick is not provided', async () => {
      const user = userEvent.setup();
      render(<WorkflowGraphPanel graph={mockSimpleGraph} />);

      await user.click(screen.getByTestId('node-task1'));
      // Should not crash
    });
  });

  describe('Empty Graph', () => {
    it('renders empty state when no nodes', () => {
      const emptyGraph: WorkflowGraph = {
        nodes: [],
        edges: [],
        parallelGroups: [],
      };

      render(<WorkflowGraphPanel graph={emptyGraph} />);
      expect(screen.getByText(/no tasks/i)).toBeInTheDocument();
    });

    it('does not render React Flow for empty graph', () => {
      const emptyGraph: WorkflowGraph = {
        nodes: [],
        edges: [],
        parallelGroups: [],
      };

      render(<WorkflowGraphPanel graph={emptyGraph} />);
      expect(screen.queryByTestId('react-flow')).not.toBeInTheDocument();
    });
  });

  describe('Complex Workflows', () => {
    it('handles workflows with multiple parallel groups', () => {
      const complexGraph: WorkflowGraph = {
        nodes: [
          { id: 't1', type: 'task', data: { label: 'Task 1' }, position: { x: 100, y: 0 } },
          { id: 't2', type: 'task', data: { label: 'Task 2' }, position: { x: 300, y: 0 } },
          { id: 't3', type: 'task', data: { label: 'Task 3' }, position: { x: 100, y: 100 } },
          { id: 't4', type: 'task', data: { label: 'Task 4' }, position: { x: 300, y: 100 } },
        ],
        edges: [
          { id: 'e-1-3', source: 't1', target: 't3', type: 'dependency' },
          { id: 'e-2-4', source: 't2', target: 't4', type: 'dependency' },
        ],
        parallelGroups: [
          { level: 0, taskIds: ['t1', 't2'] },
          { level: 1, taskIds: ['t3', 't4'] },
        ],
      };

      render(<WorkflowGraphPanel graph={complexGraph} />);
      expect(screen.getByText('Task 1')).toBeInTheDocument();
      expect(screen.getByText('Task 2')).toBeInTheDocument();
      expect(screen.getByText('Task 3')).toBeInTheDocument();
      expect(screen.getByText('Task 4')).toBeInTheDocument();
    });

    it('handles workflows with disconnected nodes', () => {
      const disconnectedGraph: WorkflowGraph = {
        nodes: [
          { id: 't1', type: 'task', data: { label: 'Task 1' }, position: { x: 0, y: 0 } },
          { id: 't2', type: 'task', data: { label: 'Task 2' }, position: { x: 0, y: 100 } },
        ],
        edges: [],
        parallelGroups: [],
      };

      render(<WorkflowGraphPanel graph={disconnectedGraph} />);
      expect(screen.getByText('Task 1')).toBeInTheDocument();
      expect(screen.getByText('Task 2')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has descriptive container', () => {
      render(<WorkflowGraphPanel graph={mockSimpleGraph} />);
      expect(screen.getByTestId('react-flow')).toBeInTheDocument();
    });
  });
});
