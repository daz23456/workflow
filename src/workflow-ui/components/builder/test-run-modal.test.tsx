/**
 * Tests for TestRunModal component
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TestRunModal } from './test-run-modal';
import type { WorkflowBuilderState } from '@/lib/types/workflow-builder';
import * as apiClient from '@/lib/api/client';

// Mock the API client
vi.mock('@/lib/api/client', () => ({
  testExecuteWorkflow: vi.fn(),
}));

// Mock the yaml-adapter
vi.mock('@/lib/adapters/yaml-adapter', () => ({
  graphToYaml: vi.fn(() => 'apiVersion: workflow.example.com/v1\nkind: Workflow\nmetadata:\n  name: test-workflow'),
}));

describe('TestRunModal', () => {
  const mockState: WorkflowBuilderState = {
    graph: {
      nodes: [
        {
          id: 'task-1',
          type: 'task',
          position: { x: 100, y: 100 },
          data: { label: 'Test Task', taskRef: 'test-task' },
        },
      ],
      edges: [],
      parallelGroups: [],
    },
    metadata: {
      name: 'test-workflow',
      namespace: 'default',
      description: 'Test workflow',
    },
    inputSchema: {
      userId: {
        type: 'string',
        description: 'User ID to process',
        required: true,
      },
    },
    outputMapping: {},
    selection: { nodeIds: [], edgeIds: [] },
    validation: { isValid: true, errors: [], warnings: [] },
    history: { past: [], future: [], currentCheckpoint: null },
    autosave: { isDirty: false, lastSaved: null, isAutosaving: false },
    panel: { activePanel: null, selectedTaskId: null },
  };

  const mockOnOpenChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders modal when open', () => {
    render(
      <TestRunModal open={true} onOpenChange={mockOnOpenChange} state={mockState} />
    );

    expect(screen.getByText(/Test Run/i)).toBeInTheDocument();
    expect(screen.getByText(/test-workflow/i)).toBeInTheDocument();
  });

  it('displays input fields based on inputSchema', () => {
    render(
      <TestRunModal open={true} onOpenChange={mockOnOpenChange} state={mockState} />
    );

    expect(screen.getByText('userId')).toBeInTheDocument();
    expect(screen.getByText('(string)')).toBeInTheDocument();
    expect(screen.getByText('User ID to process')).toBeInTheDocument();
  });

  it('shows Run Test button', () => {
    render(
      <TestRunModal open={true} onOpenChange={mockOnOpenChange} state={mockState} />
    );

    const runButton = screen.getByRole('button', { name: /run test/i });
    expect(runButton).toBeInTheDocument();
    expect(runButton).not.toBeDisabled();
  });

  it('shows Close button', () => {
    render(
      <TestRunModal open={true} onOpenChange={mockOnOpenChange} state={mockState} />
    );

    // Find the Close button in the footer (there's also an X close button from Dialog)
    const closeButtons = screen.getAllByRole('button', { name: /close/i });
    expect(closeButtons.length).toBeGreaterThanOrEqual(1);
  });

  it('calls testExecuteWorkflow when Run Test is clicked', async () => {
    const mockTestExecute = vi.mocked(apiClient.testExecuteWorkflow);
    mockTestExecute.mockResolvedValueOnce({
      success: true,
      workflowName: 'test-workflow',
      executedTasks: ['task-1'],
      taskDetails: [],
      executionTimeMs: 100,
      validationErrors: [],
    });

    render(
      <TestRunModal open={true} onOpenChange={mockOnOpenChange} state={mockState} />
    );

    // Enter input value
    const inputField = screen.getByPlaceholderText(/enter string/i);
    fireEvent.change(inputField, { target: { value: 'user-123' } });

    // Click run test
    const runButton = screen.getByRole('button', { name: /run test/i });
    fireEvent.click(runButton);

    await waitFor(() => {
      expect(mockTestExecute).toHaveBeenCalledWith(
        expect.objectContaining({
          workflowYaml: expect.any(String),
          input: expect.objectContaining({ userId: 'user-123' }),
        }),
        'default'
      );
    });
  });

  it('displays success result', async () => {
    const mockTestExecute = vi.mocked(apiClient.testExecuteWorkflow);
    mockTestExecute.mockResolvedValueOnce({
      success: true,
      workflowName: 'test-workflow',
      output: { result: 'success' },
      executedTasks: ['task-1'],
      taskDetails: [
        {
          taskId: 'task-1',
          taskRef: 'test-task',
          success: true,
          output: { data: 'test' },
          errors: [],
          retryCount: 0,
          durationMs: 50,
          startedAt: new Date().toISOString(),
          completedAt: new Date().toISOString(),
        },
      ],
      executionTimeMs: 100,
      validationErrors: [],
    });

    render(
      <TestRunModal open={true} onOpenChange={mockOnOpenChange} state={mockState} />
    );

    // Click run test
    const runButton = screen.getByRole('button', { name: /run test/i });
    fireEvent.click(runButton);

    await waitFor(() => {
      expect(screen.getByText(/Execution Successful/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/100ms/)).toBeInTheDocument();
  });

  it('displays error result', async () => {
    const mockTestExecute = vi.mocked(apiClient.testExecuteWorkflow);
    mockTestExecute.mockResolvedValueOnce({
      success: false,
      workflowName: 'test-workflow',
      executedTasks: [],
      taskDetails: [],
      executionTimeMs: 0,
      error: 'Task failed: Connection refused',
      validationErrors: [],
    });

    render(
      <TestRunModal open={true} onOpenChange={mockOnOpenChange} state={mockState} />
    );

    // Click run test
    const runButton = screen.getByRole('button', { name: /run test/i });
    fireEvent.click(runButton);

    await waitFor(() => {
      expect(screen.getByText(/Execution Failed/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/Task failed: Connection refused/i)).toBeInTheDocument();
  });

  it('shows no input message when workflow has no input schema', () => {
    const stateWithoutInput: WorkflowBuilderState = {
      ...mockState,
      inputSchema: {},
    };

    render(
      <TestRunModal open={true} onOpenChange={mockOnOpenChange} state={stateWithoutInput} />
    );

    expect(screen.getByText(/no input parameters defined/i)).toBeInTheDocument();
  });
});
