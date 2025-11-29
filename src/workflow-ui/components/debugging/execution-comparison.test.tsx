import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ExecutionComparison } from './execution-comparison';

describe('ExecutionComparison', () => {
  const mockExecution1 = {
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
        input: { userId: '123' },
        output: { id: '123', name: 'John Doe', email: 'john@example.com' },
        duration: '00:00:02',
      },
      {
        taskId: 'task2',
        taskName: 'send-email',
        status: 'Succeeded',
        input: { to: 'john@example.com', subject: 'Welcome' },
        output: { messageId: 'msg-456' },
        duration: '00:00:03',
      },
    ],
  };

  const mockExecution2 = {
    id: 'exec-2',
    workflowName: 'test-workflow',
    status: 'Failed',
    startedAt: '2025-01-01T09:00:00Z',
    completedAt: '2025-01-01T09:00:08Z',
    duration: '00:00:08',
    tasks: [
      {
        taskId: 'task1',
        taskName: 'fetch-user',
        status: 'Succeeded',
        input: { userId: '456' },
        output: { id: '456', name: 'Jane Doe', email: 'jane@example.com' },
        duration: '00:00:02',
      },
      {
        taskId: 'task2',
        taskName: 'send-email',
        status: 'Failed',
        input: { to: 'jane@example.com', subject: 'Welcome' },
        output: null,
        error: 'SMTP connection failed',
        duration: '00:00:06',
      },
    ],
  };

  it('should render comparison container', () => {
    render(<ExecutionComparison execution1={mockExecution1} execution2={mockExecution2} />);

    const comparison = screen.getByRole('region', { name: /execution comparison/i });
    expect(comparison).toBeInTheDocument();
  });

  it('should display both execution headers side by side', () => {
    render(<ExecutionComparison execution1={mockExecution1} execution2={mockExecution2} />);

    expect(screen.getByText('exec-1')).toBeInTheDocument();
    expect(screen.getByText('exec-2')).toBeInTheDocument();
  });

  it('should highlight status differences', () => {
    const { container } = render(
      <ExecutionComparison execution1={mockExecution1} execution2={mockExecution2} />
    );

    // Execution 1 succeeded, execution 2 failed
    const statusElements = container.querySelectorAll('[data-field="status"]');
    expect(statusElements.length).toBe(2);
  });

  it('should show duration comparison', () => {
    render(<ExecutionComparison execution1={mockExecution1} execution2={mockExecution2} />);

    expect(screen.getByText(/00:00:05/)).toBeInTheDocument(); // exec-1 duration
    expect(screen.getByText(/00:00:08/)).toBeInTheDocument(); // exec-2 duration
  });

  it('should compare task-level results', () => {
    render(<ExecutionComparison execution1={mockExecution1} execution2={mockExecution2} />);

    // Tasks appear in both left and right panels
    const fetchUserTasks = screen.getAllByText(/fetch-user/i);
    const sendEmailTasks = screen.getAllByText(/send-email/i);

    expect(fetchUserTasks.length).toBe(2); // One in each panel
    expect(sendEmailTasks.length).toBe(2); // One in each panel
  });

  it('should highlight task output differences', () => {
    const { container } = render(
      <ExecutionComparison execution1={mockExecution1} execution2={mockExecution2} />
    );

    // Task outputs are different (john@example.com vs jane@example.com)
    const diffElements = container.querySelectorAll('[data-diff="true"]');
    expect(diffElements.length).toBeGreaterThan(0);
  });

  it('should show task status differences', () => {
    render(<ExecutionComparison execution1={mockExecution1} execution2={mockExecution2} />);

    // task2 succeeded in exec-1, failed in exec-2
    const succeededBadges = screen.getAllByText('Succeeded');
    const failedBadges = screen.getAllByText('Failed');

    expect(succeededBadges.length).toBeGreaterThan(0);
    expect(failedBadges.length).toBeGreaterThan(0);
  });

  it('should support diff view toggle', async () => {
    const user = userEvent.setup();
    render(<ExecutionComparison execution1={mockExecution1} execution2={mockExecution2} />);

    const diffToggle = screen.getByRole('button', { name: /show only differences/i });
    expect(diffToggle).toBeInTheDocument();

    await user.click(diffToggle);

    // After clicking, should only show differences
    expect(screen.getByRole('button', { name: /show all/i })).toBeInTheDocument();
  });

  it('should handle identical executions', () => {
    render(<ExecutionComparison execution1={mockExecution1} execution2={mockExecution1} />);

    expect(screen.getByText(/no differences found/i)).toBeInTheDocument();
  });

  it('should show task input differences', () => {
    const { container } = render(
      <ExecutionComparison execution1={mockExecution1} execution2={mockExecution2} />
    );

    // Different user IDs should appear in the input JSON
    const preElements = container.querySelectorAll('pre');
    const hasUserId123 = Array.from(preElements).some((pre) => pre.textContent?.includes('123'));
    const hasUserId456 = Array.from(preElements).some((pre) => pre.textContent?.includes('456'));

    expect(hasUserId123).toBe(true);
    expect(hasUserId456).toBe(true);
  });

  it('should display error information for failed tasks', () => {
    render(<ExecutionComparison execution1={mockExecution1} execution2={mockExecution2} />);

    // exec-2 task2 failed with error
    expect(screen.getByText(/SMTP connection failed/i)).toBeInTheDocument();
  });

  it('should support swapping executions', async () => {
    const user = userEvent.setup();
    render(<ExecutionComparison execution1={mockExecution1} execution2={mockExecution2} />);

    const swapButton = screen.getByRole('button', { name: /swap/i });
    await user.click(swapButton);

    // After swapping, exec-2 should be on the left, exec-1 on the right
    const containers = screen.getAllByRole('article');
    expect(containers[0]).toHaveTextContent('exec-2');
    expect(containers[1]).toHaveTextContent('exec-1');
  });
});
