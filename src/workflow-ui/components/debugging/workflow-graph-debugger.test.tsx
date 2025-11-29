import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { WorkflowGraphDebugger } from './workflow-graph-debugger';

describe('WorkflowGraphDebugger', () => {
  const mockGraphData = {
    nodes: [
      { id: 'task1', label: 'fetch-user', type: 'task' },
      { id: 'task2', label: 'send-email', type: 'task' },
      { id: 'task3', label: 'log-event', type: 'task' },
    ],
    edges: [
      { id: 'edge1', source: 'task1', target: 'task2' },
      { id: 'edge2', source: 'task2', target: 'task3' },
    ],
  };

  const mockExecutionState = {
    completedTasks: ['task1'],
    runningTasks: ['task2'],
    failedTasks: [],
    pendingTasks: ['task3'],
    taskData: {
      task1: {
        output: { id: '123', name: 'John Doe' },
      },
      task2: {
        input: { to: 'john@example.com' },
      },
    },
  };

  it('should render workflow graph container', () => {
    render(<WorkflowGraphDebugger graphData={mockGraphData} />);

    const graph = screen.getByRole('region', { name: /workflow graph/i });
    expect(graph).toBeInTheDocument();
  });

  it('should display all nodes', () => {
    render(<WorkflowGraphDebugger graphData={mockGraphData} />);

    expect(screen.getByText('fetch-user')).toBeInTheDocument();
    expect(screen.getByText('send-email')).toBeInTheDocument();
    expect(screen.getByText('log-event')).toBeInTheDocument();
  });

  it('should highlight completed tasks', () => {
    const { container } = render(
      <WorkflowGraphDebugger graphData={mockGraphData} executionState={mockExecutionState} />
    );

    const completedNode = container.querySelector('[data-node-id="task1"]');
    expect(completedNode).toHaveAttribute('data-status', 'completed');
  });

  it('should highlight running tasks', () => {
    const { container } = render(
      <WorkflowGraphDebugger graphData={mockGraphData} executionState={mockExecutionState} />
    );

    const runningNode = container.querySelector('[data-node-id="task2"]');
    expect(runningNode).toHaveAttribute('data-status', 'running');
  });

  it('should highlight failed tasks', () => {
    const failedState = {
      ...mockExecutionState,
      runningTasks: [],
      failedTasks: ['task2'],
    };

    const { container } = render(
      <WorkflowGraphDebugger graphData={mockGraphData} executionState={failedState} />
    );

    const failedNode = container.querySelector('[data-node-id="task2"]');
    expect(failedNode).toHaveAttribute('data-status', 'failed');
  });

  it('should show data flow on edges', async () => {
    const user = userEvent.setup();
    render(
      <WorkflowGraphDebugger
        graphData={mockGraphData}
        executionState={mockExecutionState}
        showDataFlow
      />
    );

    const edge = screen.getByTestId('edge1');
    await user.hover(edge);

    // Should show data flow labels on edges
    const dataFlowLabels = screen.getAllByText(/data flow/i);
    expect(dataFlowLabels.length).toBeGreaterThan(0);
  });

  it('should display task details on node click', async () => {
    const user = userEvent.setup();
    render(<WorkflowGraphDebugger graphData={mockGraphData} executionState={mockExecutionState} />);

    const node = screen.getByText('fetch-user');
    await user.click(node);

    // Should show task details panel
    expect(screen.getByText(/task details/i)).toBeInTheDocument();
    expect(screen.getByText(/john doe/i)).toBeInTheDocument();
  });

  it('should support zoom controls', () => {
    render(<WorkflowGraphDebugger graphData={mockGraphData} />);

    expect(screen.getByRole('button', { name: /zoom in/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /zoom out/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reset zoom/i })).toBeInTheDocument();
  });

  it('should support fit to view', async () => {
    const user = userEvent.setup();
    render(<WorkflowGraphDebugger graphData={mockGraphData} />);

    const fitButton = screen.getByRole('button', { name: /fit to view/i });
    await user.click(fitButton);

    // Visual regression would verify this, but we can at least check the button exists and is clickable
    expect(fitButton).toBeInTheDocument();
  });

  it('should show error markers on failed nodes', () => {
    const failedState = {
      ...mockExecutionState,
      runningTasks: [],
      failedTasks: ['task2'],
      taskErrors: {
        task2: 'SMTP connection failed',
      },
    };

    render(<WorkflowGraphDebugger graphData={mockGraphData} executionState={failedState} />);

    expect(screen.getByText(/SMTP connection failed/i)).toBeInTheDocument();
  });

  it('should highlight execution path', () => {
    const { container } = render(
      <WorkflowGraphDebugger
        graphData={mockGraphData}
        executionState={mockExecutionState}
        highlightPath
      />
    );

    // Edges in the execution path should be highlighted
    const highlightedEdges = container.querySelectorAll('[data-in-path="true"]');
    expect(highlightedEdges.length).toBeGreaterThan(0);
  });

  it('should support layout options', async () => {
    const user = userEvent.setup();
    render(<WorkflowGraphDebugger graphData={mockGraphData} />);

    const layoutButton = screen.getByRole('button', { name: /layout/i });
    await user.click(layoutButton);

    // Should show layout options
    expect(screen.getByText(/horizontal/i)).toBeInTheDocument();
    expect(screen.getByText(/vertical/i)).toBeInTheDocument();
  });

  it('should handle empty graph', () => {
    render(<WorkflowGraphDebugger graphData={{ nodes: [], edges: [] }} />);

    expect(screen.getByText(/no workflow graph/i)).toBeInTheDocument();
  });
});
