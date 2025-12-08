/**
 * HTTP client for consuming workflows from the Workflow Gateway API
 * Stage 15: MCP Server for External Workflow Consumption
 */

import type {
  GatewayWorkflowResponse,
  GatewayWorkflowsListResponse,
  GatewayWorkflowStatsResponse,
  LabelListResponse,
  BulkLabelsRequest,
  ManageLabelsResult,
  TaskDefinition
} from '../types.js';

/**
 * Input validation result from gateway
 */
export interface ValidationInputResult {
  valid: boolean;
  missingInputs: Array<{ field: string; type: string; description?: string }>;
  invalidInputs: Array<{ field: string; error: string; received?: unknown }>;
  suggestedPrompt?: string;
}

/**
 * Execution result from gateway
 */
export interface ExecutionResult {
  executionId: string;
  status: 'completed' | 'failed';
  output: Record<string, unknown>;
  taskResults: Array<{
    taskId: string;
    status: string;
    durationMs: number;
    output?: Record<string, unknown>;
    error?: string;
  }>;
  durationMs: number;
}

/**
 * Consumer gateway client interface
 */
export interface ConsumerGatewayClient {
  listWorkflows(): Promise<GatewayWorkflowResponse[]>;
  getWorkflow(name: string): Promise<GatewayWorkflowResponse>;
  getWorkflowStats(name: string): Promise<GatewayWorkflowStatsResponse | null>;
  validateInput(workflowName: string, input: Record<string, unknown>): Promise<ValidationInputResult>;
  executeWorkflow(workflowName: string, input: Record<string, unknown>): Promise<ExecutionResult>;

  // Stage 32.3: Label API methods
  getLabels(): Promise<LabelListResponse>;
  listTasks(): Promise<TaskDefinition[]>;
  getWorkflowsByTags(tags?: string[], anyTags?: string[], excludeTags?: string[]): Promise<GatewayWorkflowResponse[]>;
  getTasksByTags(tags?: string[], anyTags?: string[], excludeTags?: string[]): Promise<TaskDefinition[]>;
  bulkUpdateWorkflowLabels(request: BulkLabelsRequest): Promise<ManageLabelsResult>;
  bulkUpdateTaskLabels(request: BulkLabelsRequest): Promise<ManageLabelsResult>;
}

/**
 * HTTP implementation of the consumer gateway client
 */
export class HttpConsumerGatewayClient implements ConsumerGatewayClient {
  public readonly baseUrl: string;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl ?? process.env.WORKFLOW_GATEWAY_URL ?? 'http://localhost:5001';
  }

  /**
   * List all available workflows with metadata
   */
  async listWorkflows(): Promise<GatewayWorkflowResponse[]> {
    const response = await fetch(`${this.baseUrl}/api/v1/workflows`);

    if (!response.ok) {
      throw new Error(`Failed to fetch workflows: ${response.status} ${response.statusText}`);
    }

    const result = await response.json() as GatewayWorkflowsListResponse | GatewayWorkflowResponse[];

    // Handle both {workflows: [...]} and [...] response formats
    return Array.isArray(result) ? result : result.workflows;
  }

  /**
   * Get a single workflow by name with full details
   */
  async getWorkflow(name: string): Promise<GatewayWorkflowResponse> {
    const response = await fetch(`${this.baseUrl}/api/v1/workflows/${encodeURIComponent(name)}`);

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(`Workflow not found: ${name}`);
      }
      throw new Error(`Failed to fetch workflow: ${response.status} ${response.statusText}`);
    }

    return response.json() as Promise<GatewayWorkflowResponse>;
  }

  /**
   * Get workflow execution statistics
   */
  async getWorkflowStats(name: string): Promise<GatewayWorkflowStatsResponse | null> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/workflows/${encodeURIComponent(name)}/stats`);

      if (!response.ok) {
        // Stats might not be available - return null instead of throwing
        return null;
      }

      return response.json() as Promise<GatewayWorkflowStatsResponse>;
    } catch {
      // Stats endpoint might not exist - return null
      return null;
    }
  }

  /**
   * Validate workflow input before execution
   */
  async validateInput(workflowName: string, input: Record<string, unknown>): Promise<ValidationInputResult> {
    const response = await fetch(
      `${this.baseUrl}/api/v1/workflows/${encodeURIComponent(workflowName)}/validate-input`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input })
      }
    );

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(`Workflow not found: ${workflowName}`);
      }
      throw new Error(`Failed to validate input: ${response.status} ${response.statusText}`);
    }

    return response.json() as Promise<ValidationInputResult>;
  }

  /**
   * Execute a workflow with input
   */
  async executeWorkflow(workflowName: string, input: Record<string, unknown>): Promise<ExecutionResult> {
    const response = await fetch(
      `${this.baseUrl}/api/v1/workflows/${encodeURIComponent(workflowName)}/execute`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input })
      }
    );

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(`Workflow not found: ${workflowName}`);
      }
      throw new Error(`Failed to execute workflow: ${response.status} ${response.statusText}`);
    }

    return response.json() as Promise<ExecutionResult>;
  }

  // ============================================
  // Stage 32.3: Label API methods
  // ============================================

  /**
   * Get all labels with usage counts
   */
  async getLabels(): Promise<LabelListResponse> {
    const response = await fetch(`${this.baseUrl}/api/v1/labels`);

    if (!response.ok) {
      throw new Error(`Failed to fetch labels: ${response.status} ${response.statusText}`);
    }

    return response.json() as Promise<LabelListResponse>;
  }

  /**
   * List all task definitions
   */
  async listTasks(): Promise<TaskDefinition[]> {
    const response = await fetch(`${this.baseUrl}/api/v1/tasks`);

    if (!response.ok) {
      throw new Error(`Failed to fetch tasks: ${response.status} ${response.statusText}`);
    }

    const result = await response.json() as { tasks: TaskDefinition[] } | TaskDefinition[];
    return Array.isArray(result) ? result : result.tasks;
  }

  /**
   * Get workflows filtered by tags
   */
  async getWorkflowsByTags(
    tags?: string[],
    anyTags?: string[],
    excludeTags?: string[]
  ): Promise<GatewayWorkflowResponse[]> {
    const params = new URLSearchParams();

    if (tags && tags.length > 0) {
      tags.forEach(tag => params.append('tags', tag));
    }
    if (anyTags && anyTags.length > 0) {
      anyTags.forEach(tag => params.append('anyTags', tag));
    }
    if (excludeTags && excludeTags.length > 0) {
      excludeTags.forEach(tag => params.append('excludeTags', tag));
    }

    const url = `${this.baseUrl}/api/v1/workflows/by-tags${params.toString() ? '?' + params.toString() : ''}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Failed to fetch workflows by tags: ${response.status} ${response.statusText}`);
    }

    const result = await response.json() as { workflows: GatewayWorkflowResponse[] } | GatewayWorkflowResponse[];
    return Array.isArray(result) ? result : result.workflows;
  }

  /**
   * Get tasks filtered by tags
   */
  async getTasksByTags(
    tags?: string[],
    anyTags?: string[],
    excludeTags?: string[]
  ): Promise<TaskDefinition[]> {
    const params = new URLSearchParams();

    if (tags && tags.length > 0) {
      tags.forEach(tag => params.append('tags', tag));
    }
    if (anyTags && anyTags.length > 0) {
      anyTags.forEach(tag => params.append('anyTags', tag));
    }
    if (excludeTags && excludeTags.length > 0) {
      excludeTags.forEach(tag => params.append('excludeTags', tag));
    }

    const url = `${this.baseUrl}/api/v1/tasks/by-tags${params.toString() ? '?' + params.toString() : ''}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Failed to fetch tasks by tags: ${response.status} ${response.statusText}`);
    }

    const result = await response.json() as { tasks: TaskDefinition[] } | TaskDefinition[];
    return Array.isArray(result) ? result : result.tasks;
  }

  /**
   * Bulk update workflow labels
   */
  async bulkUpdateWorkflowLabels(request: BulkLabelsRequest): Promise<ManageLabelsResult> {
    const response = await fetch(
      `${this.baseUrl}/api/v1/workflows/labels/bulk`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request)
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to update workflow labels: ${response.status} ${response.statusText}`);
    }

    return response.json() as Promise<ManageLabelsResult>;
  }

  /**
   * Bulk update task labels
   */
  async bulkUpdateTaskLabels(request: BulkLabelsRequest): Promise<ManageLabelsResult> {
    const response = await fetch(
      `${this.baseUrl}/api/v1/tasks/labels/bulk`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request)
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to update task labels: ${response.status} ${response.statusText}`);
    }

    return response.json() as Promise<ManageLabelsResult>;
  }
}
