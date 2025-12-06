/**
 * Test Command (Dry-run)
 * Validate workflow and show execution plan without executing HTTP requests
 */
import { loadWorkflow, loadTasksFromDirectory } from '../loaders.js';
import { GatewayClient } from '../services/gateway-client.js';
/**
 * Test/dry-run a workflow
 */
export async function testWorkflow(workflowPath, options) {
    try {
        // Parse JSON input if provided
        let input = options.input || {};
        if (options.inputJson) {
            try {
                input = JSON.parse(options.inputJson);
            }
            catch {
                return {
                    valid: false,
                    mode: options.remote ? 'remote' : 'local',
                    workflowName: 'unknown',
                    error: 'Invalid JSON input'
                };
            }
        }
        // Load workflow
        const workflow = await loadWorkflow(workflowPath);
        const workflowName = workflow.metadata.name;
        if (options.remote) {
            // Remote mode - dry-run via Gateway
            return await testRemote(workflow, input, options);
        }
        else {
            // Local mode - validate locally
            return await testLocal(workflow, input, options);
        }
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return {
            valid: false,
            mode: options.remote ? 'remote' : 'local',
            workflowName: 'unknown',
            error: errorMessage
        };
    }
}
/**
 * Test workflow via Gateway API
 */
async function testRemote(workflow, input, options) {
    const client = new GatewayClient(options.gatewayUrl || 'http://localhost:5001', options.namespace);
    try {
        const result = await client.dryRunWorkflow(workflow.metadata.name, input, options.namespace);
        return {
            valid: result.valid,
            mode: 'remote',
            workflowName: workflow.metadata.name,
            executionPlan: result.executionPlan,
            resolvedTemplates: result.resolvedTemplates,
            errors: result.errors,
            warnings: result.warnings
        };
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return {
            valid: false,
            mode: 'remote',
            workflowName: workflow.metadata.name,
            error: errorMessage
        };
    }
}
/**
 * Test workflow locally
 */
async function testLocal(workflow, input, options) {
    // Load tasks
    const tasks = options.tasksPath
        ? await loadTasksFromDirectory(options.tasksPath)
        : [];
    const errors = [];
    const warnings = [];
    // Build task name set
    const taskNames = new Set(tasks.map(t => t.metadata.name));
    // Validate task references
    for (const task of workflow.spec.tasks) {
        if (tasks.length > 0 && !taskNames.has(task.taskRef)) {
            errors.push(`Missing task reference: ${task.taskRef}`);
        }
    }
    // Check for circular dependencies
    const circularError = detectCircularDependencies(workflow.spec.tasks);
    if (circularError) {
        errors.push(circularError);
    }
    // Check for extra input fields (warnings)
    const usedInputFields = findUsedInputFields(workflow.spec.tasks);
    for (const key of Object.keys(input)) {
        if (!usedInputFields.has(key)) {
            warnings.push(`Unused input field: ${key}`);
        }
    }
    // Build execution plan
    const executionPlan = buildExecutionPlan(workflow.spec.tasks);
    // Resolve templates
    const resolvedTemplates = resolveAllTemplates(workflow.spec.tasks, input);
    // Estimate duration (100ms per task as baseline)
    const estimatedDuration = workflow.spec.tasks.length * 100;
    return {
        valid: errors.length === 0,
        mode: 'local',
        workflowName: workflow.metadata.name,
        executionPlan,
        resolvedTemplates,
        errors: errors.length > 0 ? errors : undefined,
        warnings: warnings.length > 0 ? warnings : undefined,
        estimatedDuration
    };
}
/**
 * Detect circular dependencies in tasks
 */
function detectCircularDependencies(tasks) {
    const taskMap = new Map();
    for (const task of tasks) {
        taskMap.set(task.id, task);
    }
    const visited = new Set();
    const recursionStack = new Set();
    function hasCycle(taskId, path) {
        visited.add(taskId);
        recursionStack.add(taskId);
        const task = taskMap.get(taskId);
        if (task?.dependsOn) {
            for (const dep of task.dependsOn) {
                if (!visited.has(dep)) {
                    const cyclePath = hasCycle(dep, [...path, taskId]);
                    if (cyclePath)
                        return cyclePath;
                }
                else if (recursionStack.has(dep)) {
                    return [...path, taskId, dep];
                }
            }
        }
        recursionStack.delete(taskId);
        return null;
    }
    for (const task of tasks) {
        if (!visited.has(task.id)) {
            const cyclePath = hasCycle(task.id, []);
            if (cyclePath) {
                return `circular dependency detected: ${cyclePath.join(' → ')}`;
            }
        }
    }
    return null;
}
/**
 * Find input fields used in task inputs
 */
function findUsedInputFields(tasks) {
    const usedFields = new Set();
    const pattern = /\{\{input\.(\w+)/g;
    for (const task of tasks) {
        if (task.input) {
            const inputStr = JSON.stringify(task.input);
            let match;
            while ((match = pattern.exec(inputStr)) !== null) {
                usedFields.add(match[1]);
            }
        }
    }
    return usedFields;
}
/**
 * Build execution plan with parallel groups
 */
function buildExecutionPlan(tasks) {
    const groups = [];
    const completed = new Set();
    const remaining = new Set(tasks.map(t => t.id));
    // Build dependency map
    const deps = new Map();
    for (const task of tasks) {
        deps.set(task.id, task.dependsOn || []);
    }
    while (remaining.size > 0) {
        // Find all tasks with satisfied dependencies
        const ready = [];
        for (const taskId of remaining) {
            const taskDeps = deps.get(taskId) || [];
            if (taskDeps.every(d => completed.has(d))) {
                ready.push(taskId);
            }
        }
        if (ready.length === 0) {
            // Circular dependency - shouldn't happen if validation passed
            break;
        }
        groups.push({
            tasks: ready.sort(),
            parallel: ready.length > 1
        });
        for (const taskId of ready) {
            remaining.delete(taskId);
            completed.add(taskId);
        }
    }
    return { groups };
}
/**
 * Resolve all template expressions in tasks
 */
function resolveAllTemplates(tasks, input) {
    const resolved = {};
    const pattern = /\{\{input\.(\w+)\}\}/g;
    for (const task of tasks) {
        if (task.input) {
            for (const [key, value] of Object.entries(task.input)) {
                if (typeof value === 'string') {
                    const match = value.match(/^\{\{input\.(\w+)\}\}$/);
                    if (match) {
                        const inputKey = match[1];
                        const resolvedValue = input[inputKey];
                        if (resolvedValue !== undefined) {
                            resolved[`${task.id}.input.${key}`] = String(resolvedValue);
                        }
                    }
                }
            }
        }
    }
    return resolved;
}
//# sourceMappingURL=test.js.map