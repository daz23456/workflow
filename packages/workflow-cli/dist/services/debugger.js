/**
 * Interactive Debugger Service
 * Breakpoint-based workflow debugging with step execution
 */
/**
 * Interactive debugger for workflow execution
 */
export class Debugger {
    breakpoints = new Map();
    mockResponses = new Map();
    /**
     * Add breakpoint on task
     */
    addBreakpoint(taskId) {
        this.breakpoints.set(taskId, {
            taskId,
            enabled: true,
            hitCount: 0
        });
    }
    /**
     * Remove breakpoint
     */
    removeBreakpoint(taskId) {
        this.breakpoints.delete(taskId);
    }
    /**
     * Toggle breakpoint enabled state
     */
    toggleBreakpoint(taskId) {
        const bp = this.breakpoints.get(taskId);
        if (bp) {
            bp.enabled = !bp.enabled;
        }
    }
    /**
     * Check if breakpoint exists
     */
    hasBreakpoint(taskId) {
        return this.breakpoints.has(taskId);
    }
    /**
     * List all breakpoints
     */
    listBreakpoints() {
        return Array.from(this.breakpoints.values());
    }
    /**
     * Clear all breakpoints
     */
    clearBreakpoints() {
        this.breakpoints.clear();
    }
    /**
     * Set mock response for task
     */
    setMockResponse(taskRef, response) {
        this.mockResponses.set(taskRef, response);
    }
    /**
     * Create debug session
     */
    createSession(workflow, tasks, input) {
        const executionOrder = this.buildExecutionOrder(workflow.spec.tasks);
        return {
            id: `debug-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            state: 'ready',
            workflow,
            tasks,
            input,
            currentTask: undefined,
            context: {
                input,
                tasks: {}
            },
            history: [],
            executionOrder,
            currentIndex: 0
        };
    }
    /**
     * Start debug session
     */
    async start(session) {
        session.state = 'running';
        await this.runUntilBreakpoint(session);
    }
    /**
     * Step to next task
     */
    async step(session) {
        if (session.state !== 'paused')
            return;
        session.state = 'running';
        // Execute current task
        await this.executeCurrentTask(session);
        // Move to next task
        session.currentIndex++;
        if (session.currentIndex >= session.executionOrder.length) {
            session.state = 'completed';
            session.currentTask = undefined;
        }
        else {
            session.currentTask = session.executionOrder[session.currentIndex];
            session.state = 'paused';
        }
    }
    /**
     * Continue to next breakpoint
     */
    async continue(session) {
        if (session.state !== 'paused')
            return;
        session.state = 'running';
        // Execute current task first
        await this.executeCurrentTask(session);
        session.currentIndex++;
        // Continue execution
        await this.runUntilBreakpoint(session);
    }
    /**
     * Stop debug session
     */
    stop(session) {
        session.state = 'stopped';
    }
    /**
     * Get current context
     */
    getContext(session) {
        return session.context;
    }
    /**
     * Get resolved input for current task
     */
    getResolvedInput(session) {
        if (!session.currentTask)
            return {};
        const taskDef = session.workflow.spec.tasks.find(t => t.id === session.currentTask);
        if (!taskDef?.input)
            return {};
        return this.resolveTemplates(taskDef.input, session.context);
    }
    /**
     * Get last task output
     */
    getLastOutput(session) {
        if (session.history.length === 0)
            return undefined;
        return session.history[session.history.length - 1].output;
    }
    /**
     * Set context value
     */
    setContextValue(session, path, value) {
        const parts = path.split('.');
        let current = session.context;
        for (let i = 0; i < parts.length - 1; i++) {
            if (!(parts[i] in current)) {
                current[parts[i]] = {};
            }
            current = current[parts[i]];
        }
        current[parts[parts.length - 1]] = value;
    }
    /**
     * Get execution history
     */
    getHistory(session) {
        return session.history;
    }
    /**
     * Run until breakpoint or completion
     */
    async runUntilBreakpoint(session) {
        while (session.currentIndex < session.executionOrder.length) {
            const taskId = session.executionOrder[session.currentIndex];
            session.currentTask = taskId;
            // Check for breakpoint
            const bp = this.breakpoints.get(taskId);
            if (bp?.enabled) {
                bp.hitCount++;
                session.state = 'paused';
                return;
            }
            // Execute task
            await this.executeCurrentTask(session);
            session.currentIndex++;
        }
        // All tasks completed
        session.state = 'completed';
        session.currentTask = undefined;
    }
    /**
     * Execute current task
     */
    async executeCurrentTask(session) {
        if (!session.currentTask)
            return;
        const taskDef = session.workflow.spec.tasks.find(t => t.id === session.currentTask);
        if (!taskDef)
            return;
        const startTime = Date.now();
        // Get mock response
        const response = this.mockResponses.get(taskDef.taskRef) || { status: 200, body: {} };
        // Resolve input templates
        const resolvedInput = taskDef.input
            ? this.resolveTemplates(taskDef.input, session.context)
            : {};
        const duration = Date.now() - startTime;
        if (response.status >= 400) {
            // Task failed
            session.context.tasks[session.currentTask] = {
                output: response.body,
                status: 'failed',
                duration
            };
            session.history.push({
                taskId: session.currentTask,
                taskRef: taskDef.taskRef,
                status: 'failed',
                error: String(response.body),
                duration,
                timestamp: Date.now()
            });
        }
        else {
            // Task succeeded
            session.context.tasks[session.currentTask] = {
                output: response.body,
                status: 'completed',
                duration
            };
            session.history.push({
                taskId: session.currentTask,
                taskRef: taskDef.taskRef,
                status: 'completed',
                output: response.body,
                duration,
                timestamp: Date.now()
            });
        }
    }
    /**
     * Build execution order using topological sort
     */
    buildExecutionOrder(tasks) {
        const order = [];
        const completed = new Set();
        const remaining = new Set(tasks.map(t => t.id));
        // Build dependency map
        const deps = new Map();
        for (const task of tasks) {
            deps.set(task.id, task.dependsOn || []);
        }
        while (remaining.size > 0) {
            const ready = [];
            for (const taskId of remaining) {
                const taskDeps = deps.get(taskId) || [];
                if (taskDeps.every(d => completed.has(d))) {
                    ready.push(taskId);
                }
            }
            if (ready.length === 0)
                break;
            // Sort for deterministic order
            ready.sort();
            for (const taskId of ready) {
                order.push(taskId);
                remaining.delete(taskId);
                completed.add(taskId);
            }
        }
        return order;
    }
    /**
     * Resolve template expressions
     */
    resolveTemplates(obj, context) {
        if (typeof obj === 'string') {
            return this.resolveTemplateString(obj, context);
        }
        if (Array.isArray(obj)) {
            return obj.map(item => this.resolveTemplates(item, context));
        }
        if (obj && typeof obj === 'object') {
            const result = {};
            for (const [key, value] of Object.entries(obj)) {
                result[key] = this.resolveTemplates(value, context);
            }
            return result;
        }
        return obj;
    }
    /**
     * Resolve template string
     */
    resolveTemplateString(str, context) {
        // Full template match
        const fullMatch = str.match(/^\{\{([^}]+)\}\}$/);
        if (fullMatch) {
            return this.resolvePath(fullMatch[1].trim(), context);
        }
        // Partial template replacement
        return str.replace(/\{\{([^}]+)\}\}/g, (_, path) => {
            const value = this.resolvePath(path.trim(), context);
            return value === undefined ? '' : String(value);
        });
    }
    /**
     * Resolve dot-notation path
     */
    resolvePath(path, context) {
        const parts = path.split('.');
        let value = context;
        for (const part of parts) {
            if (value === null || value === undefined)
                return undefined;
            if (typeof value !== 'object')
                return undefined;
            value = value[part];
        }
        return value;
    }
}
//# sourceMappingURL=debugger.js.map