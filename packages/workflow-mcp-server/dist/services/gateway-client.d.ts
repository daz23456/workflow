import type { WorkflowTask, ValidationResult, DryRunResult, ExecuteWorkflowResult } from '../types/index.js';
/**
 * HTTP client for communicating with the Workflow Gateway API
 */
export declare class GatewayClient {
    readonly baseUrl: string;
    constructor(baseUrl?: string);
    /**
     * List all available workflow tasks
     */
    listTasks(): Promise<WorkflowTask[]>;
    /**
     * Get a single task by name
     */
    getTask(name: string): Promise<WorkflowTask>;
    /**
     * Validate a workflow YAML using the test-execute endpoint (dry-run mode)
     */
    validateWorkflow(yaml: string): Promise<ValidationResult>;
    /**
     * Dry-run a workflow with sample input (no actual HTTP calls)
     */
    dryRunWorkflow(yaml: string, sampleInput: Record<string, unknown>): Promise<DryRunResult>;
    /**
     * Execute a deployed workflow with actual input
     */
    executeWorkflow(workflowName: string, input: Record<string, unknown>): Promise<ExecuteWorkflowResult>;
}
//# sourceMappingURL=gateway-client.d.ts.map