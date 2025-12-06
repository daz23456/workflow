/**
 * Interactive Debugger Service
 * Breakpoint-based workflow debugging with step execution
 */
import type { WorkflowDefinition, TaskDefinition } from '../loaders.js';
/**
 * Mock response for task execution
 */
export interface MockTaskResponse {
    status: number;
    body: unknown;
}
/**
 * Breakpoint definition
 */
export interface Breakpoint {
    taskId: string;
    enabled: boolean;
    condition?: string;
    hitCount: number;
}
/**
 * Task context in debug session
 */
export interface TaskContext {
    output: unknown;
    status: 'pending' | 'completed' | 'failed' | 'skipped';
    duration?: number;
}
/**
 * Debug context
 */
export interface DebugContext {
    input: Record<string, unknown>;
    tasks: Record<string, TaskContext>;
}
/**
 * Debug state
 */
export type DebugState = 'ready' | 'running' | 'paused' | 'completed' | 'stopped' | 'failed';
/**
 * Execution history entry
 */
export interface HistoryEntry {
    taskId: string;
    taskRef: string;
    status: 'completed' | 'failed';
    output?: unknown;
    error?: string;
    duration: number;
    timestamp: number;
}
/**
 * Debug session
 */
export interface DebugSession {
    id: string;
    state: DebugState;
    workflow: WorkflowDefinition;
    tasks: TaskDefinition[];
    input: Record<string, unknown>;
    currentTask?: string;
    context: DebugContext;
    history: HistoryEntry[];
    executionOrder: string[];
    currentIndex: number;
}
/**
 * Interactive debugger for workflow execution
 */
export declare class Debugger {
    private breakpoints;
    private mockResponses;
    /**
     * Add breakpoint on task
     */
    addBreakpoint(taskId: string): void;
    /**
     * Remove breakpoint
     */
    removeBreakpoint(taskId: string): void;
    /**
     * Toggle breakpoint enabled state
     */
    toggleBreakpoint(taskId: string): void;
    /**
     * Check if breakpoint exists
     */
    hasBreakpoint(taskId: string): boolean;
    /**
     * List all breakpoints
     */
    listBreakpoints(): Breakpoint[];
    /**
     * Clear all breakpoints
     */
    clearBreakpoints(): void;
    /**
     * Set mock response for task
     */
    setMockResponse(taskRef: string, response: MockTaskResponse): void;
    /**
     * Create debug session
     */
    createSession(workflow: WorkflowDefinition, tasks: TaskDefinition[], input: Record<string, unknown>): DebugSession;
    /**
     * Start debug session
     */
    start(session: DebugSession): Promise<void>;
    /**
     * Step to next task
     */
    step(session: DebugSession): Promise<void>;
    /**
     * Continue to next breakpoint
     */
    continue(session: DebugSession): Promise<void>;
    /**
     * Stop debug session
     */
    stop(session: DebugSession): void;
    /**
     * Get current context
     */
    getContext(session: DebugSession): DebugContext;
    /**
     * Get resolved input for current task
     */
    getResolvedInput(session: DebugSession): Record<string, unknown>;
    /**
     * Get last task output
     */
    getLastOutput(session: DebugSession): unknown;
    /**
     * Set context value
     */
    setContextValue(session: DebugSession, path: string, value: unknown): void;
    /**
     * Get execution history
     */
    getHistory(session: DebugSession): HistoryEntry[];
    /**
     * Run until breakpoint or completion
     */
    private runUntilBreakpoint;
    /**
     * Execute current task
     */
    private executeCurrentTask;
    /**
     * Build execution order using topological sort
     */
    private buildExecutionOrder;
    /**
     * Resolve template expressions
     */
    private resolveTemplates;
    /**
     * Resolve template string
     */
    private resolveTemplateString;
    /**
     * Resolve dot-notation path
     */
    private resolvePath;
}
//# sourceMappingURL=debugger.d.ts.map