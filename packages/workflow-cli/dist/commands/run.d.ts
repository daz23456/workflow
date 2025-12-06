/**
 * Run Command
 * Execute a workflow locally (mock) or remotely (via Gateway)
 */
import { MockTaskResult } from '../services/mock-executor.js';
/**
 * Run command options
 */
export interface RunOptions {
    input?: Record<string, unknown>;
    inputJson?: string;
    remote?: boolean;
    gatewayUrl?: string;
    namespace?: string;
    tasksPath?: string;
    verbose?: boolean;
}
/**
 * Run command result
 */
export interface RunResult {
    success: boolean;
    mode: 'mock' | 'remote';
    workflowName: string;
    executionId?: string;
    status?: 'completed' | 'failed' | 'running';
    output?: Record<string, unknown>;
    duration?: number;
    error?: string;
    failedTask?: string;
    taskResults?: MockTaskResult[];
}
/**
 * Execute a workflow
 */
export declare function runWorkflow(workflowPath: string, options: RunOptions): Promise<RunResult>;
//# sourceMappingURL=run.d.ts.map