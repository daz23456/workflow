import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WorkflowCard } from './workflow-card';
import type { WorkflowListItem } from '@/types/workflow';

function renderWithQuery(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe('WorkflowCard', () => {
  const mockWorkflow: WorkflowListItem = {
    name: 'user-signup',
    namespace: 'production',
    description: 'Complete user registration flow',
    taskCount: 3,
    endpoint: '/api/v1/workflows/user-signup/execute',
    inputSchemaPreview: '{ email, password }',
    stats: {
      totalExecutions: 1247,
      successRate: 98.5,
      avgDurationMs: 2500,
      lastExecuted: '2025-11-23T10:30:00Z',
    },
  };

  describe('Rendering', () => {
    it('renders workflow name', () => {
      renderWithQuery(<WorkflowCard workflow={mockWorkflow} />);
      expect(screen.getByText('user-signup')).toBeInTheDocument();
    });

    it('renders workflow description', () => {
      renderWithQuery(<WorkflowCard workflow={mockWorkflow} />);
      expect(screen.getByText('Complete user registration flow')).toBeInTheDocument();
    });

    it('renders namespace badge', () => {
      renderWithQuery(<WorkflowCard workflow={mockWorkflow} />);
      expect(screen.getByText('production')).toBeInTheDocument();
    });

    it('renders task count', () => {
      renderWithQuery(<WorkflowCard workflow={mockWorkflow} />);
      expect(screen.getByText(/3 tasks/i)).toBeInTheDocument();
    });

    it('renders success rate with percentage', () => {
      renderWithQuery(<WorkflowCard workflow={mockWorkflow} />);
      expect(screen.getByText(/98.5%/i)).toBeInTheDocument();
    });

    it('renders total executions', () => {
      renderWithQuery(<WorkflowCard workflow={mockWorkflow} />);
      expect(screen.getByText(/1,247/i)).toBeInTheDocument();
    });

    it('renders average duration', () => {
      renderWithQuery(<WorkflowCard workflow={mockWorkflow} />);
      expect(screen.getByText('2.5s')).toBeInTheDocument();
    });
  });

  describe('Success Rate Badge', () => {
    it('renders success variant for high success rate', () => {
      const workflow = { ...mockWorkflow, stats: { ...mockWorkflow.stats, successRate: 95 } };
      const { container } = renderWithQuery(<WorkflowCard workflow={workflow} />);
      const badge = container.querySelector('.bg-green-100');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveTextContent('95.0%');
    });

    it('renders warning variant for medium success rate', () => {
      const workflow = { ...mockWorkflow, stats: { ...mockWorkflow.stats, successRate: 75 } };
      const { container } = renderWithQuery(<WorkflowCard workflow={workflow} />);
      const badge = container.querySelector('.bg-yellow-100');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveTextContent('75.0%');
    });

    it('renders destructive variant for low success rate', () => {
      const workflow = { ...mockWorkflow, stats: { ...mockWorkflow.stats, successRate: 50 } };
      const { container } = renderWithQuery(<WorkflowCard workflow={workflow} />);
      const badge = container.querySelector('.bg-red-100');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveTextContent('50.0%');
    });
  });

  describe('Never Executed State', () => {
    const neverExecutedWorkflow: WorkflowListItem = {
      ...mockWorkflow,
      stats: {
        totalExecutions: 0,
        successRate: 0,
        avgDurationMs: 0,
        lastExecuted: undefined,
      },
    };

    it('renders "Never executed" text when lastExecuted is undefined', () => {
      renderWithQuery(<WorkflowCard workflow={neverExecutedWorkflow} />);
      expect(screen.getByText(/never executed/i)).toBeInTheDocument();
    });

    it('shows 0 executions', () => {
      renderWithQuery(<WorkflowCard workflow={neverExecutedWorkflow} />);
      expect(screen.getByText('0')).toBeInTheDocument();
    });

    it('shows N/A for success rate', () => {
      renderWithQuery(<WorkflowCard workflow={neverExecutedWorkflow} />);
      expect(screen.getByText(/n\/a/i)).toBeInTheDocument();
    });
  });

  describe('Click Interaction', () => {
    it('calls onClick with workflow name when clicked', async () => {
      const user = userEvent.setup();
      const onClick = vi.fn();

      renderWithQuery(<WorkflowCard workflow={mockWorkflow} onClick={onClick} />);

      const card = screen.getByRole('article');
      await user.click(card);

      expect(onClick).toHaveBeenCalledTimes(1);
      expect(onClick).toHaveBeenCalledWith('user-signup');
    });

    it('has pointer cursor when onClick is provided', () => {
      const onClick = vi.fn();
      renderWithQuery(<WorkflowCard workflow={mockWorkflow} onClick={onClick} />);

      const card = screen.getByRole('article');
      expect(card).toHaveClass('cursor-pointer');
    });

    it('does not have pointer cursor when onClick is not provided', () => {
      renderWithQuery(<WorkflowCard workflow={mockWorkflow} />);

      const card = screen.getByRole('article');
      expect(card).not.toHaveClass('cursor-pointer');
    });

    it('is keyboard accessible when onClick is provided', async () => {
      const user = userEvent.setup();
      const onClick = vi.fn();

      renderWithQuery(<WorkflowCard workflow={mockWorkflow} onClick={onClick} />);

      const card = screen.getByRole('article');
      card.focus();
      await user.keyboard('{Enter}');

      expect(onClick).toHaveBeenCalledTimes(1);
    });
  });

  describe('Duration Formatting', () => {
    it('formats milliseconds', () => {
      const workflow = { ...mockWorkflow, stats: { ...mockWorkflow.stats, avgDurationMs: 500 } };
      renderWithQuery(<WorkflowCard workflow={workflow} />);
      expect(screen.getByText('500ms')).toBeInTheDocument();
    });

    it('formats seconds', () => {
      const workflow = { ...mockWorkflow, stats: { ...mockWorkflow.stats, avgDurationMs: 3500 } };
      renderWithQuery(<WorkflowCard workflow={workflow} />);
      expect(screen.getByText('3.5s')).toBeInTheDocument();
    });

    it('formats minutes', () => {
      const workflow = { ...mockWorkflow, stats: { ...mockWorkflow.stats, avgDurationMs: 90000 } };
      renderWithQuery(<WorkflowCard workflow={workflow} />);
      expect(screen.getByText('1m 30s')).toBeInTheDocument();
    });
  });

  describe('Number Formatting', () => {
    it('formats large execution counts with commas', () => {
      const workflow = { ...mockWorkflow, stats: { ...mockWorkflow.stats, totalExecutions: 123456 } };
      renderWithQuery(<WorkflowCard workflow={workflow} />);
      expect(screen.getByText(/123,456/i)).toBeInTheDocument();
    });

    it('formats small execution counts without commas', () => {
      const workflow = { ...mockWorkflow, stats: { ...mockWorkflow.stats, totalExecutions: 42 } };
      renderWithQuery(<WorkflowCard workflow={workflow} />);
      expect(screen.getByText('42')).toBeInTheDocument();
    });
  });

  describe('Success Rate Trend', () => {
    it('displays upward trend with arrow', () => {
      const workflow = { ...mockWorkflow, stats: { ...mockWorkflow.stats, successRateTrend: 2.3 } };
      renderWithQuery(<WorkflowCard workflow={workflow} />);

      expect(screen.getByText(/↑/)).toBeInTheDocument();
      expect(screen.getByText(/2.3%/)).toBeInTheDocument();
    });

    it('displays downward trend with arrow', () => {
      const workflow = { ...mockWorkflow, stats: { ...mockWorkflow.stats, successRateTrend: -1.5 } };
      renderWithQuery(<WorkflowCard workflow={workflow} />);

      expect(screen.getByText(/↓/)).toBeInTheDocument();
      expect(screen.getByText(/1.5%/)).toBeInTheDocument();
    });

    it('applies green color for upward trend', () => {
      const workflow = { ...mockWorkflow, stats: { ...mockWorkflow.stats, successRateTrend: 2.3 } };
      const { container } = renderWithQuery(<WorkflowCard workflow={workflow} />);

      const trendElement = container.querySelector('.text-green-600');
      expect(trendElement).toBeInTheDocument();
      expect(trendElement).toHaveTextContent('↑ 2.3%');
    });

    it('applies red color for downward trend', () => {
      const workflow = { ...mockWorkflow, stats: { ...mockWorkflow.stats, successRateTrend: -1.5 } };
      const { container } = renderWithQuery(<WorkflowCard workflow={workflow} />);

      const trendElement = container.querySelector('.text-red-600');
      expect(trendElement).toBeInTheDocument();
      expect(trendElement).toHaveTextContent('↓ 1.5%');
    });

    it('does not display trend when not provided', () => {
      const workflow = { ...mockWorkflow, stats: { ...mockWorkflow.stats, successRateTrend: undefined } };
      const { container } = renderWithQuery(<WorkflowCard workflow={workflow} />);

      const trendElement = container.querySelector('.text-green-600, .text-red-600');
      expect(trendElement).not.toBeInTheDocument();
    });

    it('does not display trend for never executed workflows', () => {
      const neverExecutedWorkflow: WorkflowListItem = {
        ...mockWorkflow,
        stats: {
          totalExecutions: 0,
          successRate: 0,
          avgDurationMs: 0,
          lastExecuted: undefined,
          successRateTrend: 5.0, // Even if trend is provided
        },
      };
      const { container } = renderWithQuery(<WorkflowCard workflow={neverExecutedWorkflow} />);

      const trendElement = container.querySelector('.text-green-600, .text-red-600');
      expect(trendElement).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has article role', () => {
      renderWithQuery(<WorkflowCard workflow={mockWorkflow} />);
      expect(screen.getByRole('article')).toBeInTheDocument();
    });

    it('has accessible name from workflow name', () => {
      renderWithQuery(<WorkflowCard workflow={mockWorkflow} />);
      const card = screen.getByRole('article');
      expect(card).toHaveAccessibleName('user-signup');
    });

    it('is focusable when clickable', () => {
      const onClick = vi.fn();
      renderWithQuery(<WorkflowCard workflow={mockWorkflow} onClick={onClick} />);

      const card = screen.getByRole('article');
      expect(card).toHaveAttribute('tabIndex', '0');
    });
  });
});
