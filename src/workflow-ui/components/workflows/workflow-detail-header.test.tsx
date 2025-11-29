import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { WorkflowDetailHeader } from './workflow-detail-header';
import type { WorkflowDetail } from '@/types/workflow';

describe('WorkflowDetailHeader', () => {
  const mockWorkflow: WorkflowDetail = {
    name: 'user-signup',
    namespace: 'production',
    description: 'Simple user registration flow with email verification',
    inputSchema: {
      type: 'object',
      properties: {
        email: { type: 'string' },
        password: { type: 'string' },
      },
      required: ['email', 'password'],
    },
    outputSchema: {
      userId: '{{tasks.create-user.output.id}}',
    },
    tasks: [
      {
        id: 'validate-email',
        taskRef: 'email-validator',
        description: 'Validate email format',
        dependencies: [],
      },
      {
        id: 'create-user',
        taskRef: 'user-service',
        description: 'Create user account',
        dependencies: ['validate-email'],
      },
    ],
    graph: {
      nodes: [],
      edges: [],
      parallelGroups: [],
    },
    endpoints: {
      execute: '/api/v1/workflows/user-signup/execute',
      test: '/api/v1/workflows/user-signup/test',
      details: '/api/v1/workflows/user-signup',
    },
  };

  const mockStats = {
    totalExecutions: 1247,
    successRate: 98.5,
    avgDurationMs: 850,
    lastExecuted: '2025-11-23T10:30:00Z',
  };

  describe('Basic Rendering', () => {
    it('renders workflow name', () => {
      render(<WorkflowDetailHeader workflow={mockWorkflow} stats={mockStats} />);
      expect(screen.getByText('user-signup')).toBeInTheDocument();
    });

    it('renders namespace badge', () => {
      render(<WorkflowDetailHeader workflow={mockWorkflow} stats={mockStats} />);
      expect(screen.getByText('production')).toBeInTheDocument();
    });

    it('renders workflow description', () => {
      render(<WorkflowDetailHeader workflow={mockWorkflow} stats={mockStats} />);
      expect(
        screen.getByText('Simple user registration flow with email verification')
      ).toBeInTheDocument();
    });

    it('renders task count', () => {
      render(<WorkflowDetailHeader workflow={mockWorkflow} stats={mockStats} />);
      expect(screen.getByText(/2 tasks/i)).toBeInTheDocument();
    });
  });

  describe('Statistics Display', () => {
    it('renders success rate', () => {
      render(<WorkflowDetailHeader workflow={mockWorkflow} stats={mockStats} />);
      expect(screen.getByText(/98\.5%/i)).toBeInTheDocument();
    });

    it('renders total executions', () => {
      render(<WorkflowDetailHeader workflow={mockWorkflow} stats={mockStats} />);
      expect(screen.getByText(/1,247/i)).toBeInTheDocument();
    });

    it('renders average duration', () => {
      render(<WorkflowDetailHeader workflow={mockWorkflow} stats={mockStats} />);
      expect(screen.getByText('850ms')).toBeInTheDocument();
    });

    it('formats duration in seconds when over 1000ms', () => {
      const longRunning = { ...mockStats, avgDurationMs: 2500 };
      render(<WorkflowDetailHeader workflow={mockWorkflow} stats={longRunning} />);
      expect(screen.getByText('2.5s')).toBeInTheDocument();
    });

    it('formats duration in minutes and seconds when over 60s', () => {
      const veryLongRunning = { ...mockStats, avgDurationMs: 125000 };
      render(<WorkflowDetailHeader workflow={mockWorkflow} stats={veryLongRunning} />);
      expect(screen.getByText('2m 5s')).toBeInTheDocument();
    });

    it('displays N/A when no executions', () => {
      const noStats = {
        totalExecutions: 0,
        successRate: 0,
        avgDurationMs: 0,
        lastExecuted: undefined,
      };
      render(<WorkflowDetailHeader workflow={mockWorkflow} stats={noStats} />);
      expect(screen.getAllByText(/n\/a/i)).toHaveLength(2); // Success rate and avg duration
    });
  });

  describe('Breadcrumb Navigation', () => {
    it('renders back to workflows link', () => {
      render(<WorkflowDetailHeader workflow={mockWorkflow} stats={mockStats} />);
      const link = screen.getByRole('link', { name: /back to workflows/i });
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute('href', '/');
    });

    it('shows arrow icon in breadcrumb', () => {
      render(<WorkflowDetailHeader workflow={mockWorkflow} stats={mockStats} />);
      expect(screen.getByText('←')).toBeInTheDocument();
    });
  });

  describe('Action Buttons', () => {
    it('renders Execute button', () => {
      render(<WorkflowDetailHeader workflow={mockWorkflow} stats={mockStats} />);
      expect(screen.getByRole('button', { name: /execute/i })).toBeInTheDocument();
    });

    it('renders Test/Dry-run button', () => {
      render(<WorkflowDetailHeader workflow={mockWorkflow} stats={mockStats} />);
      expect(screen.getByRole('button', { name: /test.*dry.*run/i })).toBeInTheDocument();
    });

    it('calls onExecute when Execute button clicked', async () => {
      const user = userEvent.setup();
      const onExecute = vi.fn();

      render(
        <WorkflowDetailHeader workflow={mockWorkflow} stats={mockStats} onExecute={onExecute} />
      );

      await user.click(screen.getByRole('button', { name: /execute/i }));
      expect(onExecute).toHaveBeenCalledTimes(1);
    });

    it('calls onTest when Test button clicked', async () => {
      const user = userEvent.setup();
      const onTest = vi.fn();

      render(<WorkflowDetailHeader workflow={mockWorkflow} stats={mockStats} onTest={onTest} />);

      await user.click(screen.getByRole('button', { name: /test.*dry.*run/i }));
      expect(onTest).toHaveBeenCalledTimes(1);
    });

    it('disables action buttons when loading', () => {
      render(<WorkflowDetailHeader workflow={mockWorkflow} stats={mockStats} isExecuting={true} />);

      expect(screen.getByRole('button', { name: /execut/i })).toBeDisabled();
      expect(screen.getByRole('button', { name: /test.*dry.*run/i })).toBeDisabled();
    });

    it('shows loading text when executing', () => {
      render(<WorkflowDetailHeader workflow={mockWorkflow} stats={mockStats} isExecuting={true} />);

      expect(screen.getByRole('button', { name: /executing/i })).toBeInTheDocument();
    });

    it('shows loading text when testing', () => {
      render(<WorkflowDetailHeader workflow={mockWorkflow} stats={mockStats} isTesting={true} />);

      expect(screen.getByRole('button', { name: /testing/i })).toBeInTheDocument();
    });
  });

  describe('Success Rate Badge Styling', () => {
    it('applies success color for high success rate (≥90%)', () => {
      const { container } = render(
        <WorkflowDetailHeader workflow={mockWorkflow} stats={mockStats} />
      );
      const badge = container.querySelector('.bg-green-100');
      expect(badge).toBeInTheDocument();
    });

    it('applies warning color for medium success rate (70-89%)', () => {
      const mediumStats = { ...mockStats, successRate: 75 };
      const { container } = render(
        <WorkflowDetailHeader workflow={mockWorkflow} stats={mediumStats} />
      );
      const badge = container.querySelector('.bg-yellow-100');
      expect(badge).toBeInTheDocument();
    });

    it('applies error color for low success rate (<70%)', () => {
      const lowStats = { ...mockStats, successRate: 50 };
      const { container } = render(
        <WorkflowDetailHeader workflow={mockWorkflow} stats={lowStats} />
      );
      const badge = container.querySelector('.bg-red-100');
      expect(badge).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper heading hierarchy', () => {
      render(<WorkflowDetailHeader workflow={mockWorkflow} stats={mockStats} />);
      expect(screen.getByRole('heading', { level: 1, name: 'user-signup' })).toBeInTheDocument();
    });

    it('has accessible button labels', () => {
      render(<WorkflowDetailHeader workflow={mockWorkflow} stats={mockStats} />);
      expect(screen.getByRole('button', { name: /execute workflow/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /test.*dry.*run/i })).toBeInTheDocument();
    });

    it('navigation link is keyboard accessible', () => {
      render(<WorkflowDetailHeader workflow={mockWorkflow} stats={mockStats} />);
      const link = screen.getByRole('link', { name: /back to workflows/i });
      expect(link).toHaveAttribute('href');
    });
  });

  describe('Optional Props', () => {
    it('renders without action callbacks', () => {
      render(<WorkflowDetailHeader workflow={mockWorkflow} stats={mockStats} />);
      expect(screen.getByRole('button', { name: /execute/i })).toBeInTheDocument();
    });

    it('renders with minimal stats', () => {
      const minimalStats = {
        totalExecutions: 0,
        successRate: 0,
        avgDurationMs: 0,
      };
      render(<WorkflowDetailHeader workflow={mockWorkflow} stats={minimalStats} />);
      expect(screen.getByText('user-signup')).toBeInTheDocument();
    });
  });
});
