/**
 * Tests for Tasks List API Route
 * Following TDD: These tests are written FIRST and will fail initially
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from './route';

// Mock the API client
vi.mock('@/lib/api/client', () => ({
  listTasks: vi.fn(),
}));

import { listTasks } from '@/lib/api/client';

describe('GET /api/tasks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return list of all available tasks', async () => {
    // Arrange
    const mockBackendResponse = {
      tasks: [
        {
          name: 'fetch-user',
          namespace: 'default',
          endpoint: 'http://fetch-user-service/api/task',
        },
        {
          name: 'send-email',
          namespace: 'default',
          endpoint: 'http://send-email-service/api/task',
        },
        {
          name: 'process-data',
          namespace: 'analytics',
          endpoint: 'http://process-data-service/api/task',
        },
      ],
    };

    vi.mocked(listTasks).mockResolvedValue(mockBackendResponse);

    const request = new NextRequest('http://localhost:3000/api/tasks');

    // Act
    const response = await GET(request);
    const data = await response.json();

    // Assert
    expect(response.status).toBe(200);
    expect(listTasks).toHaveBeenCalledWith(undefined);
    expect(data.tasks).toHaveLength(3);
    expect(data.tasks[0].name).toBe('fetch-user');
    expect(data.tasks[1].name).toBe('send-email');
    expect(data.tasks[2].name).toBe('process-data');
  });

  it('should filter tasks by namespace when provided', async () => {
    // Arrange
    const mockBackendResponse = {
      tasks: [
        {
          name: 'process-data',
          namespace: 'analytics',
          endpoint: 'http://process-data-service/api/task',
        },
        {
          name: 'generate-report',
          namespace: 'analytics',
          endpoint: 'http://generate-report-service/api/task',
        },
      ],
    };

    vi.mocked(listTasks).mockResolvedValue(mockBackendResponse);

    const request = new NextRequest('http://localhost:3000/api/tasks?namespace=analytics');

    // Act
    const response = await GET(request);
    const data = await response.json();

    // Assert
    expect(response.status).toBe(200);
    expect(listTasks).toHaveBeenCalledWith('analytics');
    expect(data.tasks).toHaveLength(2);
    expect(data.tasks.every((task: any) => task.namespace === 'analytics')).toBe(true);
  });

  it('should return empty array when no tasks found', async () => {
    // Arrange
    const mockBackendResponse = {
      tasks: [],
    };

    vi.mocked(listTasks).mockResolvedValue(mockBackendResponse);

    const request = new NextRequest('http://localhost:3000/api/tasks?namespace=nonexistent');

    // Act
    const response = await GET(request);
    const data = await response.json();

    // Assert
    expect(response.status).toBe(200);
    expect(data.tasks).toHaveLength(0);
  });

  it('should return 500 for backend errors', async () => {
    // Arrange
    const serverError = new Error('Internal server error');
    vi.mocked(listTasks).mockRejectedValue(serverError);

    const request = new NextRequest('http://localhost:3000/api/tasks');

    // Act
    const response = await GET(request);
    const data = await response.json();

    // Assert
    expect(response.status).toBe(500);
    expect(data.error).toBe('Failed to fetch tasks');
    expect(data.message).toBeTruthy();
  });

  it('should include task endpoints in response', async () => {
    // Arrange
    const mockBackendResponse = {
      tasks: [
        {
          name: 'task-a',
          namespace: 'default',
          endpoint: 'http://task-a-service:8080/api/task',
        },
        {
          name: 'task-b',
          namespace: 'default',
          endpoint: 'http://task-b-service:9090/api/execute',
        },
      ],
    };

    vi.mocked(listTasks).mockResolvedValue(mockBackendResponse);

    const request = new NextRequest('http://localhost:3000/api/tasks');

    // Act
    const response = await GET(request);
    const data = await response.json();

    // Assert
    expect(response.status).toBe(200);
    expect(data.tasks[0].endpoint).toBe('http://task-a-service:8080/api/task');
    expect(data.tasks[1].endpoint).toBe('http://task-b-service:9090/api/execute');
  });
});
