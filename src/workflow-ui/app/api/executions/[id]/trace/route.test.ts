/**
 * Tests for Execution Trace API Route
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from './route';

// Mock the API client
vi.mock('@/lib/api/client', () => ({
  getExecutionTrace: vi.fn(),
}));

import { getExecutionTrace } from '@/lib/api/client';

describe('GET /api/executions/[id]/trace', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return execution trace for valid execution ID', async () => {
    // Arrange
    const mockBackendResponse = {
      executionId: '123e4567-e89b-12d3-a456-426614174000',
      workflowName: 'user-profile',
      startedAt: '2025-11-25T10:00:00Z',
      completedAt: '2025-11-25T10:00:05.250Z',
      totalDurationMs: 5250,
      taskTimings: [
        {
          taskId: 'task1',
          taskRef: 'fetch-user',
          startedAt: '2025-11-25T10:00:00.100Z',
          completedAt: '2025-11-25T10:00:00.350Z',
          durationMs: 250,
          waitTimeMs: 100,
          status: 'Succeeded',
        },
      ],
      dependencyOrder: [{ taskId: 'task1', dependsOn: [], level: 0 }],
      plannedParallelGroups: [{ level: 0, taskIds: ['task1'] }],
      actualParallelGroups: [],
    };

    vi.mocked(getExecutionTrace).mockResolvedValue(mockBackendResponse);

    const request = new NextRequest(
      'http://localhost:3000/api/executions/123e4567-e89b-12d3-a456-426614174000/trace'
    );
    const params = Promise.resolve({ id: '123e4567-e89b-12d3-a456-426614174000' });

    // Act
    const response = await GET(request, { params });
    const data = await response.json();

    // Assert
    expect(response.status).toBe(200);
    expect(getExecutionTrace).toHaveBeenCalledWith('123e4567-e89b-12d3-a456-426614174000');
    expect(data.executionId).toBe('123e4567-e89b-12d3-a456-426614174000');
    expect(data.workflowName).toBe('user-profile');
    expect(data.taskTimings).toHaveLength(1);
    expect(data.taskTimings[0].waitTimeMs).toBe(100);
  });

  it('should return 404 for non-existent execution ID', async () => {
    // Arrange
    const notFoundError = new Error('HTTP 404: Execution not found');
    vi.mocked(getExecutionTrace).mockRejectedValue(notFoundError);

    const request = new NextRequest('http://localhost:3000/api/executions/non-existent-id/trace');
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
    vi.mocked(getExecutionTrace).mockRejectedValue(serverError);

    const request = new NextRequest('http://localhost:3000/api/executions/123e4567/trace');
    const params = Promise.resolve({ id: '123e4567' });

    // Act
    const response = await GET(request, { params });
    const data = await response.json();

    // Assert
    expect(response.status).toBe(500);
    expect(data.error).toBe('Failed to fetch execution trace');
    expect(data.message).toBeTruthy();
  });

  it('should include dependency order information', async () => {
    // Arrange
    const mockBackendResponse = {
      executionId: 'exec-456',
      workflowName: 'multi-step',
      startedAt: '2025-11-25T10:00:00Z',
      completedAt: '2025-11-25T10:00:02Z',
      totalDurationMs: 2000,
      taskTimings: [
        {
          taskId: 'task1',
          taskRef: 'step1',
          startedAt: '2025-11-25T10:00:00Z',
          completedAt: '2025-11-25T10:00:00.500Z',
          durationMs: 500,
          waitTimeMs: 0,
          status: 'Succeeded',
        },
        {
          taskId: 'task2',
          taskRef: 'step2',
          startedAt: '2025-11-25T10:00:00.500Z',
          completedAt: '2025-11-25T10:00:01Z',
          durationMs: 500,
          waitTimeMs: 0,
          status: 'Succeeded',
        },
      ],
      dependencyOrder: [
        { taskId: 'task1', dependsOn: [], level: 0 },
        { taskId: 'task2', dependsOn: ['task1'], level: 1 },
      ],
      plannedParallelGroups: [
        { level: 0, taskIds: ['task1'] },
        { level: 1, taskIds: ['task2'] },
      ],
      actualParallelGroups: [],
    };

    vi.mocked(getExecutionTrace).mockResolvedValue(mockBackendResponse);

    const request = new NextRequest('http://localhost:3000/api/executions/exec-456/trace');
    const params = Promise.resolve({ id: 'exec-456' });

    // Act
    const response = await GET(request, { params });
    const data = await response.json();

    // Assert
    expect(response.status).toBe(200);
    expect(data.dependencyOrder).toHaveLength(2);
    expect(data.dependencyOrder[1].dependsOn).toContain('task1');
    expect(data.plannedParallelGroups).toHaveLength(2);
  });

  it('should include actual parallel groups when tasks ran concurrently', async () => {
    // Arrange
    const mockBackendResponse = {
      executionId: 'exec-parallel',
      workflowName: 'parallel-workflow',
      startedAt: '2025-11-25T10:00:00Z',
      completedAt: '2025-11-25T10:00:01Z',
      totalDurationMs: 1000,
      taskTimings: [
        {
          taskId: 'task1',
          taskRef: 'parallel-task-1',
          startedAt: '2025-11-25T10:00:00Z',
          completedAt: '2025-11-25T10:00:00.800Z',
          durationMs: 800,
          waitTimeMs: 0,
          status: 'Succeeded',
        },
        {
          taskId: 'task2',
          taskRef: 'parallel-task-2',
          startedAt: '2025-11-25T10:00:00Z',
          completedAt: '2025-11-25T10:00:00.600Z',
          durationMs: 600,
          waitTimeMs: 0,
          status: 'Succeeded',
        },
      ],
      dependencyOrder: [
        { taskId: 'task1', dependsOn: [], level: 0 },
        { taskId: 'task2', dependsOn: [], level: 0 },
      ],
      plannedParallelGroups: [{ level: 0, taskIds: ['task1', 'task2'] }],
      actualParallelGroups: [
        {
          taskIds: ['task1', 'task2'],
          startedAt: '2025-11-25T10:00:00Z',
          completedAt: '2025-11-25T10:00:00.800Z',
          overlapMs: 600,
        },
      ],
    };

    vi.mocked(getExecutionTrace).mockResolvedValue(mockBackendResponse);

    const request = new NextRequest('http://localhost:3000/api/executions/exec-parallel/trace');
    const params = Promise.resolve({ id: 'exec-parallel' });

    // Act
    const response = await GET(request, { params });
    const data = await response.json();

    // Assert
    expect(response.status).toBe(200);
    expect(data.actualParallelGroups).toHaveLength(1);
    expect(data.actualParallelGroups[0].taskIds).toContain('task1');
    expect(data.actualParallelGroups[0].taskIds).toContain('task2');
    expect(data.actualParallelGroups[0].overlapMs).toBe(600);
  });
});
