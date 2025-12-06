/**
 * Mock Executor
 * Local workflow execution with mock task responses
 */
import type { WorkflowDefinition, TaskDefinition } from '../loaders.js';
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
export declare class MockExecutor {
    private mockResponses;
    private defaultResponse;
    private delays;
    /**
     * Register a mock response for a task
     */
    registerMockResponse(taskRef: string, response: MockTaskResponse): void;
    /**
     * Get mock response for a task (consumes from queue)
     */
    getMockResponse(taskRef: string): MockTaskResponse | undefined;
    /**
     * Get all mock responses for a task
     */
    getAllMockResponses(taskRef: string): MockTaskResponse[];
    /**
     * Consume next mock response for a task
     */
    private consumeMockResponse;
    /**
     * Set default response for unregistered tasks
     */
    setDefaultResponse(response: MockTaskResponse): void;
    /**
     * Add simulated delay for a task
     */
    withDelay(taskRef: string, delayMs: number): void;
    /**
     * Execute workflow with mock responses
     */
    execute(workflow: WorkflowDefinition, _tasks: TaskDefinition[], input: Record<string, unknown>): Promise<MockExecutionResult>;
    /**
     * Build execution groups using topological sort
     */
    private buildExecutionGroups;
    /**
     * Resolve template expressions in an object
     */
    private resolveTemplates;
    /**
     * Resolve template expressions in a string
     */
    private resolveTemplateString;
    /**
     * Resolve a dot-notation path in the context
     */
    private resolvePath;
}
//# sourceMappingURL=mock-executor.d.ts.map