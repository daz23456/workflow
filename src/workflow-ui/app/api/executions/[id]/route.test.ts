/**
 * Tests for Execution Detail API Route
 * Following TDD: These tests verify the response transformation
 * from DetailedWorkflowExecutionResponse to WorkflowExecutionResponse format
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from './route';

// Mock the API client
vi.mock('@/lib/api/client', () => ({
  getExecutionDetail: vi.fn(),
}));

import { getExecutionDetail } from '@/lib/api/client';

describe('GET /api/executions/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return execution details transformed to WorkflowExecutionResponse format', async () => {
    // Arrange - backend returns DetailedWorkflowExecutionResponse
    const mockBackendResponse = {
      executionId: '123e4567-e89b-12d3-a456-426614174000',
      workflowName: 'user-profile',
      status: 'Succeeded' as const,
      startedAt: '2025-11-25T10:00:00Z',
      completedAt: '2025-11-25T10:00:05.250Z',
      durationMs: 5250,
      inputSnapshot: { userId: '42' },
      outputSnapshot: { email: 'test@example.com', name: 'John Doe' },
      tasks: [
        {
          taskId: 'task1',
          taskRef: 'fetch-user',
          success: true,
          output: { id: '42', email: 'test@example.com', name: 'John Doe' },
          errors: [],
          durationMs: 150,
          retryCount: 0,
          startedAt: '2025-11-25T10:00:00Z',
          completedAt: '2025-11-25T10:00:00.150Z',
        },
        {
          taskId: 'task2',
          taskRef: 'fetch-posts',
          success: true,
          output: { posts: [{ id: 1, title: 'Test Post' }] },
          errors: [],
          durationMs: 200,
          retryCount: 0,
          startedAt: '2025-11-25T10:00:00.150Z',
          completedAt: '2025-11-25T10:00:00.350Z',
        },
      ],
    };

    vi.mocked(getExecutionDetail).mockResolvedValue(mockBackendResponse);

    const request = new NextRequest(
      'http://localhost:3000/api/executions/123e4567-e89b-12d3-a456-426614174000'
    );
    const params = Promise.resolve({ id: '123e4567-e89b-12d3-a456-426614174000' });

    // Act
    const response = await GET(request, { params });
    const data = await response.json();

    // Assert - response is transformed to WorkflowExecutionResponse format
    expect(response.status).toBe(200);
    expect(getExecutionDetail).toHaveBeenCalledWith('123e4567-e89b-12d3-a456-426614174000');
    expect(data.executionId).toBe('123e4567-e89b-12d3-a456-426614174000');
    expect(data.workflowName).toBe('user-profile');
    // Transformed: status 'Succeeded' -> success: true
    expect(data.success).toBe(true);
    // Transformed: inputSnapshot -> input
    expect(data.input).toEqual({ userId: '42' });
    // Transformed: outputSnapshot -> output
    expect(data.output).toEqual({ email: 'test@example.com', name: 'John Doe' });
    // Transformed: taskExecutions -> tasks
    expect(data.tasks).toHaveLength(2);
    expect(data.tasks[0].status).toBe('success');
    expect(data.executionTimeMs).toBe(5250);
  });

  it('should return 404 for non-existent execution ID', async () => {
    // Arrange
    const notFoundError = new Error('HTTP 404: Execution not found');
    vi.mocked(getExecutionDetail).mockRejectedValue(notFoundError);

    const request = new NextRequest('http://localhost:3000/api/executions/non-existent-id');
    const params = Promise.resolve({ id: 'non-existent-id' });

    // Act
    const response = await GET(request, { params });
    const data = await response.json();

    // Assert
    expect(response.status).toBe(404);
    expect(data.error).toBe('Execution not found');
    expect(data.message).toContain('non-existent-id');
  });

  it('should return 500 for backend errors', async () => {
    // Arrange
    const serverError = new Error('Internal server error');
    vi.mocked(getExecutionDetail).mockRejectedValue(serverError);

    const request = new NextRequest('http://localhost:3000/api/executions/123e4567');
    const params = Promise.resolve({ id: '123e4567' });

    // Act
    const response = await GET(request, { params });
    const data = await response.json();

    // Assert
    expect(response.status).toBe(500);
    expect(data.error).toBe('Failed to fetch execution');
    expect(data.message).toBeTruthy();
  });

  it('should transform input and output snapshots', async () => {
    // Arrange
    const mockBackendResponse = {
      executionId: 'exec-456',
      workflowName: 'data-processor',
      status: 'Succeeded' as const,
      startedAt: '2025-11-25T10:00:00Z',
      completedAt: '2025-11-25T10:00:02Z',
      durationMs: 2000,
      inputSnapshot: {
        data: [1, 2, 3, 4, 5],
        operation: 'sum',
      },
      outputSnapshot: {
        result: 15,
        processedCount: 5,
      },
      tasks: [],
    };

    vi.mocked(getExecutionDetail).mockResolvedValue(mockBackendResponse);

    const request = new NextRequest('http://localhost:3000/api/executions/exec-456');
    const params = Promise.resolve({ id: 'exec-456' });

    // Act
    const response = await GET(request, { params });
    const data = await response.json();

    // Assert - transformed field names
    expect(response.status).toBe(200);
    expect(data.input).toEqual({ data: [1, 2, 3, 4, 5], operation: 'sum' });
    expect(data.output).toEqual({ result: 15, processedCount: 5 });
  });

  it('should transform task execution details with errors', async () => {
    // Arrange
    const mockBackendResponse = {
      executionId: 'exec-789',
      workflowName: 'flaky-workflow',
      status: 'Failed' as const,
      startedAt: '2025-11-25T10:00:00Z',
      completedAt: '2025-11-25T10:00:10Z',
      durationMs: 10000,
      inputSnapshot: { test: 'data' },
      outputSnapshot: undefined,
      errors: ['Task task2 failed after retries'],
      tasks: [
        {
          taskId: 'task1',
          taskRef: 'reliable-task',
          success: true,
          output: { success: true },
          errors: [],
          durationMs: 100,
          retryCount: 0,
          startedAt: '2025-11-25T10:00:00Z',
          completedAt: '2025-11-25T10:00:00.100Z',
        },
        {
          taskId: 'task2',
          taskRef: 'flaky-task',
          success: false,
          output: undefined,
          errors: [
            'Connection timeout',
            'Retry 1 failed: Connection timeout',
            'Retry 2 failed: Connection timeout',
          ],
          durationMs: 9000,
          retryCount: 2,
          startedAt: '2025-11-25T10:00:00.100Z',
          completedAt: '2025-11-25T10:00:09.100Z',
        },
      ],
    };

    vi.mocked(getExecutionDetail).mockResolvedValue(mockBackendResponse);

    const request = new NextRequest('http://localhost:3000/api/executions/exec-789');
    const params = Promise.resolve({ id: 'exec-789' });

    // Act
    const response = await GET(request, { params });
    const data = await response.json();

    // Assert - transformed format
    expect(response.status).toBe(200);
    expect(data.success).toBe(false); // status 'Failed' -> success: false
    expect(data.tasks).toHaveLength(2);
    expect(data.tasks[0].status).toBe('success'); // 'Succeeded' -> 'success'
    expect(data.tasks[1].status).toBe('failed'); // 'Failed' -> 'failed'
    expect(data.tasks[1].retryCount).toBe(2);
    // Errors are joined into single string
    expect(data.tasks[1].error).toContain('Connection timeout');
    expect(data.error).toBe('Task task2 failed after retries');
  });

  it('should handle running executions', async () => {
    // Arrange
    const mockBackendResponse = {
      executionId: 'exec-running',
      workflowName: 'long-workflow',
      status: 'Running' as const,
      startedAt: '2025-11-25T10:00:00Z',
      completedAt: undefined,
      durationMs: undefined,
      inputSnapshot: { data: 'test' },
      outputSnapshot: undefined,
      tasks: [
        {
          taskId: 'task1',
          taskRef: 'step1',
          success: true,
          output: { done: true },
          errors: [],
          durationMs: 500,
          retryCount: 0,
          startedAt: '2025-11-25T10:00:00Z',
          completedAt: '2025-11-25T10:00:00.500Z',
        },
      ],
    };

    vi.mocked(getExecutionDetail).mockResolvedValue(mockBackendResponse);

    const request = new NextRequest('http://localhost:3000/api/executions/exec-running');
    const params = Promise.resolve({ id: 'exec-running' });

    // Act
    const response = await GET(request, { params });
    const data = await response.json();

    // Assert - transformed format
    expect(response.status).toBe(200);
    expect(data.success).toBe(false); // 'Running' is not 'Succeeded'
    expect(data.completedAt).toBeUndefined();
    expect(data.executionTimeMs).toBe(0); // undefined -> 0
    expect(data.output).toEqual({}); // undefined -> empty object
  });
});
