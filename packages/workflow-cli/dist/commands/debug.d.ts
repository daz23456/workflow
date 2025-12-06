/**
 * Debug Command
 * Interactive workflow debugging with breakpoints and step execution
 */
import { Breakpoint, DebugContext, HistoryEntry, MockTaskResponse, DebugState } from '../services/debugger.js';
/**
 * Debug command options
 */
export interface DebugOptions {
    input?: Record<string, unknown>;
    inputJson?: string;
    tasksPath?: string;
    breakpoints?: string[];
}
/**
 * Debug command result
 */
export interface DebugCommandResult {
    success: boolean;
    sessionId?: string;
    state?: DebugState;
    currentTask?: string;
    breakpoints?: Breakpoint[];
    executionOrder?: string[];
    error?: string;
}
/**
 * Debug session state info
 */
export interface DebugSessionState {
    sessionId: string;
    state: DebugState;
    currentTask?: string;
    executionOrder: string[];
    currentIndex: number;
}
/**
 * Start a debug session for a workflow
 */
export declare function debugWorkflow(workflowPath: string, options: DebugOptions): Promise<DebugCommandResult>;
/**
 * Interactive debug command class for step-by-step debugging
 */
export declare class DebugCommand {
    private debugger_;
    private session;
    private workflow;
    private tasks;
    private input;
    private workflowPath;
    private options;
    constructor(workflowPath: string, options: DebugOptions);
    /**
     * Initialize the debug session
     */
    initialize(): Promise<DebugCommandResult>;
    /**
     * Step to next task
     */
    step(): Promise<DebugSessionState>;
    /**
     * Continue to next breakpoint
     */
    continue(): Promise<DebugSessionState>;
    /**
     * Stop debug session
     */
    stop(): DebugSessionState;
    /**
     * Get current context
     */
    getContext(): DebugContext;
    /**
     * Get resolved input for current task
     */
    getResolvedInput(): Record<string, unknown>;
    /**
     * Set context value
     */
    setContextValue(path: string, value: unknown): void;
    /**
     * Get execution history
     */
    getHistory(): HistoryEntry[];
    /**
     * Add breakpoint
     */
    addBreakpoint(taskId: string): void;
    /**
     * Remove breakpoint
     */
    removeBreakpoint(taskId: string): void;
    /**
     * List breakpoints
     */
    listBreakpoints(): Breakpoint[];
    /**
     * Set mock response for a task
     */
    setMockResponse(taskRef: string, response: MockTaskResponse): void;
    /**
     * Get session state
     */
    getState(): DebugSessionState;
}
//# sourceMappingURL=debug.d.ts.map