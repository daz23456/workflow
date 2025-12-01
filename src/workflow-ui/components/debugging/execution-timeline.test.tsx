import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ExecutionTimeline } from './execution-timeline';

describe('ExecutionTimeline', () => {
  const mockExecutionEvents = [
    {
      id: '1',
      type: 'workflow_started' as const,
      timestamp: '2025-01-01T10:00:00Z',
      workflowName: 'test-workflow',
    },
    {
      id: '2',
      type: 'task_started' as const,
      timestamp: '2025-01-01T10:00:01Z',
      taskId: 'task1',
      taskName: 'fetch-user',
    },
    {
      id: '3',
      type: 'task_completed' as const,
      timestamp: '2025-01-01T10:00:03Z',
      taskId: 'task1',
      taskName: 'fetch-user',
      status: 'Succeeded' as const,
    },
    {
      id: '4',
      type: 'workflow_completed' as const,
      timestamp: '2025-01-01T10:00:05Z',
      workflowName: 'test-workflow',
      status: 'Succeeded' as const,
    },
  ];

  it('should render timeline container', () => {
    render(<ExecutionTimeline events={mockExecutionEvents} />);

    const timeline = screen.getByRole('region', { name: /execution timeline/i });
    expect(timeline).toBeInTheDocument();
  });

  it('should render all execution events', () => {
    render(<ExecutionTimeline events={mockExecutionEvents} />);

    // Component renders event labels like "Workflow Started", "Task Started: fetch-user"
    expect(screen.getByText(/Workflow Started/i)).toBeInTheDocument();
    expect(screen.getByText(/Task Started.*fetch-user/i)).toBeInTheDocument();
    expect(screen.getByText(/Task Completed.*fetch-user/i)).toBeInTheDocument();
    expect(screen.getByText(/Workflow Completed/i)).toBeInTheDocument();
  });

  it('should display event timestamps', () => {
    render(<ExecutionTimeline events={mockExecutionEvents} />);

    // Should show relative times or formatted timestamps
    const timestamps = screen.getAllByText(/10:00:0/);
    expect(timestamps.length).toBeGreaterThan(0);
  });

  it('should render timeline scrubber', () => {
    render(<ExecutionTimeline events={mockExecutionEvents} />);

    const scrubber = screen.getByRole('slider', { name: /timeline scrubber/i });
    expect(scrubber).toBeInTheDocument();
  });

  it('should show current time indicator', () => {
    render(<ExecutionTimeline events={mockExecutionEvents} />);

    const currentTime = screen.getByText(/current:/i);
    expect(currentTime).toBeInTheDocument();
  });

  it('should call onTimeChange when scrubber moves', () => {
    const onTimeChange = vi.fn();
    render(<ExecutionTimeline events={mockExecutionEvents} onTimeChange={onTimeChange} />);

    const scrubber = screen.getByRole('slider', { name: /timeline scrubber/i }) as HTMLInputElement;

    // Simulate scrubber change
    fireEvent.change(scrubber, { target: { value: '2' } });

    expect(onTimeChange).toHaveBeenCalled();
  });

  it('should handle empty events array', () => {
    render(<ExecutionTimeline events={[]} />);

    expect(screen.getByText(/no execution events/i)).toBeInTheDocument();
  });

  it('should display total execution duration', () => {
    render(<ExecutionTimeline events={mockExecutionEvents} />);

    // Duration from first to last event: 5 seconds (formatted as 5.000s)
    expect(screen.getByText(/duration:\s*5\.000s/i)).toBeInTheDocument();
  });

  it('should highlight events by type with different colors', () => {
    const { container } = render(<ExecutionTimeline events={mockExecutionEvents} />);

    // Workflow events have blue styling, task events have green styling
    const blueEvents = container.querySelectorAll('.bg-blue-100, .bg-blue-50');
    const greenEvents = container.querySelectorAll('.bg-green-100, .bg-green-50');

    expect(blueEvents.length).toBeGreaterThanOrEqual(2); // workflow_started, workflow_completed
    expect(greenEvents.length).toBeGreaterThanOrEqual(2); // task_started, task_completed
  });

  it('should show event details including task info', () => {
    render(<ExecutionTimeline events={mockExecutionEvents} />);

    // Task event labels include task name
    expect(screen.getByText(/Task Started.*fetch-user/i)).toBeInTheDocument();
    // Task IDs are shown below event labels
    expect(screen.getByText(/ID: task1/i)).toBeInTheDocument();
  });

  it('should support keyboard navigation', async () => {
    const user = userEvent.setup();
    const onTimeChange = vi.fn();
    render(<ExecutionTimeline events={mockExecutionEvents} onTimeChange={onTimeChange} />);

    const scrubber = screen.getByRole('slider');
    scrubber.focus();

    // Arrow right should advance time
    await user.keyboard('{ArrowRight}');
    expect(onTimeChange).toHaveBeenCalled();

    // Arrow left should rewind time
    await user.keyboard('{ArrowLeft}');
    expect(onTimeChange).toHaveBeenCalledTimes(2);
  });

  it('should jump to event when clicked', async () => {
    const user = userEvent.setup();
    const onTimeChange = vi.fn();
    render(<ExecutionTimeline events={mockExecutionEvents} onTimeChange={onTimeChange} />);

    // Click on the second event (Task Started)
    const taskEvent = screen.getByText(/Task Started.*fetch-user/i);
    await user.click(taskEvent);

    // Should set current time to task_started timestamp
    expect(onTimeChange).toHaveBeenCalledWith('2025-01-01T10:00:01Z');
  });
});
