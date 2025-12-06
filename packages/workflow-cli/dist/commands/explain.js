/**
 * Explain Command
 * Show workflow execution plan with dependency graph
 */
import { loadWorkflow } from '../loaders.js';
/**
 * Extract template references from input object
 */
function extractTemplateRefs(obj) {
    const refs = [];
    const pattern = /\{\{([^}]+)\}\}/g;
    function extract(value) {
        if (typeof value === 'string') {
            let match;
            while ((match = pattern.exec(value)) !== null) {
                refs.push(match[1].trim());
            }
            pattern.lastIndex = 0;
        }
        else if (Array.isArray(value)) {
            value.forEach(extract);
        }
        else if (value && typeof value === 'object') {
            Object.values(value).forEach(extract);
        }
    }
    extract(obj);
    return refs;
}
/**
 * Build task explanations from workflow tasks
 */
function buildTaskExplanations(tasks) {
    return tasks.map(task => ({
        id: task.id,
        taskRef: task.taskRef,
        dependsOn: task.dependsOn || [],
        inputRefs: extractTemplateRefs(task.input)
    }));
}
/**
 * Build execution groups using topological sort
 */
function buildExecutionGroups(tasks) {
    const groups = [];
    const taskToGroup = new Map();
    const remaining = new Set(tasks.map(t => t.id));
    const completed = new Set();
    // Build dependency map
    const dependencyMap = new Map();
    for (const task of tasks) {
        dependencyMap.set(task.id, task.dependsOn || []);
    }
    let groupIndex = 0;
    while (remaining.size > 0) {
        // Find all tasks with satisfied dependencies
        const ready = [];
        for (const taskId of remaining) {
            const deps = dependencyMap.get(taskId) || [];
            if (deps.every(d => completed.has(d))) {
                ready.push(taskId);
            }
        }
        if (ready.length === 0) {
            // Circular dependency - should not happen if workflow is valid
            break;
        }
        // Find which previous groups this group depends on
        const groupDeps = new Set();
        for (const taskId of ready) {
            const deps = dependencyMap.get(taskId) || [];
            for (const dep of deps) {
                const depGroup = taskToGroup.get(dep);
                if (depGroup !== undefined) {
                    groupDeps.add(depGroup);
                }
            }
        }
        // Create group
        const group = {
            groupIndex,
            tasks: ready.sort(),
            parallel: ready.length > 1,
            dependsOn: Array.from(groupDeps).sort()
        };
        groups.push(group);
        // Mark tasks as completed
        for (const taskId of ready) {
            remaining.delete(taskId);
            completed.add(taskId);
            taskToGroup.set(taskId, groupIndex);
        }
        groupIndex++;
    }
    return groups;
}
/**
 * Calculate execution depth (longest path)
 */
function calculateExecutionDepth(tasks) {
    const depthMap = new Map();
    // Build dependency map
    const dependencyMap = new Map();
    for (const task of tasks) {
        dependencyMap.set(task.id, task.dependsOn || []);
    }
    function getDepth(taskId) {
        if (depthMap.has(taskId)) {
            return depthMap.get(taskId);
        }
        const deps = dependencyMap.get(taskId) || [];
        if (deps.length === 0) {
            depthMap.set(taskId, 1);
            return 1;
        }
        const maxDepDep = Math.max(...deps.map(getDepth));
        const depth = maxDepDep + 1;
        depthMap.set(taskId, depth);
        return depth;
    }
    if (tasks.length === 0)
        return 0;
    return Math.max(...tasks.map(t => getDepth(t.id)));
}
/**
 * Calculate max parallel width
 */
function calculateMaxParallelWidth(groups) {
    if (groups.length === 0)
        return 0;
    return Math.max(...groups.map(g => g.tasks.length));
}
/**
 * Find critical path (longest execution path)
 */
function findCriticalPath(tasks) {
    if (tasks.length === 0)
        return [];
    // Build dependency map
    const dependencyMap = new Map();
    const reverseDependencyMap = new Map();
    for (const task of tasks) {
        dependencyMap.set(task.id, task.dependsOn || []);
        reverseDependencyMap.set(task.id, []);
    }
    for (const task of tasks) {
        const deps = task.dependsOn || [];
        for (const dep of deps) {
            const existing = reverseDependencyMap.get(dep) || [];
            existing.push(task.id);
            reverseDependencyMap.set(dep, existing);
        }
    }
    // Find longest path using DFS
    const depthMap = new Map();
    const nextOnPath = new Map();
    function calculatePathLength(taskId) {
        if (depthMap.has(taskId)) {
            return depthMap.get(taskId);
        }
        const dependents = reverseDependencyMap.get(taskId) || [];
        if (dependents.length === 0) {
            depthMap.set(taskId, 1);
            nextOnPath.set(taskId, null);
            return 1;
        }
        let maxLength = 0;
        let maxNext = null;
        for (const dep of dependents) {
            const length = calculatePathLength(dep);
            if (length > maxLength) {
                maxLength = length;
                maxNext = dep;
            }
        }
        const totalLength = maxLength + 1;
        depthMap.set(taskId, totalLength);
        nextOnPath.set(taskId, maxNext);
        return totalLength;
    }
    // Calculate path lengths from all root nodes
    const roots = tasks.filter(t => (t.dependsOn || []).length === 0);
    let longestPathStart = null;
    let longestPathLength = 0;
    for (const root of roots) {
        const length = calculatePathLength(root.id);
        if (length > longestPathLength) {
            longestPathLength = length;
            longestPathStart = root.id;
        }
    }
    // Build path
    const path = [];
    let current = longestPathStart;
    while (current !== null) {
        path.push(current);
        current = nextOnPath.get(current) ?? null;
    }
    return path;
}
/**
 * Explain a workflow's execution plan
 */
export async function explainWorkflow(workflowPath, options = {}) {
    let workflow;
    try {
        workflow = await loadWorkflow(workflowPath);
    }
    catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
            success: false,
            error: `Failed to load workflow: ${message}`,
            workflowName: '',
            namespace: '',
            totalTasks: 0,
            groups: [],
            tasks: [],
            maxParallelWidth: 0,
            executionDepth: 0,
            criticalPath: []
        };
    }
    const tasks = workflow.spec.tasks || [];
    const groups = buildExecutionGroups(tasks);
    const taskExplanations = buildTaskExplanations(tasks);
    const maxParallelWidth = calculateMaxParallelWidth(groups);
    const executionDepth = calculateExecutionDepth(tasks);
    const criticalPath = findCriticalPath(tasks);
    return {
        success: true,
        workflowName: workflow.metadata.name,
        namespace: workflow.metadata.namespace,
        description: workflow.spec.description,
        totalTasks: tasks.length,
        groups,
        tasks: taskExplanations,
        maxParallelWidth,
        executionDepth,
        criticalPath
    };
}
//# sourceMappingURL=explain.js.map