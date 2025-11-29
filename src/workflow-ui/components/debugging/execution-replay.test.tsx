import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ExecutionReplay } from './execution-replay';

describe('ExecutionReplay', () => {
  const mockExecutions = [
    {
      id: 'exec-1',
      workflowName: 'test-workflow',
      status: 'Succeeded',
      startedAt: '2025-01-01T10:00:00Z',
      duration: '00:00:05',
    },
    {
      id: 'exec-2',
      workflowName: 'test-workflow',
      status: 'Failed',
      startedAt: '2025-01-01T09:00:00Z',
      duration: '00:00:03',
    },
    {
      id: 'exec-3',
      workflowName: 'other-workflow',
      status: 'Succeeded',
      startedAt: '2025-01-01T08:00:00Z',
      duration: '00:00:10',
    },
  ];

  const mockExecutionDetails = {
    id: 'exec-1',
    workflowName: 'test-workflow',
    status: 'Succeeded',
    startedAt: '2025-01-01T10:00:00Z',
    completedAt: '2025-01-01T10:00:05Z',
    duration: '00:00:05',
    tasks: [
      {
        taskId: 'task1',
        taskName: 'fetch-user',
        status: 'Succeeded',
        startTime: '2025-01-01T10:00:01Z',
        endTime: '2025-01-01T10:00:02Z',
        duration: '00:00:01',
        input: { userId: '123' },
        output: { id: '123', name: 'John Doe' },
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn() as any;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should render execution replay container', () => {
    render(<ExecutionReplay workflowName="test-workflow" />);

    const replay = screen.getByRole('region', { name: /execution replay/i });
    expect(replay).toBeInTheDocument();
  });

  it('should load and display past executions', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockExecutions.filter((e) => e.workflowName === 'test-workflow'),
    });

    render(<ExecutionReplay workflowName="test-workflow" />);

    await waitFor(() => {
      expect(screen.getByText('exec-1')).toBeInTheDocument();
      expect(screen.getByText('exec-2')).toBeInTheDocument();
    });

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/workflows/test-workflow/executions')
    );
  });

  it('should filter executions by status', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockExecutions.filter((e) => e.workflowName === 'test-workflow'),
    });

    const user = userEvent.setup();
    render(<ExecutionReplay workflowName="test-workflow" />);

    await waitFor(() => {
      expect(screen.getByText('exec-1')).toBeInTheDocument();
    });

    const statusFilter = screen.getByRole('combobox', { name: /filter by status/i });
    await user.selectOptions(statusFilter, 'Succeeded');

    // Should only show succeeded executions
    expect(screen.getByText('exec-1')).toBeInTheDocument();
    expect(screen.queryByText('exec-2')).not.toBeInTheDocument();
  });

  it('should display execution details when selected', async () => {
    (global.fetch as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockExecutions.filter((e) => e.workflowName === 'test-workflow'),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockExecutionDetails,
      });

    const user = userEvent.setup();
    render(<ExecutionReplay workflowName="test-workflow" />);

    await waitFor(() => {
      expect(screen.getByText('exec-1')).toBeInTheDocument();
    });

    const execution = screen.getByText('exec-1');
    await user.click(execution);

    await waitFor(() => {
      expect(screen.getByText(/execution details/i)).toBeInTheDocument();
      expect(screen.getByText(/fetch-user/i)).toBeInTheDocument();
    });

    expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/api/v1/executions/exec-1'));
  });

  it('should show loading state', () => {
    (global.fetch as any).mockImplementationOnce(
      () => new Promise(() => {}) // Never resolves
    );

    render(<ExecutionReplay workflowName="test-workflow" />);

    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('should handle empty executions list', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    });

    render(<ExecutionReplay workflowName="test-workflow" />);

    await waitFor(() => {
      expect(screen.getByText(/no executions found/i)).toBeInTheDocument();
    });
  });

  it('should handle API errors gracefully', async () => {
    (global.fetch as any).mockRejectedValueOnce(new Error('API Error'));

    render(<ExecutionReplay workflowName="test-workflow" />);

    await waitFor(() => {
      expect(screen.getByText(/API Error/i)).toBeInTheDocument();
    });
  });

  it('should support pagination', async () => {
    const manyExecutions = Array.from({ length: 25 }, (_, i) => ({
      id: `exec-${i}`,
      workflowName: 'test-workflow',
      status: 'Succeeded',
      startedAt: `2025-01-01T${String(i).padStart(2, '0')}:00:00Z`,
      duration: '00:00:05',
    }));

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => manyExecutions,
    });

    const user = userEvent.setup();
    render(<ExecutionReplay workflowName="test-workflow" />);

    await waitFor(() => {
      expect(screen.getByText('exec-0')).toBeInTheDocument();
    });

    // Should show pagination controls
    const nextButton = screen.getByRole('button', { name: /next/i });
    expect(nextButton).toBeInTheDocument();

    await user.click(nextButton);

    // Should show second page
    expect(screen.queryByText('exec-0')).not.toBeInTheDocument();
  });

  it('should allow replaying execution with visualizations', async () => {
    (global.fetch as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockExecutions.filter((e) => e.workflowName === 'test-workflow'),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockExecutionDetails,
      });

    const user = userEvent.setup();
    const onReplay = vi.fn();

    render(<ExecutionReplay workflowName="test-workflow" onReplay={onReplay} />);

    await waitFor(() => {
      expect(screen.getByText('exec-1')).toBeInTheDocument();
    });

    const execution = screen.getByText('exec-1');
    await user.click(execution);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /replay/i })).toBeInTheDocument();
    });

    const replayButton = screen.getByRole('button', { name: /replay/i });
    await user.click(replayButton);

    expect(onReplay).toHaveBeenCalledWith(mockExecutionDetails);
  });

  it('should show execution timestamps', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockExecutions.filter((e) => e.workflowName === 'test-workflow'),
    });

    render(<ExecutionReplay workflowName="test-workflow" />);

    await waitFor(() => {
      // Timestamp is formatted as locale string, e.g., "01/01/2025, 10:00:00"
      const timestamps = screen.getAllByText(/01\/01\/2025/);
      expect(timestamps.length).toBeGreaterThan(0);
    });
  });

  it('should display execution status badges', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockExecutions.filter((e) => e.workflowName === 'test-workflow'),
    });

    render(<ExecutionReplay workflowName="test-workflow" />);

    await waitFor(() => {
      expect(screen.getByText('exec-1')).toBeInTheDocument();
    });

    // Status badges should be visible (multiple instances in dropdown + badges)
    const succeededBadges = screen.getAllByText('Succeeded');
    const failedBadges = screen.getAllByText('Failed');

    expect(succeededBadges.length).toBeGreaterThan(0);
    expect(failedBadges.length).toBeGreaterThan(0);
  });
});
