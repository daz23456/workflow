/**
 * Tasks Command
 * List and show workflow task definitions
 */
import { loadTasksFromDirectory } from '../loaders.js';
/**
 * Convert glob-like pattern to regex
 */
function patternToRegex(pattern) {
    const escaped = pattern
        .replace(/[.+^${}()|[\]\\]/g, '\\$&')
        .replace(/\*/g, '.*')
        .replace(/\?/g, '.');
    return new RegExp(`^${escaped}$`);
}
/**
 * Check if name matches any of the filter patterns
 */
function matchesFilter(name, filter) {
    const patterns = filter.split(',').map(p => p.trim());
    return patterns.some(pattern => patternToRegex(pattern).test(name));
}
/**
 * Convert TaskDefinition to TaskSummary
 */
function toSummary(task) {
    return {
        name: task.metadata.name,
        type: task.spec.type,
        namespace: task.metadata.namespace
    };
}
/**
 * Convert TaskDefinition to TaskDetails
 */
function toDetails(task) {
    return {
        name: task.metadata.name,
        type: task.spec.type,
        namespace: task.metadata.namespace,
        request: task.spec.request,
        inputSchema: task.spec.inputSchema,
        outputSchema: task.spec.outputSchema
    };
}
/**
 * List all tasks from a directory
 */
export async function listTasks(options) {
    let tasks;
    try {
        tasks = await loadTasksFromDirectory(options.tasksPath);
    }
    catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
            tasks: [],
            count: 0,
            error: `Failed to load tasks: ${message}`
        };
    }
    // Filter by namespace if specified
    if (options.namespace) {
        tasks = tasks.filter(t => t.metadata.namespace === options.namespace);
    }
    // Filter by name pattern if specified
    if (options.filter) {
        tasks = tasks.filter(t => matchesFilter(t.metadata.name, options.filter));
    }
    // Convert to summaries and sort alphabetically
    const summaries = tasks.map(toSummary).sort((a, b) => a.name.localeCompare(b.name));
    return {
        tasks: summaries,
        count: summaries.length
    };
}
/**
 * Show details of a specific task
 */
export async function showTask(taskName, options) {
    let tasks;
    try {
        tasks = await loadTasksFromDirectory(options.tasksPath);
    }
    catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
            found: false,
            error: `Failed to load tasks: ${message}`
        };
    }
    // Find task by exact name match
    const task = tasks.find(t => t.metadata.name === taskName);
    if (!task) {
        return { found: false };
    }
    return {
        found: true,
        task: toDetails(task)
    };
}
//# sourceMappingURL=tasks.js.map