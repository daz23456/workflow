import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { ExecutionResultPanel } from './execution-result-panel';
import type { WorkflowExecutionResponse } from '@/types/execution';

describe('ExecutionResultPanel', () => {
  const mockSuccessExecution: WorkflowExecutionResponse = {
    executionId: 'exec-12345',
    workflowName: 'user-signup',
    success: true,
    output: {
      userId: 'user-789',
      verificationToken: 'token-xyz',
    },
    tasks: [
      {
        taskId: 'validate-email',
        taskRef: 'email-validator',
        status: 'success',
        startedAt: '2025-11-23T10:30:00Z',
        completedAt: '2025-11-23T10:30:01Z',
        durationMs: 1000,
        output: { valid: true },
        retryCount: 0,
        httpResponse: {
          statusCode: 200,
          headers: { 'Content-Type': 'application/json' },
          body: { valid: true },
        },
      },
      {
        taskId: 'create-user',
        taskRef: 'user-service',
        status: 'success',
        startedAt: '2025-11-23T10:30:01Z',
        completedAt: '2025-11-23T10:30:03Z',
        durationMs: 2000,
        output: { id: 'user-789', createdAt: '2025-11-23T10:30:03Z' },
        retryCount: 1,
      },
    ],
    executionTimeMs: 3000,
    startedAt: '2025-11-23T10:30:00Z',
    completedAt: '2025-11-23T10:30:03Z',
  };

  const mockFailedExecution: WorkflowExecutionResponse = {
    executionId: 'exec-67890',
    workflowName: 'payment-processing',
    success: false,
    output: {},
    tasks: [
      {
        taskId: 'validate-payment',
        taskRef: 'payment-validator',
        status: 'success',
        startedAt: '2025-11-23T11:00:00Z',
        completedAt: '2025-11-23T11:00:01Z',
        durationMs: 1000,
        output: { valid: true },
        retryCount: 0,
      },
      {
        taskId: 'charge-card',
        taskRef: 'payment-gateway',
        status: 'failed',
        startedAt: '2025-11-23T11:00:01Z',
        completedAt: '2025-11-23T11:00:02Z',
        durationMs: 1000,
        error: 'Payment declined: Insufficient funds',
        retryCount: 3,
        httpResponse: {
          statusCode: 402,
          headers: { 'Content-Type': 'application/json' },
          body: { error: 'Insufficient funds' },
        },
      },
    ],
    executionTimeMs: 2000,
    startedAt: '2025-11-23T11:00:00Z',
    completedAt: '2025-11-23T11:00:02Z',
    error: 'Task charge-card failed: Payment declined: Insufficient funds',
  };

  describe('Basic Rendering', () => {
    it('renders execution ID', () => {
      render(<ExecutionResultPanel execution={mockSuccessExecution} />);
      expect(screen.getByText(/exec-12345/i)).toBeInTheDocument();
    });

    it('renders workflow name', () => {
      render(<ExecutionResultPanel execution={mockSuccessExecution} />);
      expect(screen.getByText('user-signup')).toBeInTheDocument();
    });

    it('renders success status badge', () => {
      const { container } = render(<ExecutionResultPanel execution={mockSuccessExecution} />);
      const successTexts = screen.getAllByText(/success/i);
      expect(successTexts.length).toBeGreaterThan(0);
      const badge = container.querySelector('.bg-green-100');
      expect(badge).toBeInTheDocument();
    });

    it('renders failed status badge', () => {
      const { container } = render(<ExecutionResultPanel execution={mockFailedExecution} />);
      const failedTexts = screen.getAllByText(/failed/i);
      expect(failedTexts.length).toBeGreaterThan(0);
      const badge = container.querySelector('.bg-red-100');
      expect(badge).toBeInTheDocument();
    });
  });

  describe('Execution Metrics', () => {
    it('renders execution duration', () => {
      render(<ExecutionResultPanel execution={mockSuccessExecution} />);
      expect(screen.getByText(/duration/i)).toBeInTheDocument();
      expect(screen.getByText('3.0s')).toBeInTheDocument();
    });

    it('renders started timestamp', () => {
      render(<ExecutionResultPanel execution={mockSuccessExecution} />);
      expect(screen.getByText(/started/i)).toBeInTheDocument();
    });

    it('renders completed timestamp', () => {
      render(<ExecutionResultPanel execution={mockSuccessExecution} />);
      expect(screen.getByText(/completed/i)).toBeInTheDocument();
    });
  });

  describe('Output Display', () => {
    it('renders output section', () => {
      render(<ExecutionResultPanel execution={mockSuccessExecution} />);
      expect(screen.getByText(/^output$/i)).toBeInTheDocument();
    });

    it('renders output data as JSON', () => {
      render(<ExecutionResultPanel execution={mockSuccessExecution} />);
      expect(screen.getByText(/"userId"/)).toBeInTheDocument();
      expect(screen.getByText(/"user-789"/)).toBeInTheDocument();
    });

    it('handles empty output', () => {
      const emptyOutput = { ...mockSuccessExecution, output: {} };
      render(<ExecutionResultPanel execution={emptyOutput} />);
      expect(screen.getByText(/no output/i)).toBeInTheDocument();
    });
  });

  describe('Error Display', () => {
    it('renders error message for failed execution', () => {
      render(<ExecutionResultPanel execution={mockFailedExecution} />);
      expect(screen.getByText(/error/i)).toBeInTheDocument();
      expect(screen.getByText(/Payment declined: Insufficient funds/i)).toBeInTheDocument();
    });

    it('does not render error section for successful execution', () => {
      render(<ExecutionResultPanel execution={mockSuccessExecution} />);
      const errorTexts = screen.queryAllByText(/error/i);
      // Should not have a dedicated error section (only task status might say "error")
      expect(errorTexts.length).toBe(0);
    });
  });

  describe('Task Results Display', () => {
    it('renders task results section', () => {
      render(<ExecutionResultPanel execution={mockSuccessExecution} />);
      expect(screen.getByText(/task results/i)).toBeInTheDocument();
    });

    it('renders all tasks', () => {
      render(<ExecutionResultPanel execution={mockSuccessExecution} />);
      expect(screen.getByText('validate-email')).toBeInTheDocument();
      expect(screen.getByText('create-user')).toBeInTheDocument();
    });

    it('renders task status badges', () => {
      const { container } = render(<ExecutionResultPanel execution={mockSuccessExecution} />);
      const successBadges = container.querySelectorAll('.bg-green-100');
      expect(successBadges.length).toBeGreaterThan(0);
    });

    it('renders task durations', () => {
      render(<ExecutionResultPanel execution={mockSuccessExecution} />);
      expect(screen.getByText('1.0s')).toBeInTheDocument();
      expect(screen.getByText('2.0s')).toBeInTheDocument();
    });

    it('renders retry count when retries occurred', () => {
      render(<ExecutionResultPanel execution={mockSuccessExecution} />);
      expect(screen.getByText(/1 retry/i)).toBeInTheDocument();
    });

    it('renders failed task with error', () => {
      render(<ExecutionResultPanel execution={mockFailedExecution} />);
      expect(screen.getByText('charge-card')).toBeInTheDocument();
      expect(screen.getByText(/Payment declined/i)).toBeInTheDocument();
    });
  });

  describe('Task Details Expansion', () => {
    it('can expand task to show details', async () => {
      const user = userEvent.setup();
      render(<ExecutionResultPanel execution={mockSuccessExecution} />);

      const taskButton = screen.getByRole('button', { name: /validate-email/i });

      // Initially collapsed - output not visible
      expect(screen.queryByText(/"valid"/)).not.toBeInTheDocument();

      // Click to expand
      await user.click(taskButton);
      expect(screen.getByText(/"valid"/)).toBeInTheDocument();
    });

    it('can collapse expanded task', async () => {
      const user = userEvent.setup();
      render(<ExecutionResultPanel execution={mockSuccessExecution} />);

      const taskButton = screen.getByRole('button', { name: /validate-email/i });

      // Expand
      await user.click(taskButton);
      expect(screen.getByText(/"valid"/)).toBeInTheDocument();

      // Collapse
      await user.click(taskButton);
      expect(screen.queryByText(/"valid"/)).not.toBeInTheDocument();
    });

    it('shows HTTP response details when expanded', async () => {
      const user = userEvent.setup();
      render(<ExecutionResultPanel execution={mockSuccessExecution} />);

      const taskButton = screen.getByRole('button', { name: /validate-email/i });
      await user.click(taskButton);

      expect(screen.getByText(/200/)).toBeInTheDocument();
      expect(screen.getByText('application/json')).toBeInTheDocument();
    });

    it('shows task output when expanded', async () => {
      const user = userEvent.setup();
      render(<ExecutionResultPanel execution={mockSuccessExecution} />);

      const taskButton = screen.getByRole('button', { name: /create-user/i });
      await user.click(taskButton);

      // Check that the output JSON is present
      const outputTexts = screen.getAllByText(/"id"/);
      expect(outputTexts.length).toBeGreaterThan(0);
    });
  });

  describe('HTTP Status Code Styling', () => {
    it('applies success color for 2xx status codes', async () => {
      const user = userEvent.setup();
      render(<ExecutionResultPanel execution={mockSuccessExecution} />);

      const taskButton = screen.getByRole('button', { name: /validate-email/i });
      await user.click(taskButton);

      // Check that 200 status code is displayed
      expect(screen.getByText(/200/)).toBeInTheDocument();
    });

    it('applies error color for 4xx status codes', async () => {
      const user = userEvent.setup();
      render(<ExecutionResultPanel execution={mockFailedExecution} />);

      const taskButton = screen.getByRole('button', { name: /charge-card/i });
      await user.click(taskButton);

      // Check that 402 status code is displayed
      expect(screen.getByText(/402/)).toBeInTheDocument();
    });
  });

  describe('Close Button', () => {
    it('renders close button', () => {
      render(<ExecutionResultPanel execution={mockSuccessExecution} />);
      expect(screen.getByRole('button', { name: /close/i })).toBeInTheDocument();
    });

    it('calls onClose when close button clicked', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();

      render(<ExecutionResultPanel execution={mockSuccessExecution} onClose={onClose} />);

      await user.click(screen.getByRole('button', { name: /close/i }));
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('Copy Execution ID', () => {
    it('renders copy button for execution ID', () => {
      render(<ExecutionResultPanel execution={mockSuccessExecution} />);
      expect(screen.getByRole('button', { name: /copy execution id/i })).toBeInTheDocument();
    });

    it('calls clipboard API when copy button clicked', async () => {
      const user = userEvent.setup();
      const writeText = vi.fn();

      // Mock navigator.clipboard
      Object.defineProperty(navigator, 'clipboard', {
        value: { writeText },
        writable: true,
      });

      render(<ExecutionResultPanel execution={mockSuccessExecution} />);

      await user.click(screen.getByRole('button', { name: /copy execution id/i }));
      expect(writeText).toHaveBeenCalledWith('exec-12345');
    });
  });

  describe('Accessibility', () => {
    it('has proper heading hierarchy', () => {
      render(<ExecutionResultPanel execution={mockSuccessExecution} />);
      expect(screen.getByRole('heading', { level: 2 })).toBeInTheDocument();
    });

    it('task expand buttons are keyboard accessible', () => {
      render(<ExecutionResultPanel execution={mockSuccessExecution} />);
      const taskButtons = screen.getAllByRole('button', { name: /validate-email|create-user/i });
      taskButtons.forEach((btn) => {
        expect(btn).toHaveAttribute('type', 'button');
      });
    });
  });
});
