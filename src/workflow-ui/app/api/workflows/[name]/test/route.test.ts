/**
 * Tests for Test/Dry-Run Workflow API Route
 * Following TDD: These tests are written FIRST and will fail initially
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from './route';

// Mock the API client
vi.mock('@/lib/api/client', () => ({
  testWorkflow: vi.fn(),
}));

import { testWorkflow } from '@/lib/api/client';

describe('POST /api/workflows/[name]/test', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return validation success and execution plan for valid workflow', async () => {
    // Arrange
    const mockBackendResponse = {
      valid: true,
      validationErrors: [],
      executionPlan: {
        nodes: [
          { id: 'task1', taskRef: 'fetch-data', level: 0 },
          { id: 'task2', taskRef: 'process-data', level: 1 },
        ],
        edges: [{ from: 'task1', to: 'task2' }],
        parallelGroups: [],
        executionOrder: ['task1', 'task2'],
        validationResult: {
          isValid: true,
          errors: [],
        },
        estimatedDurationMs: 500,
        templatePreviews: {
          task1: { url: 'https://api.example.com/data' },
          task2: { url: 'https://api.example.com/process' },
        },
      },
    };

    vi.mocked(testWorkflow).mockResolvedValue(mockBackendResponse);

    const request = new NextRequest('http://localhost:3000/api/workflows/user-profile/test', {
      method: 'POST',
      body: JSON.stringify({ userId: '123' }),
    });

    const params = Promise.resolve({ name: 'user-profile' });

    // Act
    const response = await POST(request, { params });
    const data = await response.json();

    // Assert
    expect(response.status).toBe(200);
    expect(testWorkflow).toHaveBeenCalledWith('user-profile', { input: { userId: '123' } });
    expect(data.valid).toBe(true);
    expect(data.executionPlan).toBeDefined();
    expect(data.executionPlan.nodes).toHaveLength(2);
    expect(data.executionPlan.executionOrder).toEqual(['task1', 'task2']);
  });

  it('should return validation errors for invalid workflow input', async () => {
    // Arrange
    const mockBackendResponse = {
      valid: false,
      validationErrors: [
        'Required property "userId" is missing',
        'Property "age" must be a number',
      ],
      executionPlan: undefined,
    };

    vi.mocked(testWorkflow).mockResolvedValue(mockBackendResponse);

    const request = new NextRequest('http://localhost:3000/api/workflows/user-profile/test', {
      method: 'POST',
      body: JSON.stringify({ invalidField: 'test' }),
    });

    const params = Promise.resolve({ name: 'user-profile' });

    // Act
    const response = await POST(request, { params });
    const data = await response.json();

    // Assert
    expect(response.status).toBe(200); // Dry-run returns 200 even for validation errors
    expect(testWorkflow).toHaveBeenCalledWith('user-profile', { input: { invalidField: 'test' } });
    expect(data.valid).toBe(false);
    expect(data.validationErrors).toHaveLength(2);
    expect(data.validationErrors[0]).toContain('userId');
    expect(data.executionPlan).toBeUndefined();
  });

  it('should return 404 for non-existent workflow', async () => {
    // Arrange
    const notFoundError = new Error('HTTP 404: Workflow not found');
    vi.mocked(testWorkflow).mockRejectedValue(notFoundError);

    const request = new NextRequest('http://localhost:3000/api/workflows/non-existent/test', {
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
    vi.mocked(testWorkflow).mockRejectedValue(serverError);

    const request = new NextRequest('http://localhost:3000/api/workflows/user-profile/test', {
      method: 'POST',
      body: JSON.stringify({ userId: '1' }),
    });

    const params = Promise.resolve({ name: 'user-profile' });

    // Act
    const response = await POST(request, { params });
    const data = await response.json();

    // Assert
    expect(response.status).toBe(500);
    expect(data.error).toBe('Test failed');
    expect(data.message).toBeTruthy();
  });

  it('should return 400 for malformed JSON in request body', async () => {
    // Arrange
    const request = new NextRequest('http://localhost:3000/api/workflows/user-profile/test', {
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

  it('should show parallel execution groups in execution plan', async () => {
    // Arrange
    const mockBackendResponse = {
      valid: true,
      validationErrors: [],
      executionPlan: {
        nodes: [
          { id: 'task1', taskRef: 'fetch-user', level: 0 },
          { id: 'task2', taskRef: 'fetch-posts', level: 1 },
          { id: 'task3', taskRef: 'fetch-comments', level: 1 },
        ],
        edges: [
          { from: 'task1', to: 'task2' },
          { from: 'task1', to: 'task3' },
        ],
        parallelGroups: [{ level: 1, taskIds: ['task2', 'task3'] }],
        executionOrder: ['task1', 'task2', 'task3'],
        validationResult: {
          isValid: true,
          errors: [],
        },
        estimatedDurationMs: 300,
        templatePreviews: {},
      },
    };

    vi.mocked(testWorkflow).mockResolvedValue(mockBackendResponse);

    const request = new NextRequest('http://localhost:3000/api/workflows/parallel-workflow/test', {
      method: 'POST',
      body: JSON.stringify({ userId: '1' }),
    });

    const params = Promise.resolve({ name: 'parallel-workflow' });

    // Act
    const response = await POST(request, { params });
    const data = await response.json();

    // Assert
    expect(response.status).toBe(200);
    expect(data.valid).toBe(true);
    expect(data.executionPlan.parallelGroups).toHaveLength(1);
    expect(data.executionPlan.parallelGroups[0].taskIds).toEqual(['task2', 'task3']);
  });

  it('should include template previews with resolved values', async () => {
    // Arrange
    const mockBackendResponse = {
      valid: true,
      validationErrors: [],
      executionPlan: {
        nodes: [{ id: 'task1', taskRef: 'fetch-user', level: 0 }],
        edges: [],
        parallelGroups: [],
        executionOrder: ['task1'],
        validationResult: {
          isValid: true,
          errors: [],
        },
        estimatedDurationMs: 100,
        templatePreviews: {
          task1: {
            url: 'https://api.example.com/users/123',
            headers: 'Bearer token-from-input',
          },
        },
      },
    };

    vi.mocked(testWorkflow).mockResolvedValue(mockBackendResponse);

    const request = new NextRequest('http://localhost:3000/api/workflows/user-profile/test', {
      method: 'POST',
      body: JSON.stringify({ userId: '123', token: 'token-from-input' }),
    });

    const params = Promise.resolve({ name: 'user-profile' });

    // Act
    const response = await POST(request, { params });
    const data = await response.json();

    // Assert
    expect(response.status).toBe(200);
    expect(data.executionPlan.templatePreviews).toBeDefined();
    expect(data.executionPlan.templatePreviews.task1.url).toContain('123');
    expect(data.executionPlan.templatePreviews.task1.headers).toContain('token-from-input');
  });
});
