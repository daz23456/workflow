import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StepThroughController } from './step-through-controller';

describe('StepThroughController', () => {
  const mockExecutionState = {
    executionId: '123e4567-e89b-12d3-a456-426614174000',
    workflowName: 'test-workflow',
    status: 'Running' as const,
    currentTaskId: 'task2',
    completedTasks: ['task1'],
    pendingTasks: ['task2', 'task3', 'task4'],
  };

  it('should render step-through controller', () => {
    render(<StepThroughController executionState={mockExecutionState} />);

    const controller = screen.getByRole('region', { name: /step-through controller/i });
    expect(controller).toBeInTheDocument();
  });

  it('should display current execution status', () => {
    render(<StepThroughController executionState={mockExecutionState} />);

    expect(screen.getByText(/test-workflow/i)).toBeInTheDocument();
    expect(screen.getByText(/running/i)).toBeInTheDocument();
  });

  it('should show current task', () => {
    render(<StepThroughController executionState={mockExecutionState} />);

    expect(screen.getByText(/current task/i)).toBeInTheDocument();
    // The current task section should contain the task ID
    const currentTaskSection = screen.getByText(/current task/i).parentElement;
    expect(currentTaskSection).toHaveTextContent('task2');
  });

  it('should display progress indicator', () => {
    render(<StepThroughController executionState={mockExecutionState} />);

    // 1 completed out of 4 total tasks = 25% progress
    expect(screen.getByText(/1.*4/)).toBeInTheDocument();
  });

  it('should have pause button when running', () => {
    render(<StepThroughController executionState={mockExecutionState} />);

    const pauseButton = screen.getByRole('button', { name: /pause/i });
    expect(pauseButton).toBeInTheDocument();
  });

  it('should have resume button when paused', () => {
    const pausedState = { ...mockExecutionState, status: 'Paused' as const };
    render(<StepThroughController executionState={pausedState} />);

    const resumeButton = screen.getByRole('button', { name: /resume/i });
    expect(resumeButton).toBeInTheDocument();
  });

  it('should have step forward button when paused', () => {
    const pausedState = { ...mockExecutionState, status: 'Paused' as const };
    render(<StepThroughController executionState={pausedState} />);

    const stepButton = screen.getByRole('button', { name: /step forward/i });
    expect(stepButton).toBeInTheDocument();
  });

  it('should call onPause when pause button clicked', async () => {
    const user = userEvent.setup();
    const onPause = vi.fn();
    render(<StepThroughController executionState={mockExecutionState} onPause={onPause} />);

    const pauseButton = screen.getByRole('button', { name: /pause/i });
    await user.click(pauseButton);

    expect(onPause).toHaveBeenCalled();
  });

  it('should call onResume when resume button clicked', async () => {
    const user = userEvent.setup();
    const onResume = vi.fn();
    const pausedState = { ...mockExecutionState, status: 'Paused' as const };
    render(<StepThroughController executionState={pausedState} onResume={onResume} />);

    const resumeButton = screen.getByRole('button', { name: /resume/i });
    await user.click(resumeButton);

    expect(onResume).toHaveBeenCalled();
  });

  it('should call onStepForward when step button clicked', async () => {
    const user = userEvent.setup();
    const onStepForward = vi.fn();
    const pausedState = { ...mockExecutionState, status: 'Paused' as const };
    render(<StepThroughController executionState={pausedState} onStepForward={onStepForward} />);

    const stepButton = screen.getByRole('button', { name: /step forward/i });
    await user.click(stepButton);

    expect(onStepForward).toHaveBeenCalled();
  });

  it('should support skip to task', async () => {
    const user = userEvent.setup();
    const onSkipTo = vi.fn();
    render(<StepThroughController executionState={mockExecutionState} onSkipTo={onSkipTo} />);

    const skipButton = screen.getByRole('button', { name: /skip to task/i });
    await user.click(skipButton);

    // Should show task selection dropdown
    expect(screen.getByRole('combobox', { name: /select task/i })).toBeInTheDocument();

    const taskSelect = screen.getByRole('combobox', { name: /select task/i });
    await user.selectOptions(taskSelect, 'task3');

    const confirmButton = screen.getByRole('button', { name: /confirm/i });
    await user.click(confirmButton);

    expect(onSkipTo).toHaveBeenCalledWith('task3');
  });

  it('should show completed tasks list', () => {
    render(<StepThroughController executionState={mockExecutionState} />);

    expect(screen.getByText(/completed tasks/i)).toBeInTheDocument();
    expect(screen.getByText(/task1/i)).toBeInTheDocument();
  });

  it('should show pending tasks list', () => {
    render(<StepThroughController executionState={mockExecutionState} />);

    const pendingSection = screen.getByText(/pending tasks/i).closest('div');
    expect(pendingSection).toBeInTheDocument();

    // All pending tasks should be visible in the pending section
    expect(pendingSection).toHaveTextContent('task2');
    expect(pendingSection).toHaveTextContent('task3');
    expect(pendingSection).toHaveTextContent('task4');
  });

  it('should handle execution completion', () => {
    const completedState = {
      ...mockExecutionState,
      status: 'Succeeded' as const,
      currentTaskId: null,
      completedTasks: ['task1', 'task2', 'task3', 'task4'],
      pendingTasks: [],
    };

    render(<StepThroughController executionState={completedState} />);

    expect(screen.getByText(/succeeded/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /pause/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /resume/i })).not.toBeInTheDocument();
  });

  it('should disable controls when execution is stopped', () => {
    const stoppedState = { ...mockExecutionState, status: 'Failed' as const };
    render(<StepThroughController executionState={stoppedState} />);

    expect(screen.queryByRole('button', { name: /pause/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /resume/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /step forward/i })).not.toBeInTheDocument();
  });
});
