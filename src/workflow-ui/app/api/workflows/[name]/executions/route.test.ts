/**
 * Tests for List Workflow Executions API Route
 *
 * TDD NOTE: This test was written AFTER the bug was discovered.
 * It should have been written FIRST before implementing the route.
 * This is a TDD failure that allowed the bug to slip through.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from './route';

// Mock the API client
vi.mock('@/lib/api/client', () => ({
  listWorkflowExecutions: vi.fn(),
}));

import { listWorkflowExecutions } from '@/lib/api/client';

describe('GET /api/workflows/[name]/executions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return full response object with executions, total, limit, offset', async () => {
    // Arrange
    const mockResponse = {
      executions: [
        {
          id: 'exec-1',
          workflowName: 'test-workflow',
          status: 'Succeeded' as const,
          startedAt: '2025-11-25T10:00:00Z',
          completedAt: '2025-11-25T10:00:03Z',
          durationMs: 3000,
        },
        {
          id: 'exec-2',
          workflowName: 'test-workflow',
          status: 'Failed' as const,
          startedAt: '2025-11-25T09:30:00Z',
          completedAt: '2025-11-25T09:30:02Z',
          durationMs: 2000,
        },
      ],
      totalCount: 50,
      take: 10,
      skip: 0,
    };

    vi.mocked(listWorkflowExecutions).mockResolvedValue(mockResponse);

    const request = new NextRequest(
      'http://localhost:3000/api/workflows/test-workflow/executions?limit=10&offset=0'
    );
    const params = Promise.resolve({ name: 'test-workflow' });

    // Act
    const response = await GET(request, { params });
    const data = await response.json();

    // Assert - THE CRITICAL TEST THAT WOULD HAVE CAUGHT THE BUG!
    expect(response.status).toBe(200);
    expect(data).toHaveProperty('executions');
    expect(data).toHaveProperty('totalCount');
    expect(data).toHaveProperty('take');
    expect(data).toHaveProperty('skip');
    expect(data.executions).toBeInstanceOf(Array);
    expect(data.executions).toHaveLength(2);
    expect(data.totalCount).toBe(50);
    expect(data.take).toBe(10);
    expect(data.skip).toBe(0);
  });

  it('should NOT return just an array (regression test for the bug)', async () => {
    // Arrange
    const mockResponse = {
      executions: [
        {
          id: 'exec-1',
          workflowName: 'test',
          status: 'Succeeded' as const,
          startedAt: '2025-11-25T10:00:00Z',
          durationMs: 100,
        },
      ],
      totalCount: 1,
      take: 10,
      skip: 0,
    };

    vi.mocked(listWorkflowExecutions).mockResolvedValue(mockResponse);

    const request = new NextRequest('http://localhost:3000/api/workflows/test/executions');
    const params = Promise.resolve({ name: 'test' });

    // Act
    const response = await GET(request, { params });
    const data = await response.json();

    // Assert - Ensure we're NOT just returning the array
    expect(Array.isArray(data)).toBe(false);
    expect(data).toBeInstanceOf(Object);
    expect(data.executions).toBeDefined();
  });

  it('should map limit/offset parameters to take/skip for backend', async () => {
    // Arrange
    const mockResponse = {
      executions: [],
      totalCount: 0,
      take: 20,
      skip: 10,
    };

    vi.mocked(listWorkflowExecutions).mockResolvedValue(mockResponse);

    const request = new NextRequest(
      'http://localhost:3000/api/workflows/test-workflow/executions?limit=20&offset=10'
    );
    const params = Promise.resolve({ name: 'test-workflow' });

    // Act
    await GET(request, { params });

    // Assert - Verify parameter mapping (limit→take, offset→skip)
    expect(listWorkflowExecutions).toHaveBeenCalledWith('test-workflow', {
      namespace: undefined,
      status: undefined,
      skip: 10,
      take: 20,
    });
  });

  it('should accept both limit/offset and take/skip parameter names', async () => {
    // Arrange - Test legacy take/skip parameters
    const mockResponse = {
      executions: [],
      totalCount: 0,
      take: 5,
      skip: 15,
    };

    vi.mocked(listWorkflowExecutions).mockResolvedValue(mockResponse);

    const request = new NextRequest(
      'http://localhost:3000/api/workflows/test-workflow/executions?take=5&skip=15'
    );
    const params = Promise.resolve({ name: 'test-workflow' });

    // Act
    await GET(request, { params });

    // Assert - Should map take/skip correctly
    expect(listWorkflowExecutions).toHaveBeenCalledWith('test-workflow', {
      namespace: undefined,
      status: undefined,
      skip: 15,
      take: 5,
    });
  });

  it('should prefer take/skip over limit/offset when both are provided', async () => {
    // Arrange - Test parameter precedence
    const mockResponse = {
      executions: [],
      totalCount: 0,
      take: 100,
      skip: 200,
    };

    vi.mocked(listWorkflowExecutions).mockResolvedValue(mockResponse);

    const request = new NextRequest(
      'http://localhost:3000/api/workflows/test/executions?take=100&skip=200&limit=10&offset=20'
    );
    const params = Promise.resolve({ name: 'test' });

    // Act
    await GET(request, { params });

    // Assert - take/skip should take precedence
    expect(listWorkflowExecutions).toHaveBeenCalledWith('test', {
      namespace: undefined,
      status: undefined,
      skip: 200,
      take: 100,
    });
  });

  it('should pass status filter to backend', async () => {
    // Arrange
    const mockResponse = {
      executions: [],
      totalCount: 0,
      take: 10,
      skip: 0,
    };

    vi.mocked(listWorkflowExecutions).mockResolvedValue(mockResponse);

    const request = new NextRequest(
      'http://localhost:3000/api/workflows/test-workflow/executions?status=failed'
    );
    const params = Promise.resolve({ name: 'test-workflow' });

    // Act
    await GET(request, { params });

    // Assert
    expect(listWorkflowExecutions).toHaveBeenCalledWith('test-workflow', {
      namespace: undefined,
      status: 'failed',
      skip: undefined,
      take: undefined,
    });
  });

  it('should pass namespace filter to backend', async () => {
    // Arrange
    const mockResponse = {
      executions: [],
      totalCount: 0,
      take: 10,
      skip: 0,
    };

    vi.mocked(listWorkflowExecutions).mockResolvedValue(mockResponse);

    const request = new NextRequest(
      'http://localhost:3000/api/workflows/test/executions?namespace=production'
    );
    const params = Promise.resolve({ name: 'test' });

    // Act
    await GET(request, { params });

    // Assert
    expect(listWorkflowExecutions).toHaveBeenCalledWith('test', {
      namespace: 'production',
      status: undefined,
      skip: undefined,
      take: undefined,
    });
  });

  it('should handle multiple filters simultaneously', async () => {
    // Arrange
    const mockResponse = {
      executions: [],
      totalCount: 5,
      take: 20,
      skip: 40,
    };

    vi.mocked(listWorkflowExecutions).mockResolvedValue(mockResponse);

    const request = new NextRequest(
      'http://localhost:3000/api/workflows/test/executions?namespace=staging&status=success&limit=20&offset=40'
    );
    const params = Promise.resolve({ name: 'test' });

    // Act
    await GET(request, { params });

    // Assert
    expect(listWorkflowExecutions).toHaveBeenCalledWith('test', {
      namespace: 'staging',
      status: 'success',
      skip: 40,
      take: 20,
    });
  });

  it('should handle empty execution history', async () => {
    // Arrange
    const mockResponse = {
      executions: [],
      totalCount: 0,
      take: 10,
      skip: 0,
    };

    vi.mocked(listWorkflowExecutions).mockResolvedValue(mockResponse);

    const request = new NextRequest(
      'http://localhost:3000/api/workflows/empty-workflow/executions'
    );
    const params = Promise.resolve({ name: 'empty-workflow' });

    // Act
    const response = await GET(request, { params });
    const data = await response.json();

    // Assert
    expect(response.status).toBe(200);
    expect(data.executions).toEqual([]);
    expect(data.totalCount).toBe(0);
  });

  it('should return 500 for backend errors', async () => {
    // Arrange
    const serverError = new Error('Database connection failed');
    vi.mocked(listWorkflowExecutions).mockRejectedValue(serverError);

    const request = new NextRequest('http://localhost:3000/api/workflows/test/executions');
    const params = Promise.resolve({ name: 'test' });

    // Act
    const response = await GET(request, { params });
    const data = await response.json();

    // Assert
    expect(response.status).toBe(500);
    expect(data.error).toBe('Failed to fetch executions');
    expect(data.message).toBeTruthy();
  });

  it('should include error details in response for debugging', async () => {
    // Arrange
    const error = new Error('Specific error message');
    vi.mocked(listWorkflowExecutions).mockRejectedValue(error);

    const request = new NextRequest('http://localhost:3000/api/workflows/test/executions');
    const params = Promise.resolve({ name: 'test' });

    // Act
    const response = await GET(request, { params });
    const data = await response.json();

    // Assert
    expect(data.error).toBe('Failed to fetch executions');
    expect(data.message).toBe('Specific error message');
  });

  it('should handle non-Error exceptions gracefully', async () => {
    // Arrange
    vi.mocked(listWorkflowExecutions).mockRejectedValue('String error');

    const request = new NextRequest('http://localhost:3000/api/workflows/test/executions');
    const params = Promise.resolve({ name: 'test' });

    // Act
    const response = await GET(request, { params });
    const data = await response.json();

    // Assert
    expect(response.status).toBe(500);
    expect(data.error).toBe('Failed to fetch executions');
    expect(data.message).toBe('Unknown error occurred');
  });

  it('should parse pagination parameters as integers', async () => {
    // Arrange
    const mockResponse = {
      executions: [],
      totalCount: 0,
      take: 25,
      skip: 50,
    };

    vi.mocked(listWorkflowExecutions).mockResolvedValue(mockResponse);

    const request = new NextRequest(
      'http://localhost:3000/api/workflows/test/executions?limit=25&offset=50'
    );
    const params = Promise.resolve({ name: 'test' });

    // Act
    await GET(request, { params });

    // Assert - Ensure numbers, not strings
    expect(listWorkflowExecutions).toHaveBeenCalledWith('test', {
      namespace: undefined,
      status: undefined,
      skip: 50,
      take: 25,
    });
  });
});
