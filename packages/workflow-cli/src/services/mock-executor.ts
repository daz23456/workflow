/**
 * Mock Executor
 * Local workflow execution with mock task responses
 */

import type { WorkflowDefinition, TaskDefinition, WorkflowTaskRef } from '../loaders.js';

/**
 * Mock response for a task
 */
export interface MockTaskResponse {
  status: number;
  body: unknown;
  headers?: Record<string, string>;
}

/**
 * Task execution result
 */
export interface MockTaskResult {
  taskId: string;
  taskRef: string;
  status: 'completed' | 'failed' | 'skipped';
  output?: unknown;
  error?: string;
  resolvedInput?: Record<string, unknown>;
  duration: number;
}

/**
 * Workflow execution result
 */
export interface MockExecutionResult {
  executionId: string;
  status: 'completed' | 'failed';
  output: Record<string, unknown>;
  duration: number;
  taskResults: MockTaskResult[];
  parallelGroups: string[][];
  failedTask?: string;
  error?: string;
}

/**
 * Mock executor for local workflow testing
 */
export class MockExecutor {
  private mockResponses = new Map<string, MockTaskResponse[]>();
  private defaultResponse: MockTaskResponse | null = null;
  private delays = new Map<string, number>();

  /**
   * Register a mock response for a task
   */
  registerMockResponse(taskRef: string, response: MockTaskResponse): void {
    const existing = this.mockResponses.get(taskRef) || [];
    existing.push(response);
    this.mockResponses.set(taskRef, existing);
  }

  /**
   * Get mock response for a task (consumes from queue)
   */
  getMockResponse(taskRef: string): MockTaskResponse | undefined {
    const responses = this.mockResponses.get(taskRef);
    if (responses && responses.length > 0) {
      // Return first response but don't consume it for peek
      return responses[0];
    }
    return this.defaultResponse || undefined;
  }

  /**
   * Get all mock responses for a task
   */
  getAllMockResponses(taskRef: string): MockTaskResponse[] {
    return this.mockResponses.get(taskRef) || [];
  }

  /**
   * Consume next mock response for a task
   */
  private consumeMockResponse(taskRef: string): MockTaskResponse | undefined {
    const responses = this.mockResponses.get(taskRef);
    if (responses && responses.length > 0) {
      return responses.shift();
    }
    return this.defaultResponse || undefined;
  }

  /**
   * Set default response for unregistered tasks
   */
  setDefaultResponse(response: MockTaskResponse): void {
    this.defaultResponse = response;
  }

  /**
   * Add simulated delay for a task
   */
  withDelay(taskRef: string, delayMs: number): void {
    this.delays.set(taskRef, delayMs);
  }

  /**
   * Execute workflow with mock responses
   */
  async execute(
    workflow: WorkflowDefinition,
    _tasks: TaskDefinition[],
    input: Record<string, unknown>
  ): Promise<MockExecutionResult> {
    const startTime = Date.now();
    const executionId = `mock-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const taskResults: MockTaskResult[] = [];
    const taskOutputs = new Map<string, unknown>();
    const parallelGroups: string[][] = [];

    // Build context for template resolution
    const context = {
      input,
      tasks: {} as Record<string, { output: unknown }>
    };

    // Build execution groups (topological sort)
    const groups = this.buildExecutionGroups(workflow.spec.tasks);

    let failedTask: string | undefined;
    let workflowFailed = false;

    for (const group of groups) {
      parallelGroups.push(group);

      // Execute tasks in this group
      for (const taskId of group) {
        const taskDef = workflow.spec.tasks.find(t => t.id === taskId);
        if (!taskDef) continue;

        if (workflowFailed) {
          // Skip remaining tasks
          taskResults.push({
            taskId,
            taskRef: taskDef.taskRef,
            status: 'skipped',
            duration: 0
          });
          continue;
        }

        const taskStart = Date.now();

        // Resolve input templates
        const resolvedInput = this.resolveTemplates(taskDef.input || {}, context) as Record<string, unknown>;

        // Get mock response
        const response = this.consumeMockResponse(taskDef.taskRef) ||
                        this.defaultResponse ||
                        { status: 200, body: {} };

        // Apply delay if configured
        const delay = this.delays.get(taskDef.taskRef);
        if (delay) {
          await new Promise(resolve => setTimeout(resolve, delay));
        }

        const taskDuration = Date.now() - taskStart;

        if (response.status >= 400) {
          // Task failed
          workflowFailed = true;
          failedTask = taskId;

          taskResults.push({
            taskId,
            taskRef: taskDef.taskRef,
            status: 'failed',
            error: typeof response.body === 'object' && response.body !== null
              ? JSON.stringify(response.body)
              : String(response.body),
            resolvedInput,
            duration: taskDuration
          });
        } else {
          // Task succeeded
          taskOutputs.set(taskId, response.body);
          context.tasks[taskId] = { output: response.body };

          taskResults.push({
            taskId,
            taskRef: taskDef.taskRef,
            status: 'completed',
            output: response.body,
            resolvedInput,
            duration: taskDuration
          });
        }
      }
    }

    // Resolve output templates
    const output = this.resolveTemplates(workflow.spec.output || {}, context);

    return {
      executionId,
      status: workflowFailed ? 'failed' : 'completed',
      output: output as Record<string, unknown>,
      duration: Date.now() - startTime,
      taskResults,
      parallelGroups,
      failedTask,
      error: workflowFailed ? `Task ${failedTask} failed` : undefined
    };
  }

  /**
   * Build execution groups using topological sort
   */
  private buildExecutionGroups(tasks: WorkflowTaskRef[]): string[][] {
    const groups: string[][] = [];
    const completed = new Set<string>();
    const remaining = new Set(tasks.map(t => t.id));

    // Build dependency map
    const deps = new Map<string, string[]>();
    for (const task of tasks) {
      deps.set(task.id, task.dependsOn || []);
    }

    while (remaining.size > 0) {
      // Find all tasks with satisfied dependencies
      const ready: string[] = [];

      for (const taskId of remaining) {
        const taskDeps = deps.get(taskId) || [];
        if (taskDeps.every(d => completed.has(d))) {
          ready.push(taskId);
        }
      }

      if (ready.length === 0) {
        // Circular dependency - shouldn't happen with valid workflow
        break;
      }

      groups.push(ready.sort());

      for (const taskId of ready) {
        remaining.delete(taskId);
        completed.add(taskId);
      }
    }

    return groups;
  }

  /**
   * Resolve template expressions in an object
   */
  private resolveTemplates(
    obj: unknown,
    context: { input: Record<string, unknown>; tasks: Record<string, { output: unknown }> }
  ): unknown {
    if (typeof obj === 'string') {
      return this.resolveTemplateString(obj, context);
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.resolveTemplates(item, context));
    }

    if (obj && typeof obj === 'object') {
      const result: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(obj)) {
        result[key] = this.resolveTemplates(value, context);
      }
      return result;
    }

    return obj;
  }

  /**
   * Resolve template expressions in a string
   */
  private resolveTemplateString(
    str: string,
    context: { input: Record<string, unknown>; tasks: Record<string, { output: unknown }> }
  ): unknown {
    const pattern = /\{\{([^}]+)\}\}/g;

    // If the entire string is a template, return the resolved value directly
    const fullMatch = str.match(/^\{\{([^}]+)\}\}$/);
    if (fullMatch) {
      return this.resolvePath(fullMatch[1].trim(), context);
    }

    // Otherwise, replace template expressions with string values
    return str.replace(pattern, (_, path) => {
      const value = this.resolvePath(path.trim(), context);
      return value === undefined ? '' : String(value);
    });
  }

  /**
   * Resolve a dot-notation path in the context
   */
  private resolvePath(
    path: string,
    context: { input: Record<string, unknown>; tasks: Record<string, { output: unknown }> }
  ): unknown {
    const parts = path.split('.');
    let value: unknown = context;

    for (const part of parts) {
      if (value === null || value === undefined) return undefined;
      if (typeof value !== 'object') return undefined;
      value = (value as Record<string, unknown>)[part];
    }

    return value;
  }
}
