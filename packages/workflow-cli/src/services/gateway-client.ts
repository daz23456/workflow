/**
 * Gateway Client
 * HTTP client for WorkflowGateway API
 */

/**
 * Custom error for Gateway API errors
 */
export class GatewayError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public details?: string[]
  ) {
    super(message);
    this.name = 'GatewayError';
  }
}

/**
 * Workflow summary from list endpoint
 */
export interface WorkflowSummary {
  name: string;
  namespace: string;
}

/**
 * Task summary from list endpoint
 */
export interface TaskSummary {
  name: string;
  namespace: string;
  type: string;
}

/**
 * Workflow execution result
 */
export interface ExecutionResult {
  executionId: string;
  status: 'completed' | 'failed' | 'running';
  output?: Record<string, unknown>;
  error?: string;
  failedTask?: string;
  duration?: number;
}

/**
 * Task result within execution
 */
export interface TaskResult {
  taskId: string;
  status: string;
  duration?: number;
  output?: unknown;
  error?: string;
}

/**
 * Execution details
 */
export interface ExecutionDetails {
  executionId: string;
  workflowName: string;
  status: string;
  startTime: string;
  endTime?: string;
  taskResults: TaskResult[];
}

/**
 * Execution group in plan
 */
export interface ExecutionPlanGroup {
  tasks: string[];
  parallel: boolean;
}

/**
 * Execution plan from dry run
 */
export interface ExecutionPlan {
  groups: ExecutionPlanGroup[];
}

/**
 * Dry run result
 */
export interface DryRunResult {
  valid: boolean;
  executionPlan?: ExecutionPlan;
  resolvedTemplates?: Record<string, string>;
  errors?: string[];
  warnings?: string[];
}

/**
 * Workflow details
 */
export interface WorkflowDetails {
  name: string;
  namespace: string;
  spec: {
    tasks: Array<{
      id: string;
      taskRef: string;
      dependsOn?: string[];
    }>;
  };
}

/**
 * Gateway client for WorkflowGateway API
 */
export class GatewayClient {
  public readonly baseUrl: string;
  public readonly namespace?: string;

  constructor(baseUrl: string, namespace?: string) {
    // Remove trailing slash
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.namespace = namespace;
  }

  /**
   * Make HTTP request to gateway
   */
  private async request<T>(
    path: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    });

    if (!response.ok) {
      if (response.status === 404) {
        return null as T;
      }

      let details: string[] | undefined;
      try {
        const body = await response.json() as { details?: string[] };
        details = body.details;
      } catch {
        // Ignore JSON parse errors
      }

      throw new GatewayError(
        `Gateway request failed: ${response.statusText}`,
        response.status,
        details
      );
    }

    return response.json() as Promise<T>;
  }

  /**
   * List all workflows
   */
  async listWorkflows(namespace?: string): Promise<WorkflowSummary[]> {
    const ns = namespace || this.namespace;
    const query = ns ? `?namespace=${encodeURIComponent(ns)}` : '';
    const result = await this.request<{ workflows: WorkflowSummary[] }>(
      `/api/v1/workflows${query}`,
      { method: 'GET' }
    );
    return result.workflows;
  }

  /**
   * List all tasks
   */
  async listTasks(namespace?: string): Promise<TaskSummary[]> {
    const ns = namespace || this.namespace;
    const query = ns ? `?namespace=${encodeURIComponent(ns)}` : '';
    const result = await this.request<{ tasks: TaskSummary[] }>(
      `/api/v1/tasks${query}`,
      { method: 'GET' }
    );
    return result.tasks;
  }

  /**
   * Execute a workflow
   */
  async executeWorkflow(
    name: string,
    input: Record<string, unknown>,
    namespace?: string
  ): Promise<ExecutionResult> {
    const ns = namespace || this.namespace;
    const query = ns ? `?namespace=${encodeURIComponent(ns)}` : '';
    return this.request<ExecutionResult>(
      `/api/v1/workflows/${encodeURIComponent(name)}/execute${query}`,
      {
        method: 'POST',
        body: JSON.stringify({ input })
      }
    );
  }

  /**
   * Dry run a workflow (test without execution)
   */
  async dryRunWorkflow(
    name: string,
    input: Record<string, unknown>,
    namespace?: string
  ): Promise<DryRunResult> {
    const ns = namespace || this.namespace;
    const query = ns ? `?namespace=${encodeURIComponent(ns)}` : '';
    return this.request<DryRunResult>(
      `/api/v1/workflows/${encodeURIComponent(name)}/test${query}`,
      {
        method: 'POST',
        body: JSON.stringify({ input })
      }
    );
  }

  /**
   * Get workflow details
   */
  async getWorkflow(name: string, namespace?: string): Promise<WorkflowDetails | null> {
    const ns = namespace || this.namespace;
    const query = ns ? `?namespace=${encodeURIComponent(ns)}` : '';
    return this.request<WorkflowDetails | null>(
      `/api/v1/workflows/${encodeURIComponent(name)}${query}`,
      { method: 'GET' }
    );
  }

  /**
   * Get execution details
   */
  async getExecution(executionId: string): Promise<ExecutionDetails | null> {
    return this.request<ExecutionDetails | null>(
      `/api/v1/executions/${encodeURIComponent(executionId)}`,
      { method: 'GET' }
    );
  }

  /**
   * Check gateway health
   */
  async health(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`, { method: 'GET' });
      return response.ok;
    } catch {
      return false;
    }
  }
}
