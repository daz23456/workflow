/**
 * API client for WorkflowGateway backend
 * Provides typed functions for all backend endpoints
 */

import type {
  WorkflowListResponse,
  TaskListResponse,
  WorkflowDetailResponse,
  WorkflowExecutionRequest,
  WorkflowExecutionResponse,
  WorkflowTestRequest,
  WorkflowTestResponse,
  ExecutionListResponse,
  DetailedWorkflowExecutionResponse,
  ExecutionTraceResponse,
  WorkflowVersionListResponse,
  ApiError,
  ExecutionStatus,
} from './types';

// Get API base URL from environment variable
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:5000/api/v1';

/**
 * Base fetch wrapper with error handling
 */
async function apiFetch<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    // If response is not OK, try to parse error
    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      try {
        const errorData: ApiError = await response.json();
        errorMessage = errorData.message || errorMessage;
      } catch {
        // If error response is not JSON, use status text
      }
      throw new Error(errorMessage);
    }

    return await response.json();
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Unknown error occurred while calling API');
  }
}

// ============================================================================
// Workflow Management API
// ============================================================================

/**
 * List all workflows
 * GET /api/v1/workflows
 */
export async function listWorkflows(namespace?: string): Promise<WorkflowListResponse> {
  const query = namespace ? `?namespace=${encodeURIComponent(namespace)}` : '';
  return apiFetch<WorkflowListResponse>(`/workflows${query}`);
}

/**
 * List all workflow tasks
 * GET /api/v1/tasks
 */
export async function listTasks(namespace?: string): Promise<TaskListResponse> {
  const query = namespace ? `?namespace=${encodeURIComponent(namespace)}` : '';
  return apiFetch<TaskListResponse>(`/tasks${query}`);
}

/**
 * Get workflow version history
 * GET /api/v1/workflows/{name}/versions
 */
export async function getWorkflowVersions(name: string): Promise<WorkflowVersionListResponse> {
  return apiFetch<WorkflowVersionListResponse>(`/workflows/${encodeURIComponent(name)}/versions`);
}

// ============================================================================
// Workflow Execution API
// ============================================================================

/**
 * Get workflow details
 * GET /api/v1/workflows/{name}
 */
export async function getWorkflowDetail(name: string): Promise<WorkflowDetailResponse> {
  return apiFetch<WorkflowDetailResponse>(`/workflows/${encodeURIComponent(name)}`);
}

/**
 * Execute workflow
 * POST /api/v1/workflows/{name}/execute
 */
export async function executeWorkflow(
  name: string,
  request: WorkflowExecutionRequest
): Promise<WorkflowExecutionResponse> {
  return apiFetch<WorkflowExecutionResponse>(`/workflows/${encodeURIComponent(name)}/execute`, {
    method: 'POST',
    body: JSON.stringify(request),
  });
}

/**
 * Test workflow (dry-run)
 * POST /api/v1/workflows/{name}/test
 */
export async function testWorkflow(
  name: string,
  request: WorkflowTestRequest
): Promise<WorkflowTestResponse> {
  return apiFetch<WorkflowTestResponse>(`/workflows/${encodeURIComponent(name)}/test`, {
    method: 'POST',
    body: JSON.stringify(request),
  });
}

/**
 * List workflow executions
 * GET /api/v1/workflows/{name}/executions
 */
export async function listWorkflowExecutions(
  name: string,
  options?: {
    namespace?: string;
    status?: ExecutionStatus;
    skip?: number;
    take?: number;
  }
): Promise<ExecutionListResponse> {
  const params = new URLSearchParams();
  if (options?.namespace) params.append('namespace', options.namespace);
  if (options?.status) params.append('status', options.status);
  if (options?.skip !== undefined) params.append('skip', options.skip.toString());
  if (options?.take !== undefined) params.append('take', options.take.toString());

  const query = params.toString() ? `?${params.toString()}` : '';
  return apiFetch<ExecutionListResponse>(`/workflows/${encodeURIComponent(name)}/executions${query}`);
}

// ============================================================================
// Execution History API
// ============================================================================

/**
 * List executions for a workflow (alternative endpoint)
 * GET /api/v1/executions/workflows/{name}/list
 */
export async function listExecutionsForWorkflow(
  name: string,
  options?: {
    status?: ExecutionStatus;
    skip?: number;
    take?: number;
  }
): Promise<ExecutionListResponse> {
  const params = new URLSearchParams();
  if (options?.status) params.append('status', options.status);
  if (options?.skip !== undefined) params.append('skip', options.skip.toString());
  if (options?.take !== undefined) params.append('take', options.take.toString());

  const query = params.toString() ? `?${params.toString()}` : '';
  return apiFetch<ExecutionListResponse>(`/executions/workflows/${encodeURIComponent(name)}/list${query}`);
}

/**
 * Get detailed execution information
 * GET /api/v1/executions/{id}
 */
export async function getExecutionDetail(id: string): Promise<DetailedWorkflowExecutionResponse> {
  return apiFetch<DetailedWorkflowExecutionResponse>(`/executions/${encodeURIComponent(id)}`);
}

/**
 * Get execution trace with detailed timing analysis
 * GET /api/v1/executions/{id}/trace
 */
export async function getExecutionTrace(id: string): Promise<ExecutionTraceResponse> {
  return apiFetch<ExecutionTraceResponse>(`/executions/${encodeURIComponent(id)}/trace`);
}

// ============================================================================
// Health Check API (for monitoring)
// ============================================================================

/**
 * Check API health
 * GET /health
 */
export async function checkHealth(): Promise<{ status: string }> {
  const url = API_BASE_URL.replace('/api/v1', '/health');
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Health check failed');
  }
  return { status: 'healthy' };
}
