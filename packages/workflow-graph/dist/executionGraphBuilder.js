"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExecutionGraphBuilder = void 0;
/**
 * Builds execution graph from workflow specification
 * Analyzes dependencies and provides execution order
 */
class ExecutionGraphBuilder {
    /**
     * Build execution graph from workflow specification
     * @param spec Workflow specification
     * @returns ExecutionGraph with nodes, edges, and execution order
     */
    build(spec) {
        const nodes = [];
        const edges = [];
        const taskMap = new Map();
        // Build task map and edges
        for (const task of spec.tasks) {
            taskMap.set(task.id, task);
            if (task.dependsOn) {
                for (const depId of task.dependsOn) {
                    edges.push({ from: depId, to: task.id });
                }
            }
        }
        // Detect cycles
        const { hasCycles, cycles, executionOrder } = this.analyzeGraph(spec.tasks);
        // Calculate topological levels for visualization
        const levels = this.calculateLevels(spec.tasks, executionOrder);
        // Create graph nodes
        for (const task of spec.tasks) {
            nodes.push({
                id: task.id,
                taskRef: task.taskRef,
                dependencies: task.dependsOn || [],
                level: levels.get(task.id) || 0
            });
        }
        return {
            nodes,
            edges,
            executionOrder,
            hasCycles,
            cycles: hasCycles ? cycles : undefined
        };
    }
    /**
     * Analyze graph for cycles and execution order using DFS
     */
    analyzeGraph(tasks) {
        const visited = new Set();
        const recStack = new Set();
        const cycles = [];
        const executionOrder = [];
        const dfs = (taskId, path) => {
            visited.add(taskId);
            recStack.add(taskId);
            path.push(taskId);
            const task = tasks.find(t => t.id === taskId);
            if (task && task.dependsOn) {
                for (const depId of task.dependsOn) {
                    if (!visited.has(depId)) {
                        if (dfs(depId, [...path])) {
                            return true;
                        }
                    }
                    else if (recStack.has(depId)) {
                        // Cycle detected
                        const cycleStart = path.indexOf(depId);
                        cycles.push(path.slice(cycleStart));
                        return true;
                    }
                }
            }
            recStack.delete(taskId);
            executionOrder.unshift(taskId);
            return false;
        };
        for (const task of tasks) {
            if (!visited.has(task.id)) {
                dfs(task.id, []);
            }
        }
        return {
            hasCycles: cycles.length > 0,
            cycles,
            executionOrder
        };
    }
    /**
     * Calculate topological levels for each task (for visualization)
     */
    calculateLevels(tasks, executionOrder) {
        const levels = new Map();
        const taskMap = new Map(tasks.map(t => [t.id, t]));
        for (const taskId of executionOrder) {
            const task = taskMap.get(taskId);
            if (!task)
                continue;
            if (!task.dependsOn || task.dependsOn.length === 0) {
                levels.set(taskId, 0);
            }
            else {
                const maxDepLevel = Math.max(...task.dependsOn.map(depId => levels.get(depId) || 0));
                levels.set(taskId, maxDepLevel + 1);
            }
        }
        return levels;
    }
}
exports.ExecutionGraphBuilder = ExecutionGraphBuilder;
//# sourceMappingURL=executionGraphBuilder.js.map