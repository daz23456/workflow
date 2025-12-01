import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { WorkflowDetailTabs } from './workflow-detail-tabs';
import type { WorkflowDetail } from '@/types/workflow';
import type { ExecutionHistoryItem } from '@/types/execution';

// Mock child components
vi.mock('./workflow-detail-header', () => ({
  WorkflowDetailHeader: ({ workflow, onExecute, onTest }: any) => (
    <div data-testid="workflow-detail-header">
      <div>{workflow.name}</div>
      <button onClick={onExecute}>Execute</button>
      <button onClick={onTest}>Test</button>
    </div>
  ),
}));

vi.mock('./workflow-graph-panel', () => ({
  WorkflowGraphPanel: ({ graph, onNodeClick }: any) => (
    <div data-testid="workflow-graph-panel">
      <div>Nodes: {graph.nodes.length}</div>
      {graph.nodes.map((node: any) => (
        <button key={node.id} onClick={() => onNodeClick?.(node.id)}>
          {node.data.label}
        </button>
      ))}
    </div>
  ),
}));

vi.mock('./execution-input-form', () => ({
  ExecutionInputForm: ({ schema, onSubmit, onTest }: any) => (
    <div data-testid="execution-input-form">
      <button onClick={() => onSubmit({ test: 'data' })}>Submit</button>
      <button onClick={() => onTest?.({ test: 'data' })}>Test Form</button>
    </div>
  ),
}));

vi.mock('./execution-history-panel', () => ({
  ExecutionHistoryPanel: ({ executions, onExecutionClick }: any) => (
    <div data-testid="execution-history-panel">
      <div>Executions: {executions.length}</div>
      {executions.map((exec: any) => (
        <button key={exec.executionId} onClick={() => onExecutionClick?.(exec.executionId)}>
          {exec.executionId}
        </button>
      ))}
    </div>
  ),
}));

vi.mock('./task-detail-panel', () => ({
  TaskDetailPanel: ({ task, onClose }: any) => (
    <div data-testid="task-detail-panel">
      <div>{task.id}</div>
      <button onClick={onClose}>Close</button>
    </div>
  ),
}));

vi.mock('./execution-result-panel', () => ({
  ExecutionResultPanel: ({ execution, onClose }: any) => (
    <div data-testid="execution-result-panel">
      <div>{execution.executionId}</div>
      <button onClick={onClose}>Close</button>
    </div>
  ),
}));

vi.mock('./execute-modal', () => ({
  ExecuteModal: ({ isOpen, onClose, onExecute, onTest, mode }: any) => (
    isOpen ? (
      <div data-testid="execute-modal">
        <button onClick={() => { onExecute({ test: 'data' }); onClose(); }}>Execute Modal Submit</button>
        <button onClick={onClose}>Close Modal</button>
      </div>
    ) : null
  ),
}));

vi.mock('../analytics/workflow-duration-trends-section', () => ({
  WorkflowDurationTrendsSection: () => <div data-testid="duration-trends">Duration Trends</div>,
}));

// Mock useWorkflowVersions to avoid QueryClient dependency
vi.mock('@/lib/api/queries', () => ({
  useWorkflowVersions: () => ({
    data: { versions: [] },
    isLoading: false,
  }),
}));

describe('WorkflowDetailTabs', () => {
  const mockWorkflow: WorkflowDetail = {
    name: 'user-signup',
    namespace: 'production',
    description: 'User signup workflow',
    inputSchema: {
      type: 'object',
      properties: {
        email: { type: 'string' },
      },
      required: ['email'],
    },
    outputSchema: {
      userId: '{{tasks.create-user.output.id}}',
    },
    tasks: [
      {
        id: 'validate-email',
        taskRef: 'email-validator',
        description: 'Validate email',
        dependencies: [],
      },
      {
        id: 'create-user',
        taskRef: 'user-service',
        description: 'Create user',
        dependencies: ['validate-email'],
      },
    ],
    graph: {
      nodes: [
        {
          id: 'validate-email',
          type: 'task',
          data: { label: 'Validate Email' },
          position: { x: 0, y: 0 },
        },
        {
          id: 'create-user',
          type: 'task',
          data: { label: 'Create User' },
          position: { x: 0, y: 100 },
        },
      ],
      edges: [{ id: 'e1', source: 'validate-email', target: 'create-user', type: 'dependency' }],
      parallelGroups: [],
    },
    endpoints: {
      execute: '/api/v1/workflows/user-signup/execute',
      test: '/api/v1/workflows/user-signup/test',
      details: '/api/v1/workflows/user-signup',
    },
  };

  const mockStats = {
    totalExecutions: 10,
    successRate: 95,
    avgDurationMs: 1000,
    lastExecuted: '2025-11-24T10:00:00Z',
  };

  const mockExecutionHistory: ExecutionHistoryItem[] = [
    {
      executionId: 'exec-1',
      workflowName: 'user-signup',
      status: 'success',
      startedAt: '2025-11-24T10:00:00Z',
      completedAt: '2025-11-24T10:00:03Z',
      durationMs: 3000,
      inputSnapshot: {},
    },
  ];

  describe('Basic Rendering', () => {
    it('renders workflow detail header', () => {
      render(
        <WorkflowDetailTabs
          workflow={mockWorkflow}
          stats={mockStats}
          executionHistory={mockExecutionHistory}
        />
      );
      expect(screen.getByTestId('workflow-detail-header')).toBeInTheDocument();
      expect(screen.getByText('user-signup')).toBeInTheDocument();
    });

    it('renders tab navigation', () => {
      render(
        <WorkflowDetailTabs
          workflow={mockWorkflow}
          stats={mockStats}
          executionHistory={mockExecutionHistory}
        />
      );
      expect(screen.getByRole('tab', { name: /overview/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /history/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /analytics/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /yaml/i })).toBeInTheDocument();
    });

    it('shows Overview tab by default', () => {
      render(
        <WorkflowDetailTabs
          workflow={mockWorkflow}
          stats={mockStats}
          executionHistory={mockExecutionHistory}
        />
      );
      expect(screen.getByTestId('workflow-graph-panel')).toBeInTheDocument();
    });
  });

  describe('Tab Navigation', () => {
    it('switches to Analytics tab when clicked', async () => {
      const user = userEvent.setup();
      render(
        <WorkflowDetailTabs
          workflow={mockWorkflow}
          stats={mockStats}
          executionHistory={mockExecutionHistory}
        />
      );

      await user.click(screen.getByRole('tab', { name: /analytics/i }));

      expect(screen.getByTestId('duration-trends')).toBeInTheDocument();
      expect(screen.queryByTestId('workflow-graph-panel')).not.toBeInTheDocument();
    });

    it('switches to History tab when clicked', async () => {
      const user = userEvent.setup();
      render(
        <WorkflowDetailTabs
          workflow={mockWorkflow}
          stats={mockStats}
          executionHistory={mockExecutionHistory}
        />
      );

      await user.click(screen.getByRole('tab', { name: /history/i }));

      expect(screen.getByTestId('execution-history-panel')).toBeInTheDocument();
      expect(screen.queryByTestId('workflow-graph-panel')).not.toBeInTheDocument();
    });

    it('can switch between tabs multiple times', async () => {
      const user = userEvent.setup();
      render(
        <WorkflowDetailTabs
          workflow={mockWorkflow}
          stats={mockStats}
          executionHistory={mockExecutionHistory}
        />
      );

      await user.click(screen.getByRole('tab', { name: /analytics/i }));
      expect(screen.getByTestId('duration-trends')).toBeInTheDocument();

      await user.click(screen.getByRole('tab', { name: /overview/i }));
      expect(screen.getByTestId('workflow-graph-panel')).toBeInTheDocument();

      await user.click(screen.getByRole('tab', { name: /history/i }));
      expect(screen.getByTestId('execution-history-panel')).toBeInTheDocument();
    });

    it('highlights active tab', async () => {
      const user = userEvent.setup();
      render(
        <WorkflowDetailTabs
          workflow={mockWorkflow}
          stats={mockStats}
          executionHistory={mockExecutionHistory}
        />
      );

      const historyTab = screen.getByRole('tab', { name: /history/i });
      await user.click(historyTab);

      expect(historyTab).toHaveAttribute('aria-selected', 'true');
    });
  });

  describe('Overview Tab', () => {
    it('displays workflow graph', () => {
      render(
        <WorkflowDetailTabs
          workflow={mockWorkflow}
          stats={mockStats}
          executionHistory={mockExecutionHistory}
        />
      );
      expect(screen.getByTestId('workflow-graph-panel')).toBeInTheDocument();
      expect(screen.getByText('Nodes: 2')).toBeInTheDocument();
    });

    it('shows task detail panel when graph node clicked', async () => {
      const user = userEvent.setup();
      render(
        <WorkflowDetailTabs
          workflow={mockWorkflow}
          stats={mockStats}
          executionHistory={mockExecutionHistory}
        />
      );

      await user.click(screen.getByRole('button', { name: /validate email/i }));

      expect(screen.getByTestId('task-detail-panel')).toBeInTheDocument();
      expect(screen.getByText('validate-email')).toBeInTheDocument();
    });

    it('closes task detail panel when close button clicked', async () => {
      const user = userEvent.setup();
      render(
        <WorkflowDetailTabs
          workflow={mockWorkflow}
          stats={mockStats}
          executionHistory={mockExecutionHistory}
        />
      );

      await user.click(screen.getByRole('button', { name: /validate email/i }));
      expect(screen.getByTestId('task-detail-panel')).toBeInTheDocument();

      const closeButton = within(screen.getByTestId('task-detail-panel')).getByRole('button', {
        name: /close/i,
      });
      await user.click(closeButton);

      expect(screen.queryByTestId('task-detail-panel')).not.toBeInTheDocument();
    });
  });

  describe('Execute Modal', () => {
    it('opens execute modal when execute button clicked in header', async () => {
      const user = userEvent.setup();
      render(
        <WorkflowDetailTabs
          workflow={mockWorkflow}
          stats={mockStats}
          executionHistory={mockExecutionHistory}
        />
      );

      // Click Execute button in the header (mocked)
      await user.click(screen.getByRole('button', { name: /^execute$/i }));

      expect(screen.getByTestId('execute-modal')).toBeInTheDocument();
    });

    it('calls onExecute when modal submit is clicked', async () => {
      const user = userEvent.setup();
      const mockExecutionResult = {
        executionId: 'exec-new',
        workflowName: 'user-signup',
        success: true,
        output: {},
        tasks: [],
        executionTimeMs: 1000,
        startedAt: '2025-11-24T10:00:00Z',
      };

      const onExecute = vi.fn().mockResolvedValue(mockExecutionResult);

      render(
        <WorkflowDetailTabs
          workflow={mockWorkflow}
          stats={mockStats}
          executionHistory={mockExecutionHistory}
          onExecute={onExecute}
        />
      );

      // Click Execute button in the header, then submit in modal
      await user.click(screen.getByRole('button', { name: /^execute$/i }));
      await user.click(screen.getByRole('button', { name: /execute modal submit/i }));

      expect(onExecute).toHaveBeenCalled();
    });
  });

  describe('History Tab', () => {
    it('displays execution history', async () => {
      const user = userEvent.setup();
      render(
        <WorkflowDetailTabs
          workflow={mockWorkflow}
          stats={mockStats}
          executionHistory={mockExecutionHistory}
        />
      );

      await user.click(screen.getByRole('tab', { name: /history/i }));

      expect(screen.getByTestId('execution-history-panel')).toBeInTheDocument();
      expect(screen.getByText('Executions: 1')).toBeInTheDocument();
    });

    it('shows execution result when history item clicked', async () => {
      const user = userEvent.setup();
      const mockExecutionDetails = {
        executionId: 'exec-1',
        workflowName: 'user-signup',
        success: true,
        output: {},
        tasks: [],
        executionTimeMs: 3000,
        startedAt: '2025-11-24T10:00:00Z',
      };

      const onFetchExecution = vi.fn().mockResolvedValue(mockExecutionDetails);

      render(
        <WorkflowDetailTabs
          workflow={mockWorkflow}
          stats={mockStats}
          executionHistory={mockExecutionHistory}
          onFetchExecution={onFetchExecution}
        />
      );

      await user.click(screen.getByRole('tab', { name: /history/i }));
      await user.click(screen.getByRole('button', { name: /exec-1/i }));

      expect(onFetchExecution).toHaveBeenCalledWith('exec-1');
    });
  });

  describe('Side Panels', () => {
    it('task detail panel appears on right side', async () => {
      const user = userEvent.setup();
      render(
        <WorkflowDetailTabs
          workflow={mockWorkflow}
          stats={mockStats}
          executionHistory={mockExecutionHistory}
        />
      );

      await user.click(screen.getByRole('button', { name: /validate email/i }));

      const panel = screen.getByTestId('task-detail-panel');
      expect(panel.parentElement).toHaveClass('w-96'); // Right side panel
    });

    it('execution result panel appears on right side', async () => {
      const user = userEvent.setup();
      const mockResult = {
        executionId: 'exec-1',
        workflowName: 'user-signup',
        success: true,
        output: {},
        tasks: [],
        executionTimeMs: 1000,
        startedAt: '2025-11-24T10:00:00Z',
      };

      const onFetchExecution = vi.fn().mockResolvedValue(mockResult);

      render(
        <WorkflowDetailTabs
          workflow={mockWorkflow}
          stats={mockStats}
          executionHistory={mockExecutionHistory}
          onFetchExecution={onFetchExecution}
        />
      );

      await user.click(screen.getByRole('tab', { name: /history/i }));
      await user.click(screen.getByRole('button', { name: /exec-1/i }));

      // Wait for fetch to complete
      await screen.findByTestId('execution-result-panel');

      const panel = screen.getByTestId('execution-result-panel');
      expect(panel.parentElement).toHaveClass('w-96'); // Right side panel
    });
  });

  describe('Accessibility', () => {
    it('has proper tab structure', () => {
      render(
        <WorkflowDetailTabs
          workflow={mockWorkflow}
          stats={mockStats}
          executionHistory={mockExecutionHistory}
        />
      );

      expect(screen.getByRole('tablist')).toBeInTheDocument();
      expect(screen.getAllByRole('tab').length).toBeGreaterThanOrEqual(4); // Overview, History, Analytics, YAML
    });

    it('tabs are keyboard accessible', async () => {
      const user = userEvent.setup();
      render(
        <WorkflowDetailTabs
          workflow={mockWorkflow}
          stats={mockStats}
          executionHistory={mockExecutionHistory}
        />
      );

      const historyTab = screen.getByRole('tab', { name: /history/i });
      historyTab.focus();
      await user.keyboard('{Enter}');

      expect(screen.getByTestId('execution-history-panel')).toBeInTheDocument();
    });
  });
});
