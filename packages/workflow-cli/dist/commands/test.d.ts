/**
 * Test Command (Dry-run)
 * Validate workflow and show execution plan without executing HTTP requests
 */
/**
 * Execution plan group
 */
export interface ExecutionPlanGroup {
    tasks: string[];
    parallel: boolean;
}
/**
 * Execution plan
 */
export interface ExecutionPlan {
    groups: ExecutionPlanGroup[];
}
/**
 * Test command options
 */
export interface TestOptions {
    input?: Record<string, unknown>;
    inputJson?: string;
    remote?: boolean;
    gatewayUrl?: string;
    namespace?: string;
    tasksPath?: string;
}
/**
 * Test command result
 */
export interface TestResult {
    valid: boolean;
    mode: 'local' | 'remote';
    workflowName: string;
    executionPlan?: ExecutionPlan;
    resolvedTemplates?: Record<string, string>;
    errors?: string[];
    warnings?: string[];
    error?: string;
    estimatedDuration?: number;
}
/**
 * Test/dry-run a workflow
 */
export declare function testWorkflow(workflowPath: string, options: TestOptions): Promise<TestResult>;
//# sourceMappingURL=test.d.ts.map