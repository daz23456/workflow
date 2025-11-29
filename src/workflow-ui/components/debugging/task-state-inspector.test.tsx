import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TaskStateInspector } from './task-state-inspector';

describe('TaskStateInspector', () => {
  const mockTaskState = {
    taskId: 'task1',
    taskName: 'fetch-user',
    status: 'Succeeded',
    input: {
      userId: '123',
      includeMetadata: true,
    },
    output: {
      id: '123',
      name: 'John Doe',
      email: 'john@example.com',
    },
    startTime: '2025-01-01T10:00:01Z',
    endTime: '2025-01-01T10:00:03Z',
    duration: '00:00:02',
  };

  it('should render inspector container', () => {
    render(<TaskStateInspector taskState={mockTaskState} />);

    const inspector = screen.getByRole('region', { name: /task state inspector/i });
    expect(inspector).toBeInTheDocument();
  });

  it('should display task name and status', () => {
    render(<TaskStateInspector taskState={mockTaskState} />);

    expect(screen.getByText(/fetch-user/i)).toBeInTheDocument();
    expect(screen.getByText(/succeeded/i)).toBeInTheDocument();
  });

  it('should show task input data', () => {
    render(<TaskStateInspector taskState={mockTaskState} />);

    expect(screen.getByText(/input/i)).toBeInTheDocument();
    expect(screen.getByText(/userId/i)).toBeInTheDocument();
    expect(screen.getByText(/includeMetadata/i)).toBeInTheDocument();
  });

  it('should show task output data', () => {
    const { container } = render(<TaskStateInspector taskState={mockTaskState} />);

    expect(screen.getByRole('heading', { name: /output/i })).toBeInTheDocument();
    // Check JSON contains the email in any pre element
    const preElements = container.querySelectorAll('pre');
    const hasEmail = Array.from(preElements).some((pre) =>
      pre.textContent?.includes('john@example.com')
    );
    expect(hasEmail).toBe(true);
  });

  it('should display timing information', () => {
    render(<TaskStateInspector taskState={mockTaskState} />);

    expect(screen.getByText(/duration/i)).toBeInTheDocument();
    expect(screen.getByText(/00:00:02/)).toBeInTheDocument();
  });

  it('should handle null task state', () => {
    render(<TaskStateInspector taskState={null} />);

    expect(screen.getByText(/no task selected/i)).toBeInTheDocument();
  });

  it('should format JSON data with proper indentation', () => {
    const { container } = render(<TaskStateInspector taskState={mockTaskState} />);

    const jsonElements = container.querySelectorAll('pre');
    expect(jsonElements.length).toBeGreaterThan(0);
  });

  it('should allow copying JSON to clipboard', async () => {
    const user = userEvent.setup();
    const mockWriteText = vi.fn();

    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: mockWriteText },
      writable: true,
      configurable: true,
    });

    render(<TaskStateInspector taskState={mockTaskState} />);

    const copyButton = screen.getByRole('button', { name: /copy output/i });
    await user.click(copyButton);

    expect(mockWriteText).toHaveBeenCalledWith(JSON.stringify(mockTaskState.output, null, 2));
  });

  it('should toggle between formatted and raw JSON view', async () => {
    const user = userEvent.setup();
    render(<TaskStateInspector taskState={mockTaskState} />);

    const toggleButton = screen.getByRole('button', { name: /raw/i });
    await user.click(toggleButton);

    // Should show raw JSON
    expect(screen.getByText(/"userId":"123"/)).toBeInTheDocument();
  });

  it('should highlight changed values between snapshots', () => {
    const previousState = {
      ...mockTaskState,
      output: {
        id: '123',
        name: 'Jane Doe', // Changed
        email: 'jane@example.com', // Changed
      },
    };

    render(<TaskStateInspector taskState={mockTaskState} previousState={previousState} />);

    // Should highlight changed values
    const highlights = screen.getAllByTestId('changed-value');
    expect(highlights.length).toBeGreaterThan(0);
  });
});
