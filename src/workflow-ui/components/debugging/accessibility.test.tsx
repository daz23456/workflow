import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { ExecutionTimeline } from './execution-timeline';
import { TaskStateInspector } from './task-state-inspector';
import { VariableWatcher } from './variable-watcher';
import { StepThroughController } from './step-through-controller';
import { ExecutionReplay } from './execution-replay';
import { ExecutionComparison } from './execution-comparison';
import { WorkflowGraphDebugger } from './workflow-graph-debugger';

expect.extend(toHaveNoViolations);

describe('Debugging Components Accessibility', () => {
  it('ExecutionTimeline should have no accessibility violations', async () => {
    const mockEvents = [
      {
        id: '1',
        type: 'workflow_started' as const,
        timestamp: '2025-01-01T10:00:00Z',
        workflowName: 'test',
      },
      {
        id: '2',
        type: 'task_started' as const,
        timestamp: '2025-01-01T10:00:01Z',
        taskId: 'task1',
        taskName: 'fetch',
      },
    ];

    const { container } = render(<ExecutionTimeline events={mockEvents} />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('TaskStateInspector should have no accessibility violations', async () => {
    const mockTaskState = {
      taskId: 'task1',
      taskName: 'fetch-user',
      status: 'Succeeded',
      input: { userId: '123' },
      output: { id: '123', name: 'John' },
      startTime: '2025-01-01T10:00:01Z',
      endTime: '2025-01-01T10:00:03Z',
      duration: '00:00:02',
    };

    const { container } = render(<TaskStateInspector taskState={mockTaskState} />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('VariableWatcher should have no accessibility violations', async () => {
    const mockVariables = [
      { name: 'input.userId', value: '123', timestamp: '2025-01-01T10:00:00Z' },
      { name: 'tasks.fetch-user.output.name', value: 'John', timestamp: '2025-01-01T10:00:02Z' },
    ];

    const { container } = render(<VariableWatcher variables={mockVariables} />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('StepThroughController should have no accessibility violations', async () => {
    const mockState = {
      executionId: 'exec-1',
      workflowName: 'test-workflow',
      status: 'Running' as const,
      currentTaskId: 'task2',
      completedTasks: ['task1'],
      pendingTasks: ['task2', 'task3'],
    };

    const { container } = render(<StepThroughController executionState={mockState} />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('ExecutionReplay should have no accessibility violations', async () => {
    const { container } = render(<ExecutionReplay workflowName="test-workflow" />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('ExecutionComparison should have no accessibility violations', async () => {
    const mockExecution = {
      id: 'exec-1',
      workflowName: 'test',
      status: 'Succeeded',
      startedAt: '2025-01-01T10:00:00Z',
      completedAt: '2025-01-01T10:00:05Z',
      duration: '00:00:05',
      tasks: [],
    };

    const { container } = render(
      <ExecutionComparison execution1={mockExecution} execution2={mockExecution} />
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('WorkflowGraphDebugger should have no accessibility violations', async () => {
    const mockGraph = {
      nodes: [
        { id: 'task1', label: 'fetch-user', type: 'task' },
        { id: 'task2', label: 'send-email', type: 'task' },
      ],
      edges: [{ id: 'edge1', source: 'task1', target: 'task2' }],
    };

    const { container } = render(<WorkflowGraphDebugger graphData={mockGraph} />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
