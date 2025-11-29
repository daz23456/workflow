/**
 * Tests for Execution Detail API Route
 * Following TDD: These tests are written FIRST and will fail initially
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

  it('should return execution details for valid execution ID', async () => {
    // Arrange
    const mockBackendResponse = {
      executionId: '123e4567-e89b-12d3-a456-426614174000',
      workflowName: 'user-profile',
      status: 'Succeeded' as const,
      startedAt: '2025-11-25T10:00:00Z',
      completedAt: '2025-11-25T10:00:05.250Z',
      durationMs: 5250,
      inputSnapshot: { userId: '42' },
      outputSnapshot: { email: 'test@example.com', name: 'John Doe' },
      taskExecutions: [
        {
          taskId: 'task1',
          taskRef: 'fetch-user',
          status: 'Succeeded',
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
          status: 'Succeeded',
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

    const request = new NextRequest('http://localhost:3000/api/executions/123e4567-e89b-12d3-a456-426614174000');
    const params = Promise.resolve({ id: '123e4567-e89b-12d3-a456-426614174000' });

    // Act
    const response = await GET(request, { params });
    const data = await response.json();

    // Assert
    expect(response.status).toBe(200);
    expect(getExecutionDetail).toHaveBeenCalledWith('123e4567-e89b-12d3-a456-426614174000');
    expect(data.executionId).toBe('123e4567-e89b-12d3-a456-426614174000');
    expect(data.workflowName).toBe('user-profile');
    expect(data.status).toBe('Succeeded');
    expect(data.taskExecutions).toHaveLength(2);
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

  it('should include input and output snapshots', async () => {
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
        operation: 'sum'
      },
      outputSnapshot: {
        result: 15,
        processedCount: 5
      },
      taskExecutions: [],
    };

    vi.mocked(getExecutionDetail).mockResolvedValue(mockBackendResponse);

    const request = new NextRequest('http://localhost:3000/api/executions/exec-456');
    const params = Promise.resolve({ id: 'exec-456' });

    // Act
    const response = await GET(request, { params });
    const data = await response.json();

    // Assert
    expect(response.status).toBe(200);
    expect(data.inputSnapshot).toEqual({ data: [1, 2, 3, 4, 5], operation: 'sum' });
    expect(data.outputSnapshot).toEqual({ result: 15, processedCount: 5 });
  });

  it('should include task execution details with errors and retries', async () => {
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
      taskExecutions: [
        {
          taskId: 'task1',
          taskRef: 'reliable-task',
          status: 'Succeeded',
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
          status: 'Failed',
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

    // Assert
    expect(response.status).toBe(200);
    expect(data.status).toBe('Failed');
    expect(data.taskExecutions).toHaveLength(2);
    expect(data.taskExecutions[1].status).toBe('Failed');
    expect(data.taskExecutions[1].retryCount).toBe(2);
    expect(data.taskExecutions[1].errors).toHaveLength(3);
    expect(data.taskExecutions[1].errors[0]).toContain('timeout');
  });

  it('should handle running executions without completion data', async () => {
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
      taskExecutions: [
        {
          taskId: 'task1',
          taskRef: 'step1',
          status: 'Succeeded',
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

    // Assert
    expect(response.status).toBe(200);
    expect(data.status).toBe('Running');
    expect(data.completedAt).toBeUndefined();
    expect(data.durationMs).toBeUndefined();
    expect(data.outputSnapshot).toBeUndefined();
  });
});
