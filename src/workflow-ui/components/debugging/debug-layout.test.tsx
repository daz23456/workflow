import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DebugLayout } from './debug-layout';
import type { ExecutionTraceResponse } from '@/lib/api/types';
import type { WorkflowExecutionResponse } from '@/types/execution';

// Mock next/link
vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

// Mock @xyflow/react with node click support
vi.mock('@xyflow/react', () => ({
  ReactFlow: ({ nodes, edges, onNodeClick }: any) => (
    <div data-testid="rf__wrapper">
      {nodes?.map((node: any) => (
        <div
          key={node.id}
          data-testid={`rf__node-${node.id}`}
          onClick={() => onNodeClick?.({}, node)}
        >
          {node.data?.label}
        </div>
      ))}
    </div>
  ),
  ReactFlowProvider: ({ children }: { children: React.ReactNode }) => children,
  Controls: () => <div data-testid="rf__controls" />,
  Background: () => <div data-testid="rf__background" />,
  BackgroundVariant: { Dots: 'dots' },
  MarkerType: { ArrowClosed: 'arrowclosed' },
}));

describe('DebugLayout', () => {
  const mockExecutionDetail: WorkflowExecutionResponse = {
    executionId: 'exec-123-456-789',
    workflowName: 'test-workflow',
    success: true,
    output: { result: 'success' },
    executionTimeMs: 1500,
    startedAt: '2025-01-01T10:00:00Z',
    completedAt: '2025-01-01T10:00:01.500Z',
    input: { userId: 123 },
    tasks: [
      {
        taskId: 'task-1',
        taskRef: 'fetch-user',
        status: 'success',
        output: { name: 'John', email: 'john@example.com' },
        durationMs: 500,
        startedAt: '2025-01-01T10:00:00.100Z',
        completedAt: '2025-01-01T10:00:00.600Z',
        retryCount: 0,
      },
      {
        taskId: 'task-2',
        taskRef: 'send-email',
        status: 'success',
        output: { sent: true },
        durationMs: 800,
        startedAt: '2025-01-01T10:00:00.700Z',
        completedAt: '2025-01-01T10:00:01.500Z',
        retryCount: 0,
      },
    ],
  };

  const mockExecutionTrace: ExecutionTraceResponse = {
    executionId: 'exec-123-456-789',
    workflowName: 'test-workflow',
    startedAt: '2025-01-01T10:00:00Z',
    completedAt: '2025-01-01T10:00:01.500Z',
    totalDurationMs: 1500,
    taskTimings: [
      {
        taskId: 'task-1',
        taskRef: 'fetch-user',
        startedAt: '2025-01-01T10:00:00.100Z',
        completedAt: '2025-01-01T10:00:00.600Z',
        durationMs: 500,
        waitTimeMs: 100,
        success: true,
      },
      {
        taskId: 'task-2',
        taskRef: 'send-email',
        startedAt: '2025-01-01T10:00:00.700Z',
        completedAt: '2025-01-01T10:00:01.500Z',
        durationMs: 800,
        waitTimeMs: 100,
        success: true,
      },
    ],
    dependencyOrder: [
      { taskId: 'task-1', dependsOn: [], level: 0 },
      { taskId: 'task-2', dependsOn: ['task-1'], level: 1 },
    ],
    plannedParallelGroups: [
      { level: 0, taskIds: ['task-1'] },
      { level: 1, taskIds: ['task-2'] },
    ],
    actualParallelGroups: [],
  };

  it('should render debug layout container', () => {
    render(
      <DebugLayout
        executionId="exec-123-456-789"
        workflowName="test-workflow"
        executionDetail={mockExecutionDetail}
        executionTrace={mockExecutionTrace}
      />
    );

    expect(screen.getByText(/debugging:/i)).toBeInTheDocument();
    expect(screen.getByText(/exec-123/i)).toBeInTheDocument();
  });

  it('should show back to workflow link', () => {
    render(
      <DebugLayout
        executionId="exec-123-456-789"
        workflowName="test-workflow"
        executionDetail={mockExecutionDetail}
        executionTrace={mockExecutionTrace}
      />
    );

    const backLink = screen.getByRole('link', { name: /back to workflow/i });
    expect(backLink).toBeInTheDocument();
    expect(backLink).toHaveAttribute('href', '/workflows/test-workflow');
  });

  it('should display execution status badge', () => {
    render(
      <DebugLayout
        executionId="exec-123-456-789"
        workflowName="test-workflow"
        executionDetail={mockExecutionDetail}
        executionTrace={mockExecutionTrace}
      />
    );

    expect(screen.getByText('Succeeded')).toBeInTheDocument();
  });

  it('should display execution duration', () => {
    render(
      <DebugLayout
        executionId="exec-123-456-789"
        workflowName="test-workflow"
        executionDetail={mockExecutionDetail}
        executionTrace={mockExecutionTrace}
      />
    );

    expect(screen.getByText('1.500s')).toBeInTheDocument();
  });

  it('should render tab navigation', () => {
    render(
      <DebugLayout
        executionId="exec-123-456-789"
        workflowName="test-workflow"
        executionDetail={mockExecutionDetail}
        executionTrace={mockExecutionTrace}
      />
    );

    expect(screen.getByRole('button', { name: /timeline/i })).toBeInTheDocument();
  });

  it('should show timeline tab by default', () => {
    render(
      <DebugLayout
        executionId="exec-123-456-789"
        workflowName="test-workflow"
        executionDetail={mockExecutionDetail}
        executionTrace={mockExecutionTrace}
      />
    );

    // Timeline should have the active styling
    const timelineTab = screen.getByRole('button', { name: /timeline/i });
    expect(timelineTab).toHaveClass('border-blue-500');
  });

  it('should render workflow graph debugger', () => {
    render(
      <DebugLayout
        executionId="exec-123-456-789"
        workflowName="test-workflow"
        executionDetail={mockExecutionDetail}
        executionTrace={mockExecutionTrace}
      />
    );

    // Graph is rendered via ReactFlow but doesn't have aria-label region
    expect(screen.getByTestId('rf__wrapper')).toBeInTheDocument();
  });

  it('should show failed status for failed executions', () => {
    const failedExecution = {
      ...mockExecutionDetail,
      success: false,
      error: 'Task failed',
    };

    render(
      <DebugLayout
        executionId="exec-123-456-789"
        workflowName="test-workflow"
        executionDetail={failedExecution}
        executionTrace={mockExecutionTrace}
      />
    );

    expect(screen.getByText('Failed')).toBeInTheDocument();
  });

  it('should display task details when clicking on a graph node with taskRef as node ID', async () => {
    // This simulates the real scenario where workflowGraph from workflow detail
    // uses taskRef as node IDs, but executionDetail.tasks have GUID taskIds
    const workflowGraph = {
      nodes: [
        {
          id: 'fetch-user', // Node ID is taskRef, not taskId!
          type: 'task' as const,
          data: { label: 'Fetch User', taskRef: 'fetch-user' },
          position: { x: 0, y: 0 },
        },
        {
          id: 'send-email', // Node ID is taskRef, not taskId!
          type: 'task' as const,
          data: { label: 'Send Email', taskRef: 'send-email' },
          position: { x: 0, y: 100 },
        },
      ],
      edges: [{ id: 'edge-1', source: 'fetch-user', target: 'send-email' }],
      parallelGroups: [],
    };

    render(
      <DebugLayout
        executionId="exec-123-456-789"
        workflowName="test-workflow"
        executionDetail={mockExecutionDetail}
        executionTrace={mockExecutionTrace}
        workflowGraph={workflowGraph}
      />
    );

    // Find and click on the fetch-user node (node ID is 'fetch-user', the taskRef)
    const fetchUserNode = screen.getByText('Fetch User');
    await userEvent.click(fetchUserNode);

    // Should display task details panel with task info
    // The task in executionDetail has taskId='task-1' but taskRef='fetch-user'
    expect(screen.getByText('Task Details')).toBeInTheDocument();
    // The task name should appear in the details panel (look for "Name:" label nearby)
    expect(screen.getByText('Name:')).toBeInTheDocument();
    // Check that status is displayed (confirming the task was found)
    expect(screen.getByText('completed')).toBeInTheDocument();
  });
});
