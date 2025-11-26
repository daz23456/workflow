/**
 * Tests for Execute Workflow API Route
 * Following TDD: These tests are written FIRST and will fail initially
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, POST } from './route';

// Mock the API client
vi.mock('@/lib/api/client', () => ({
  executeWorkflow: vi.fn(),
}));

// Mock the transformer
vi.mock('@/lib/api/transformers', () => ({
  transformExecutionResponse: vi.fn((response) => response), // Pass through for now
}));

import { executeWorkflow } from '@/lib/api/client';
import { transformExecutionResponse } from '@/lib/api/transformers';

describe('POST /api/workflows/[name]/execute', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should execute workflow successfully with valid input', async () => {
    // Arrange
    const mockBackendResponse = {
      executionId: '123e4567-e89b-12d3-a456-426614174000',
      workflowName: 'user-profile',
      success: true,
      output: { userId: '42', email: 'test@example.com' },
      executedTasks: ['fetch-user', 'fetch-posts'],
      taskDetails: [
        {
          taskId: 'fetch-user',
          taskRef: 'fetch-user',
          success: true,
          output: { id: '42', email: 'test@example.com' },
          errors: [],
          retryCount: 0,
          durationMs: 150,
          startedAt: '2025-11-25T10:00:00Z',
          completedAt: '2025-11-25T10:00:00.150Z',
        },
      ],
      executionTimeMs: 250,
    };

    vi.mocked(executeWorkflow).mockResolvedValue(mockBackendResponse);
    vi.mocked(transformExecutionResponse).mockReturnValue({
      ...mockBackendResponse,
      tasks: mockBackendResponse.taskDetails,
    });

    const request = new NextRequest('http://localhost:3000/api/workflows/user-profile/execute', {
      method: 'POST',
      body: JSON.stringify({ userId: '1' }),
    });

    const params = Promise.resolve({ name: 'user-profile' });

    // Act
    const response = await POST(request, { params });
    const data = await response.json();

    // Assert
    expect(response.status).toBe(200);
    expect(executeWorkflow).toHaveBeenCalledWith('user-profile', { input: { userId: '1' } });
    expect(transformExecutionResponse).toHaveBeenCalledWith(mockBackendResponse);
    expect(data.executionId).toBe('123e4567-e89b-12d3-a456-426614174000');
    expect(data.success).toBe(true);
    expect(data.output).toEqual({ userId: '42', email: 'test@example.com' });
  });

  it('should return 400 for invalid input (validation error)', async () => {
    // Arrange
    const validationError = new Error('HTTP 400: Input validation failed');
    vi.mocked(executeWorkflow).mockRejectedValue(validationError);

    const request = new NextRequest('http://localhost:3000/api/workflows/user-profile/execute', {
      method: 'POST',
      body: JSON.stringify({ invalidField: 'test' }),
    });

    const params = Promise.resolve({ name: 'user-profile' });

    // Act
    const response = await POST(request, { params });
    const data = await response.json();

    // Assert
    expect(response.status).toBe(400);
    expect(data.error).toBe('Validation failed');
    expect(data.message).toContain('validation');
  });

  it('should return 404 for non-existent workflow', async () => {
    // Arrange
    const notFoundError = new Error('HTTP 404: Workflow not found');
    vi.mocked(executeWorkflow).mockRejectedValue(notFoundError);

    const request = new NextRequest('http://localhost:3000/api/workflows/non-existent/execute', {
      method: 'POST',
      body: JSON.stringify({ test: 'data' }),
    });

    const params = Promise.resolve({ name: 'non-existent' });

    // Act
    const response = await POST(request, { params });
    const data = await response.json();

    // Assert
    expect(response.status).toBe(404);
    expect(data.error).toBe('Workflow not found');
    expect(data.message).toContain('non-existent');
  });

  it('should return 500 for backend errors', async () => {
    // Arrange
    const serverError = new Error('Internal server error');
    vi.mocked(executeWorkflow).mockRejectedValue(serverError);

    const request = new NextRequest('http://localhost:3000/api/workflows/user-profile/execute', {
      method: 'POST',
      body: JSON.stringify({ userId: '1' }),
    });

    const params = Promise.resolve({ name: 'user-profile' });

    // Act
    const response = await POST(request, { params });
    const data = await response.json();

    // Assert
    expect(response.status).toBe(500);
    expect(data.error).toBe('Execution failed');
    expect(data.message).toBeTruthy();
  });

  it('should return 400 for malformed JSON in request body', async () => {
    // Arrange
    const request = new NextRequest('http://localhost:3000/api/workflows/user-profile/execute', {
      method: 'POST',
      body: 'invalid json {',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const params = Promise.resolve({ name: 'user-profile' });

    // Act
    const response = await POST(request, { params });
    const data = await response.json();

    // Assert
    expect(response.status).toBe(400);
    expect(data.error).toBeTruthy();
  });

  it('should handle workflow execution timeout (HTTP 408)', async () => {
    // Arrange
    const timeoutError = new Error('HTTP 408: Request Timeout');
    vi.mocked(executeWorkflow).mockRejectedValue(timeoutError);

    const request = new NextRequest('http://localhost:3000/api/workflows/slow-workflow/execute', {
      method: 'POST',
      body: JSON.stringify({ data: 'test' }),
    });

    const params = Promise.resolve({ name: 'slow-workflow' });

    // Act
    const response = await POST(request, { params });
    const data = await response.json();

    // Assert
    expect(response.status).toBe(408);
    expect(data.error).toBe('Execution timeout');
    expect(data.message).toContain('timeout');
  });

  it('should transform backend response to frontend format', async () => {
    // Arrange
    const backendResponse = {
      executionId: 'exec-123',
      workflowName: 'test-workflow',
      success: true,
      output: { result: 'success' },
      executedTasks: ['task1', 'task2'],
      taskDetails: [
        {
          taskId: 'task1',
          taskRef: 'task-ref-1',
          success: true,
          output: { data: 'test' },
          errors: [],
          retryCount: 0,
          durationMs: 100,
          startedAt: '2025-11-25T10:00:00Z',
          completedAt: '2025-11-25T10:00:00.100Z',
        },
      ],
      executionTimeMs: 150,
    };

    const expectedFrontendResponse = {
      ...backendResponse,
      tasks: backendResponse.taskDetails, // Transformed property name
      startedAt: '2025-11-25T10:00:00Z',
      completedAt: '2025-11-25T10:00:00.150Z',
    };

    vi.mocked(executeWorkflow).mockResolvedValue(backendResponse);
    vi.mocked(transformExecutionResponse).mockReturnValue(expectedFrontendResponse);

    const request = new NextRequest('http://localhost:3000/api/workflows/test-workflow/execute', {
      method: 'POST',
      body: JSON.stringify({ input: 'test' }),
    });

    const params = Promise.resolve({ name: 'test-workflow' });

    // Act
    const response = await POST(request, { params });
    const data = await response.json();

    // Assert
    expect(transformExecutionResponse).toHaveBeenCalledWith(backendResponse);
    expect(data.tasks).toBeDefined();
    expect(data.tasks).toHaveLength(1);
    expect(data.startedAt).toBeDefined();
    expect(data.completedAt).toBeDefined();
  });
});
