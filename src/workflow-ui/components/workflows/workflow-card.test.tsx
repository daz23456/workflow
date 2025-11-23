import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { WorkflowCard } from './workflow-card';
import type { WorkflowListItem } from '@/types/workflow';

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
      render(<WorkflowCard workflow={mockWorkflow} />);
      expect(screen.getByText('user-signup')).toBeInTheDocument();
    });

    it('renders workflow description', () => {
      render(<WorkflowCard workflow={mockWorkflow} />);
      expect(screen.getByText('Complete user registration flow')).toBeInTheDocument();
    });

    it('renders namespace badge', () => {
      render(<WorkflowCard workflow={mockWorkflow} />);
      expect(screen.getByText('production')).toBeInTheDocument();
    });

    it('renders task count', () => {
      render(<WorkflowCard workflow={mockWorkflow} />);
      expect(screen.getByText(/3 tasks/i)).toBeInTheDocument();
    });

    it('renders success rate with percentage', () => {
      render(<WorkflowCard workflow={mockWorkflow} />);
      expect(screen.getByText(/98.5%/i)).toBeInTheDocument();
    });

    it('renders total executions', () => {
      render(<WorkflowCard workflow={mockWorkflow} />);
      expect(screen.getByText(/1,247/i)).toBeInTheDocument();
    });

    it('renders average duration', () => {
      render(<WorkflowCard workflow={mockWorkflow} />);
      expect(screen.getByText('2.5s')).toBeInTheDocument();
    });
  });

  describe('Success Rate Badge', () => {
    it('renders success variant for high success rate', () => {
      const workflow = { ...mockWorkflow, stats: { ...mockWorkflow.stats, successRate: 95 } };
      const { container } = render(<WorkflowCard workflow={workflow} />);
      const badge = container.querySelector('.bg-green-100');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveTextContent('95.0%');
    });

    it('renders warning variant for medium success rate', () => {
      const workflow = { ...mockWorkflow, stats: { ...mockWorkflow.stats, successRate: 75 } };
      const { container } = render(<WorkflowCard workflow={workflow} />);
      const badge = container.querySelector('.bg-yellow-100');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveTextContent('75.0%');
    });

    it('renders destructive variant for low success rate', () => {
      const workflow = { ...mockWorkflow, stats: { ...mockWorkflow.stats, successRate: 50 } };
      const { container } = render(<WorkflowCard workflow={workflow} />);
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
        lastExecuted: null,
      },
    };

    it('renders "Never executed" text when lastExecuted is null', () => {
      render(<WorkflowCard workflow={neverExecutedWorkflow} />);
      expect(screen.getByText(/never executed/i)).toBeInTheDocument();
    });

    it('shows 0 executions', () => {
      render(<WorkflowCard workflow={neverExecutedWorkflow} />);
      expect(screen.getByText('0')).toBeInTheDocument();
    });

    it('shows N/A for success rate', () => {
      render(<WorkflowCard workflow={neverExecutedWorkflow} />);
      expect(screen.getByText(/n\/a/i)).toBeInTheDocument();
    });
  });

  describe('Click Interaction', () => {
    it('calls onClick with workflow name when clicked', async () => {
      const user = userEvent.setup();
      const onClick = vi.fn();

      render(<WorkflowCard workflow={mockWorkflow} onClick={onClick} />);

      const card = screen.getByRole('article');
      await user.click(card);

      expect(onClick).toHaveBeenCalledTimes(1);
      expect(onClick).toHaveBeenCalledWith('user-signup');
    });

    it('has pointer cursor when onClick is provided', () => {
      const onClick = vi.fn();
      render(<WorkflowCard workflow={mockWorkflow} onClick={onClick} />);

      const card = screen.getByRole('article');
      expect(card).toHaveClass('cursor-pointer');
    });

    it('does not have pointer cursor when onClick is not provided', () => {
      render(<WorkflowCard workflow={mockWorkflow} />);

      const card = screen.getByRole('article');
      expect(card).not.toHaveClass('cursor-pointer');
    });

    it('is keyboard accessible when onClick is provided', async () => {
      const user = userEvent.setup();
      const onClick = vi.fn();

      render(<WorkflowCard workflow={mockWorkflow} onClick={onClick} />);

      const card = screen.getByRole('article');
      card.focus();
      await user.keyboard('{Enter}');

      expect(onClick).toHaveBeenCalledTimes(1);
    });
  });

  describe('Duration Formatting', () => {
    it('formats milliseconds', () => {
      const workflow = { ...mockWorkflow, stats: { ...mockWorkflow.stats, avgDurationMs: 500 } };
      render(<WorkflowCard workflow={workflow} />);
      expect(screen.getByText('500ms')).toBeInTheDocument();
    });

    it('formats seconds', () => {
      const workflow = { ...mockWorkflow, stats: { ...mockWorkflow.stats, avgDurationMs: 3500 } };
      render(<WorkflowCard workflow={workflow} />);
      expect(screen.getByText('3.5s')).toBeInTheDocument();
    });

    it('formats minutes', () => {
      const workflow = { ...mockWorkflow, stats: { ...mockWorkflow.stats, avgDurationMs: 90000 } };
      render(<WorkflowCard workflow={workflow} />);
      expect(screen.getByText('1m 30s')).toBeInTheDocument();
    });
  });

  describe('Number Formatting', () => {
    it('formats large execution counts with commas', () => {
      const workflow = { ...mockWorkflow, stats: { ...mockWorkflow.stats, totalExecutions: 123456 } };
      render(<WorkflowCard workflow={workflow} />);
      expect(screen.getByText(/123,456/i)).toBeInTheDocument();
    });

    it('formats small execution counts without commas', () => {
      const workflow = { ...mockWorkflow, stats: { ...mockWorkflow.stats, totalExecutions: 42 } };
      render(<WorkflowCard workflow={workflow} />);
      expect(screen.getByText('42')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has article role', () => {
      render(<WorkflowCard workflow={mockWorkflow} />);
      expect(screen.getByRole('article')).toBeInTheDocument();
    });

    it('has accessible name from workflow name', () => {
      render(<WorkflowCard workflow={mockWorkflow} />);
      const card = screen.getByRole('article');
      expect(card).toHaveAccessibleName('user-signup');
    });

    it('is focusable when clickable', () => {
      const onClick = vi.fn();
      render(<WorkflowCard workflow={mockWorkflow} onClick={onClick} />);

      const card = screen.getByRole('article');
      expect(card).toHaveAttribute('tabIndex', '0');
    });
  });
});
