/**
 * Debug Command
 * Interactive workflow debugging with breakpoints and step execution
 */
import { loadWorkflow, loadTasksFromDirectory } from '../loaders.js';
import { Debugger } from '../services/debugger.js';
/**
 * Start a debug session for a workflow
 */
export async function debugWorkflow(workflowPath, options) {
    try {
        // Parse JSON input if provided
        let input = options.input || {};
        if (options.inputJson) {
            try {
                input = JSON.parse(options.inputJson);
            }
            catch {
                return {
                    success: false,
                    error: 'Invalid JSON input'
                };
            }
        }
        // Load workflow
        const workflow = await loadWorkflow(workflowPath);
        // Load tasks
        const tasks = options.tasksPath
            ? await loadTasksFromDirectory(options.tasksPath)
            : [];
        // Create debugger and session
        const debugger_ = new Debugger();
        // Add breakpoints
        if (options.breakpoints) {
            for (const bp of options.breakpoints) {
                debugger_.addBreakpoint(bp);
            }
        }
        // Create session
        const session = debugger_.createSession(workflow, tasks, input);
        // Start session
        await debugger_.start(session);
        return {
            success: true,
            sessionId: session.id,
            state: session.state,
            currentTask: session.currentTask,
            breakpoints: debugger_.listBreakpoints(),
            executionOrder: session.executionOrder
        };
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return {
            success: false,
            error: errorMessage
        };
    }
}
/**
 * Interactive debug command class for step-by-step debugging
 */
export class DebugCommand {
    debugger_;
    session = null;
    workflow = null;
    tasks = [];
    input;
    workflowPath;
    options;
    constructor(workflowPath, options) {
        this.workflowPath = workflowPath;
        this.options = options;
        this.debugger_ = new Debugger();
        this.input = options.input || {};
        // Parse JSON input if provided
        if (options.inputJson) {
            try {
                this.input = JSON.parse(options.inputJson);
            }
            catch {
                // Will be handled during initialize
            }
        }
    }
    /**
     * Initialize the debug session
     */
    async initialize() {
        try {
            // Load workflow
            this.workflow = await loadWorkflow(this.workflowPath);
            // Load tasks
            this.tasks = this.options.tasksPath
                ? await loadTasksFromDirectory(this.options.tasksPath)
                : [];
            // Add breakpoints
            if (this.options.breakpoints) {
                for (const bp of this.options.breakpoints) {
                    this.debugger_.addBreakpoint(bp);
                }
            }
            // Create session
            this.session = this.debugger_.createSession(this.workflow, this.tasks, this.input);
            // Start session
            await this.debugger_.start(this.session);
            return {
                success: true,
                sessionId: this.session.id,
                state: this.session.state,
                currentTask: this.session.currentTask,
                breakpoints: this.debugger_.listBreakpoints(),
                executionOrder: this.session.executionOrder
            };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            return {
                success: false,
                error: errorMessage
            };
        }
    }
    /**
     * Step to next task
     */
    async step() {
        if (!this.session) {
            throw new Error('Debug session not initialized');
        }
        await this.debugger_.step(this.session);
        return {
            sessionId: this.session.id,
            state: this.session.state,
            currentTask: this.session.currentTask,
            executionOrder: this.session.executionOrder,
            currentIndex: this.session.currentIndex
        };
    }
    /**
     * Continue to next breakpoint
     */
    async continue() {
        if (!this.session) {
            throw new Error('Debug session not initialized');
        }
        await this.debugger_.continue(this.session);
        return {
            sessionId: this.session.id,
            state: this.session.state,
            currentTask: this.session.currentTask,
            executionOrder: this.session.executionOrder,
            currentIndex: this.session.currentIndex
        };
    }
    /**
     * Stop debug session
     */
    stop() {
        if (!this.session) {
            throw new Error('Debug session not initialized');
        }
        this.debugger_.stop(this.session);
        return {
            sessionId: this.session.id,
            state: this.session.state,
            currentTask: this.session.currentTask,
            executionOrder: this.session.executionOrder,
            currentIndex: this.session.currentIndex
        };
    }
    /**
     * Get current context
     */
    getContext() {
        if (!this.session) {
            throw new Error('Debug session not initialized');
        }
        return this.debugger_.getContext(this.session);
    }
    /**
     * Get resolved input for current task
     */
    getResolvedInput() {
        if (!this.session) {
            throw new Error('Debug session not initialized');
        }
        return this.debugger_.getResolvedInput(this.session);
    }
    /**
     * Set context value
     */
    setContextValue(path, value) {
        if (!this.session) {
            throw new Error('Debug session not initialized');
        }
        this.debugger_.setContextValue(this.session, path, value);
    }
    /**
     * Get execution history
     */
    getHistory() {
        if (!this.session) {
            throw new Error('Debug session not initialized');
        }
        return this.debugger_.getHistory(this.session);
    }
    /**
     * Add breakpoint
     */
    addBreakpoint(taskId) {
        this.debugger_.addBreakpoint(taskId);
    }
    /**
     * Remove breakpoint
     */
    removeBreakpoint(taskId) {
        this.debugger_.removeBreakpoint(taskId);
    }
    /**
     * List breakpoints
     */
    listBreakpoints() {
        return this.debugger_.listBreakpoints();
    }
    /**
     * Set mock response for a task
     */
    setMockResponse(taskRef, response) {
        this.debugger_.setMockResponse(taskRef, response);
    }
    /**
     * Get session state
     */
    getState() {
        if (!this.session) {
            throw new Error('Debug session not initialized');
        }
        return {
            sessionId: this.session.id,
            state: this.session.state,
            currentTask: this.session.currentTask,
            executionOrder: this.session.executionOrder,
            currentIndex: this.session.currentIndex
        };
    }
}
//# sourceMappingURL=debug.js.map