/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HealthSummaryPanel } from './health-summary-panel';
import type { HealthSummary, WorkflowHealthStatus } from '@/lib/api/types';

// Mock the queries module
vi.mock('@/lib/api/queries', () => ({
  useHealthSummary: vi.fn(),
}));

import { useHealthSummary } from '@/lib/api/queries';

const mockUseHealthSummary = vi.mocked(useHealthSummary);

// Test data
const mockHealthyWorkflow: WorkflowHealthStatus = {
  workflowName: 'order-processing',
  overallHealth: 'Healthy',
  tasks: [
    {
      taskId: 'task-1',
      taskRef: 'get-user',
      status: 'Healthy',
      url: 'https://api.example.com/users/1',
      latencyMs: 45,
      reachable: true,
      statusCode: 200,
    },
    {
      taskId: 'task-2',
      taskRef: 'get-orders',
      status: 'Healthy',
      url: 'https://api.example.com/orders',
      latencyMs: 120,
      reachable: true,
      statusCode: 200,
    },
  ],
  checkedAt: '2024-01-15T10:30:00Z',
  durationMs: 165,
};

const mockUnhealthyWorkflow: WorkflowHealthStatus = {
  workflowName: 'payment-flow',
  overallHealth: 'Unhealthy',
  tasks: [
    {
      taskId: 'task-3',
      taskRef: 'payment-gateway',
      status: 'Unhealthy',
      url: 'https://payments.example.com/check',
      latencyMs: 5000,
      reachable: false,
      errorMessage: 'Connection timeout',
    },
  ],
  checkedAt: '2024-01-15T10:30:00Z',
  durationMs: 5000,
};

const mockDegradedWorkflow: WorkflowHealthStatus = {
  workflowName: 'notification-service',
  overallHealth: 'Degraded',
  tasks: [
    {
      taskId: 'task-4',
      taskRef: 'send-email',
      status: 'Degraded',
      url: 'https://mail.example.com/send',
      latencyMs: 2000,
      reachable: true,
      statusCode: 503,
    },
  ],
  checkedAt: '2024-01-15T10:30:00Z',
  durationMs: 2000,
};

const mockHealthSummary: HealthSummary = {
  totalWorkflows: 3,
  healthyCount: 1,
  degradedCount: 1,
  unhealthyCount: 1,
  unknownCount: 0,
  workflows: [mockHealthyWorkflow, mockUnhealthyWorkflow, mockDegradedWorkflow],
  generatedAt: '2024-01-15T10:30:00Z',
};

// Wrapper component for tests
function TestWrapper({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

describe('HealthSummaryPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ============================================================================
  // Loading State Tests
  // ============================================================================

  it('should render loading skeleton when isLoading is true', () => {
    mockUseHealthSummary.mockReturnValue({
      data: undefined,
      isLoading: true,
      isFetching: false,
      refetch: vi.fn(),
    } as any);

    render(
      <TestWrapper>
        <HealthSummaryPanel />
      </TestWrapper>
    );

    expect(screen.getByTestId('health-panel-skeleton')).toBeInTheDocument();
  });

  // ============================================================================
  // Panel Structure Tests
  // ============================================================================

  it('should render panel with header', () => {
    mockUseHealthSummary.mockReturnValue({
      data: mockHealthSummary,
      isLoading: false,
      isFetching: false,
      refetch: vi.fn(),
    } as any);

    render(
      <TestWrapper>
        <HealthSummaryPanel />
      </TestWrapper>
    );

    expect(screen.getByText('Service Health')).toBeInTheDocument();
    expect(screen.getByTestId('health-summary-panel')).toBeInTheDocument();
  });

  it('should render refresh button', () => {
    mockUseHealthSummary.mockReturnValue({
      data: mockHealthSummary,
      isLoading: false,
      isFetching: false,
      refetch: vi.fn(),
    } as any);

    render(
      <TestWrapper>
        <HealthSummaryPanel />
      </TestWrapper>
    );

    expect(screen.getByTestId('refresh-button')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /refresh/i })).toBeInTheDocument();
  });

  // ============================================================================
  // Health Indicator Tests
  // ============================================================================

  it('should render health indicators with correct counts', () => {
    mockUseHealthSummary.mockReturnValue({
      data: mockHealthSummary,
      isLoading: false,
      isFetching: false,
      refetch: vi.fn(),
    } as any);

    render(
      <TestWrapper>
        <HealthSummaryPanel />
      </TestWrapper>
    );

    expect(screen.getByTestId('health-indicator-healthy')).toHaveTextContent('1');
    expect(screen.getByTestId('health-indicator-degraded')).toHaveTextContent('1');
    expect(screen.getByTestId('health-indicator-unhealthy')).toHaveTextContent('1');
    expect(screen.getByTestId('health-indicator-unknown')).toHaveTextContent('0');
  });

  it('should show green indicator for healthy count', () => {
    mockUseHealthSummary.mockReturnValue({
      data: mockHealthSummary,
      isLoading: false,
      isFetching: false,
      refetch: vi.fn(),
    } as any);

    render(
      <TestWrapper>
        <HealthSummaryPanel />
      </TestWrapper>
    );

    const healthyIndicator = screen.getByTestId('health-indicator-healthy');
    expect(healthyIndicator).toHaveClass('bg-green-100');
  });

  it('should show yellow indicator for degraded count', () => {
    mockUseHealthSummary.mockReturnValue({
      data: mockHealthSummary,
      isLoading: false,
      isFetching: false,
      refetch: vi.fn(),
    } as any);

    render(
      <TestWrapper>
        <HealthSummaryPanel />
      </TestWrapper>
    );

    const degradedIndicator = screen.getByTestId('health-indicator-degraded');
    expect(degradedIndicator).toHaveClass('bg-yellow-100');
  });

  it('should show red indicator for unhealthy count', () => {
    mockUseHealthSummary.mockReturnValue({
      data: mockHealthSummary,
      isLoading: false,
      isFetching: false,
      refetch: vi.fn(),
    } as any);

    render(
      <TestWrapper>
        <HealthSummaryPanel />
      </TestWrapper>
    );

    const unhealthyIndicator = screen.getByTestId('health-indicator-unhealthy');
    expect(unhealthyIndicator).toHaveClass('bg-red-100');
  });

  it('should show gray indicator for unknown count', () => {
    mockUseHealthSummary.mockReturnValue({
      data: mockHealthSummary,
      isLoading: false,
      isFetching: false,
      refetch: vi.fn(),
    } as any);

    render(
      <TestWrapper>
        <HealthSummaryPanel />
      </TestWrapper>
    );

    const unknownIndicator = screen.getByTestId('health-indicator-unknown');
    expect(unknownIndicator).toHaveClass('bg-gray-100');
  });

  // ============================================================================
  // Workflow List Tests
  // ============================================================================

  it('should render workflow list with workflow names', () => {
    mockUseHealthSummary.mockReturnValue({
      data: mockHealthSummary,
      isLoading: false,
      isFetching: false,
      refetch: vi.fn(),
    } as any);

    render(
      <TestWrapper>
        <HealthSummaryPanel />
      </TestWrapper>
    );

    expect(screen.getByText('order-processing')).toBeInTheDocument();
    expect(screen.getByText('payment-flow')).toBeInTheDocument();
    expect(screen.getByText('notification-service')).toBeInTheDocument();
  });

  it('should show empty state when no workflows', () => {
    mockUseHealthSummary.mockReturnValue({
      data: { ...mockHealthSummary, workflows: [] },
      isLoading: false,
      isFetching: false,
      refetch: vi.fn(),
    } as any);

    render(
      <TestWrapper>
        <HealthSummaryPanel />
      </TestWrapper>
    );

    expect(screen.getByTestId('no-workflows-message')).toBeInTheDocument();
    expect(screen.getByText('No workflows with health data')).toBeInTheDocument();
  });

  it('should show no tasks message when workflow has empty tasks array', () => {
    const workflowWithNoTasks: WorkflowHealthStatus = {
      workflowName: 'empty-workflow',
      overallHealth: 'Unknown',
      tasks: [],
      checkedAt: '2024-01-15T10:30:00Z',
      durationMs: 0,
    };

    mockUseHealthSummary.mockReturnValue({
      data: { ...mockHealthSummary, workflows: [workflowWithNoTasks] },
      isLoading: false,
      isFetching: false,
      refetch: vi.fn(),
    } as any);

    render(
      <TestWrapper>
        <HealthSummaryPanel />
      </TestWrapper>
    );

    // Expand the workflow row
    const workflowRow = screen.getByTestId('workflow-row-empty-workflow');
    fireEvent.click(workflowRow);

    // Should show the "no tasks" message
    expect(screen.getByTestId('no-tasks-message')).toBeInTheDocument();
    expect(screen.getByText('No endpoints checked. Run a health check to see task details.')).toBeInTheDocument();
  });

  it('should show +N more when workflows exceed maxItems', () => {
    const manyWorkflows = Array.from({ length: 8 }, (_, i) => ({
      ...mockHealthyWorkflow,
      workflowName: `workflow-${i + 1}`,
    }));

    mockUseHealthSummary.mockReturnValue({
      data: { ...mockHealthSummary, workflows: manyWorkflows },
      isLoading: false,
      isFetching: false,
      refetch: vi.fn(),
    } as any);

    render(
      <TestWrapper>
        <HealthSummaryPanel />
      </TestWrapper>
    );

    expect(screen.getByTestId('more-workflows-count')).toHaveTextContent('+3 more workflows');
  });

  // ============================================================================
  // Expand/Collapse Tests
  // ============================================================================

  it('should expand workflow row on click', () => {
    mockUseHealthSummary.mockReturnValue({
      data: mockHealthSummary,
      isLoading: false,
      isFetching: false,
      refetch: vi.fn(),
    } as any);

    render(
      <TestWrapper>
        <HealthSummaryPanel />
      </TestWrapper>
    );

    const workflowRow = screen.getByTestId('workflow-row-order-processing');
    fireEvent.click(workflowRow);

    expect(screen.getByTestId('task-list-order-processing')).toBeInTheDocument();
  });

  it('should show task details when expanded', () => {
    mockUseHealthSummary.mockReturnValue({
      data: mockHealthSummary,
      isLoading: false,
      isFetching: false,
      refetch: vi.fn(),
    } as any);

    render(
      <TestWrapper>
        <HealthSummaryPanel />
      </TestWrapper>
    );

    const workflowRow = screen.getByTestId('workflow-row-order-processing');
    fireEvent.click(workflowRow);

    expect(screen.getByText('get-user')).toBeInTheDocument();
    expect(screen.getByText('get-orders')).toBeInTheDocument();
  });

  it('should display task latency and status code', () => {
    mockUseHealthSummary.mockReturnValue({
      data: mockHealthSummary,
      isLoading: false,
      isFetching: false,
      refetch: vi.fn(),
    } as any);

    render(
      <TestWrapper>
        <HealthSummaryPanel />
      </TestWrapper>
    );

    const workflowRow = screen.getByTestId('workflow-row-order-processing');
    fireEvent.click(workflowRow);

    expect(screen.getByText('45ms')).toBeInTheDocument();
    // Multiple tasks have status code 200, so use getAllByText
    expect(screen.getAllByText('200').length).toBeGreaterThan(0);
  });

  it('should show error message for failed tasks', () => {
    mockUseHealthSummary.mockReturnValue({
      data: mockHealthSummary,
      isLoading: false,
      isFetching: false,
      refetch: vi.fn(),
    } as any);

    render(
      <TestWrapper>
        <HealthSummaryPanel />
      </TestWrapper>
    );

    const workflowRow = screen.getByTestId('workflow-row-payment-flow');
    fireEvent.click(workflowRow);

    expect(screen.getByText('Connection timeout')).toBeInTheDocument();
  });

  // ============================================================================
  // Refresh Button Tests
  // ============================================================================

  it('should call refetch when refresh button is clicked', () => {
    const mockRefetch = vi.fn();
    mockUseHealthSummary.mockReturnValue({
      data: mockHealthSummary,
      isLoading: false,
      isFetching: false,
      refetch: mockRefetch,
    } as any);

    render(
      <TestWrapper>
        <HealthSummaryPanel />
      </TestWrapper>
    );

    const refreshButton = screen.getByTestId('refresh-button');
    fireEvent.click(refreshButton);

    expect(mockRefetch).toHaveBeenCalledTimes(1);
  });

  it('should show spinner when fetching', () => {
    mockUseHealthSummary.mockReturnValue({
      data: mockHealthSummary,
      isLoading: false,
      isFetching: true,
      refetch: vi.fn(),
    } as any);

    render(
      <TestWrapper>
        <HealthSummaryPanel />
      </TestWrapper>
    );

    const refreshButton = screen.getByTestId('refresh-button');
    const icon = refreshButton.querySelector('svg');
    expect(icon).toHaveClass('animate-spin');
  });

  // ============================================================================
  // Timestamp Tests
  // ============================================================================

  it('should display last updated timestamp', () => {
    mockUseHealthSummary.mockReturnValue({
      data: mockHealthSummary,
      isLoading: false,
      isFetching: false,
      refetch: vi.fn(),
    } as any);

    render(
      <TestWrapper>
        <HealthSummaryPanel />
      </TestWrapper>
    );

    expect(screen.getByTestId('last-updated')).toBeInTheDocument();
    expect(screen.getByText(/Last updated:/)).toBeInTheDocument();
  });

  // ============================================================================
  // Accessibility Tests
  // ============================================================================

  it('should have proper ARIA labels on refresh button', () => {
    mockUseHealthSummary.mockReturnValue({
      data: mockHealthSummary,
      isLoading: false,
      isFetching: false,
      refetch: vi.fn(),
    } as any);

    render(
      <TestWrapper>
        <HealthSummaryPanel />
      </TestWrapper>
    );

    const refreshButton = screen.getByRole('button', { name: /refresh health status/i });
    expect(refreshButton).toBeInTheDocument();
  });

  it('should have aria-expanded on workflow rows', () => {
    mockUseHealthSummary.mockReturnValue({
      data: mockHealthSummary,
      isLoading: false,
      isFetching: false,
      refetch: vi.fn(),
    } as any);

    render(
      <TestWrapper>
        <HealthSummaryPanel />
      </TestWrapper>
    );

    const workflowRow = screen.getByTestId('workflow-row-order-processing');
    expect(workflowRow).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(workflowRow);
    expect(workflowRow).toHaveAttribute('aria-expanded', 'true');
  });
});
