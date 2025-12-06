/**
 * Explain Command
 * Show workflow execution plan with dependency graph
 */
/**
 * Execution group for parallel tasks
 */
export interface ExecutionGroup {
    groupIndex: number;
    tasks: string[];
    parallel: boolean;
    dependsOn: number[];
}
/**
 * Task explanation with dependencies
 */
export interface TaskExplanation {
    id: string;
    taskRef: string;
    dependsOn: string[];
    inputRefs: string[];
}
/**
 * Result of explain command
 */
export interface ExplainResult {
    success: boolean;
    error?: string;
    workflowName: string;
    namespace: string;
    description?: string;
    totalTasks: number;
    groups: ExecutionGroup[];
    tasks: TaskExplanation[];
    maxParallelWidth: number;
    executionDepth: number;
    criticalPath: string[];
}
/**
 * Options for explain command
 */
export interface ExplainOptions {
    tasksPath?: string;
}
/**
 * Explain a workflow's execution plan
 */
export declare function explainWorkflow(workflowPath: string, options?: ExplainOptions): Promise<ExplainResult>;
//# sourceMappingURL=explain.d.ts.map