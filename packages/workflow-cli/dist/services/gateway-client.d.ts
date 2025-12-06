/**
 * Gateway Client
 * HTTP client for WorkflowGateway API
 */
/**
 * Custom error for Gateway API errors
 */
export declare class GatewayError extends Error {
    statusCode: number;
    details?: string[] | undefined;
    constructor(message: string, statusCode: number, details?: string[] | undefined);
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
export declare class GatewayClient {
    readonly baseUrl: string;
    readonly namespace?: string;
    constructor(baseUrl: string, namespace?: string);
    /**
     * Make HTTP request to gateway
     */
    private request;
    /**
     * List all workflows
     */
    listWorkflows(namespace?: string): Promise<WorkflowSummary[]>;
    /**
     * List all tasks
     */
    listTasks(namespace?: string): Promise<TaskSummary[]>;
    /**
     * Execute a workflow
     */
    executeWorkflow(name: string, input: Record<string, unknown>, namespace?: string): Promise<ExecutionResult>;
    /**
     * Dry run a workflow (test without execution)
     */
    dryRunWorkflow(name: string, input: Record<string, unknown>, namespace?: string): Promise<DryRunResult>;
    /**
     * Get workflow details
     */
    getWorkflow(name: string, namespace?: string): Promise<WorkflowDetails | null>;
    /**
     * Get execution details
     */
    getExecution(executionId: string): Promise<ExecutionDetails | null>;
    /**
     * Check gateway health
     */
    health(): Promise<boolean>;
}
//# sourceMappingURL=gateway-client.d.ts.map