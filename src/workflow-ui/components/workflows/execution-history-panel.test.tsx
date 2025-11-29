import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { ExecutionHistoryPanel } from './execution-history-panel';
import type { ExecutionHistoryItem } from '@/types/execution';
import type { ExecutionSummary } from '@/lib/api/types';

describe('ExecutionHistoryPanel', () => {
  const mockExecutions: ExecutionHistoryItem[] = [
    {
      executionId: 'exec-1',
      workflowName: 'user-signup',
      status: 'success',
      startedAt: '2025-11-24T10:00:00Z',
      completedAt: '2025-11-24T10:00:03Z',
      durationMs: 3000,
      inputSnapshot: { email: 'user@example.com' },
      outputSnapshot: { userId: 'user-123' },
    },
    {
      executionId: 'exec-2',
      workflowName: 'user-signup',
      status: 'failed',
      startedAt: '2025-11-24T09:30:00Z',
      completedAt: '2025-11-24T09:30:02Z',
      durationMs: 2000,
      error: 'Validation failed',
      inputSnapshot: { email: 'invalid' },
    },
    {
      executionId: 'exec-3',
      workflowName: 'user-signup',
      status: 'success',
      startedAt: '2025-11-24T09:00:00Z',
      completedAt: '2025-11-24T09:00:05Z',
      durationMs: 5000,
      inputSnapshot: { email: 'test@example.com' },
      outputSnapshot: { userId: 'user-456' },
    },
  ];

  describe('Basic Rendering', () => {
    it('renders panel title', () => {
      render(<ExecutionHistoryPanel executions={mockExecutions} />);
      expect(screen.getByText(/execution history/i)).toBeInTheDocument();
    });

    it('renders all executions', () => {
      render(<ExecutionHistoryPanel executions={mockExecutions} />);
      expect(screen.getByText('exec-1')).toBeInTheDocument();
      expect(screen.getByText('exec-2')).toBeInTheDocument();
      expect(screen.getByText('exec-3')).toBeInTheDocument();
    });

    it('shows execution status badges', () => {
      const { container } = render(<ExecutionHistoryPanel executions={mockExecutions} />);
      const successBadges = container.querySelectorAll('.bg-green-100');
      const failedBadges = container.querySelectorAll('.bg-red-100');
      expect(successBadges.length).toBeGreaterThan(0);
      expect(failedBadges.length).toBeGreaterThan(0);
    });

    it('displays execution duration', () => {
      render(<ExecutionHistoryPanel executions={mockExecutions} />);
      expect(screen.getByText('3.0s')).toBeInTheDocument();
      expect(screen.getByText('2.0s')).toBeInTheDocument();
      expect(screen.getByText('5.0s')).toBeInTheDocument();
    });

    it('displays execution timestamps', () => {
      render(<ExecutionHistoryPanel executions={mockExecutions} />);
      // Should show formatted time (HH:MM:SS format with colons)
      const timeElements = screen.getAllByText(/\d{2}:\d{2}:\d{2}/);
      expect(timeElements.length).toBeGreaterThanOrEqual(3); // At least one per execution
    });
  });

  describe('Status Filtering', () => {
    it('renders filter buttons', () => {
      render(<ExecutionHistoryPanel executions={mockExecutions} />);
      expect(screen.getByRole('button', { name: /^all$/i })).toBeInTheDocument();
      // Use getAllByRole since status badges also contain these texts
      const buttons = screen.getAllByRole('button');
      const filterButtons = buttons.slice(0, 4); // First 4 are filter+sort buttons
      expect(filterButtons.some(btn => btn.textContent?.match(/^Success$/i))).toBe(true);
      expect(filterButtons.some(btn => btn.textContent?.match(/^Failed$/i))).toBe(true);
    });

    it('shows all executions by default', () => {
      render(<ExecutionHistoryPanel executions={mockExecutions} />);
      expect(screen.getByText('exec-1')).toBeInTheDocument();
      expect(screen.getByText('exec-2')).toBeInTheDocument();
      expect(screen.getByText('exec-3')).toBeInTheDocument();
    });

    it('filters to show only successful executions', async () => {
      const user = userEvent.setup();
      render(<ExecutionHistoryPanel executions={mockExecutions} />);

      await user.click(screen.getByRole('button', { name: /^success$/i }));

      expect(screen.getByText('exec-1')).toBeInTheDocument();
      expect(screen.queryByText('exec-2')).not.toBeInTheDocument();
      expect(screen.getByText('exec-3')).toBeInTheDocument();
    });

    it('filters to show only failed executions', async () => {
      const user = userEvent.setup();
      render(<ExecutionHistoryPanel executions={mockExecutions} />);

      await user.click(screen.getByRole('button', { name: /^failed$/i }));

      expect(screen.queryByText('exec-1')).not.toBeInTheDocument();
      expect(screen.getByText('exec-2')).toBeInTheDocument();
      expect(screen.queryByText('exec-3')).not.toBeInTheDocument();
    });

    it('can switch back to showing all executions', async () => {
      const user = userEvent.setup();
      render(<ExecutionHistoryPanel executions={mockExecutions} />);

      await user.click(screen.getByRole('button', { name: /^failed$/i }));
      expect(screen.queryByText('exec-1')).not.toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: /^all$/i }));
      expect(screen.getByText('exec-1')).toBeInTheDocument();
      expect(screen.getByText('exec-2')).toBeInTheDocument();
      expect(screen.getByText('exec-3')).toBeInTheDocument();
    });

    it('highlights active filter button', async () => {
      const user = userEvent.setup();
      const { container } = render(<ExecutionHistoryPanel executions={mockExecutions} />);

      // Find the Success filter button (should be the second button)
      const buttons = screen.getAllByRole('button');
      const successButton = buttons.find(btn => btn.textContent === 'Success' && !btn.textContent?.includes('exec'));

      expect(successButton).toBeDefined();
      await user.click(successButton!);

      expect(successButton).toHaveClass('bg-blue-600');
    });
  });

  describe('Sorting', () => {
    it('shows newest executions first by default', () => {
      render(<ExecutionHistoryPanel executions={mockExecutions} />);
      const execIds = screen.getAllByText(/exec-/);
      expect(execIds[0]).toHaveTextContent('exec-1'); // Most recent
      expect(execIds[2]).toHaveTextContent('exec-3'); // Oldest
    });

    it('can sort by oldest first', async () => {
      const user = userEvent.setup();
      render(<ExecutionHistoryPanel executions={mockExecutions} />);

      const sortButton = screen.getByRole('button', { name: /sort/i });
      await user.click(sortButton);

      const execIds = screen.getAllByText(/exec-/);
      expect(execIds[0]).toHaveTextContent('exec-3'); // Oldest
      expect(execIds[2]).toHaveTextContent('exec-1'); // Most recent
    });

    it('can toggle sort order multiple times', async () => {
      const user = userEvent.setup();
      render(<ExecutionHistoryPanel executions={mockExecutions} />);

      const sortButton = screen.getByRole('button', { name: /sort/i });

      // Click once - oldest first
      await user.click(sortButton);
      let execIds = screen.getAllByText(/exec-/);
      expect(execIds[0]).toHaveTextContent('exec-3');

      // Click again - newest first
      await user.click(sortButton);
      execIds = screen.getAllByText(/exec-/);
      expect(execIds[0]).toHaveTextContent('exec-1');
    });
  });

  describe('Execution Click', () => {
    it('calls onExecutionClick when execution is clicked', async () => {
      const user = userEvent.setup();
      const onExecutionClick = vi.fn();

      render(<ExecutionHistoryPanel executions={mockExecutions} onExecutionClick={onExecutionClick} />);

      const execution = screen.getByText('exec-1').closest('button');
      await user.click(execution!);

      expect(onExecutionClick).toHaveBeenCalledWith('exec-1');
    });

    it('does not crash when onExecutionClick is not provided', async () => {
      const user = userEvent.setup();
      render(<ExecutionHistoryPanel executions={mockExecutions} />);

      const execution = screen.getByText('exec-1').closest('button');
      await user.click(execution!);
      // Should not crash
    });
  });

  describe('Empty States', () => {
    it('shows empty state when no executions', () => {
      render(<ExecutionHistoryPanel executions={[]} />);
      expect(screen.getByText(/no executions/i)).toBeInTheDocument();
    });

    it('shows filtered empty state when filter has no results', async () => {
      const successOnly: ExecutionHistoryItem[] = [
        {
          executionId: 'exec-1',
          workflowName: 'test',
          status: 'success',
          startedAt: '2025-11-24T10:00:00Z',
          completedAt: '2025-11-24T10:00:03Z',
          durationMs: 3000,
          inputSnapshot: {},
        },
      ];

      const user = userEvent.setup();
      render(<ExecutionHistoryPanel executions={successOnly} />);

      await user.click(screen.getByRole('button', { name: /^failed$/i }));
      expect(screen.getByText(/no failed executions/i)).toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    it('shows loading spinner when isLoading is true', () => {
      render(<ExecutionHistoryPanel executions={[]} isLoading={true} />);
      expect(screen.getByText(/loading/i)).toBeInTheDocument();
    });

    it('does not show executions when loading', () => {
      render(<ExecutionHistoryPanel executions={mockExecutions} isLoading={true} />);
      expect(screen.queryByText('exec-1')).not.toBeInTheDocument();
    });
  });

  describe('Error Display', () => {
    it('shows error message in failed execution', () => {
      render(<ExecutionHistoryPanel executions={mockExecutions} />);
      expect(screen.getByText('Validation failed')).toBeInTheDocument();
    });

    it('does not show error for successful execution', () => {
      const successOnly: ExecutionHistoryItem[] = [mockExecutions[0]];
      render(<ExecutionHistoryPanel executions={successOnly} />);
      expect(screen.queryByText(/validation failed/i)).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper heading', () => {
      render(<ExecutionHistoryPanel executions={mockExecutions} />);
      expect(screen.getByRole('heading', { name: /execution history/i })).toBeInTheDocument();
    });

    it('execution items are clickable buttons', () => {
      render(<ExecutionHistoryPanel executions={mockExecutions} />);
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(3); // Filter buttons + execution items
    });
  });
});
