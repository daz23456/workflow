"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DependencyAnalyzer = void 0;
/**
 * Analyzes workflow task dependencies
 * Identifies independent tasks and parallel execution opportunities
 */
class DependencyAnalyzer {
    /**
     * Analyze workflow dependencies
     * @param spec Workflow specification
     * @returns DependencyAnalysis with independent tasks and parallel groups
     */
    analyze(spec) {
        const independentTasks = this.findIndependentTasks(spec.tasks);
        const parallelGroups = this.findParallelGroups(spec.tasks);
        const criticalPath = this.findCriticalPath(spec.tasks);
        return {
            independentTasks,
            parallelGroups,
            criticalPath
        };
    }
    /**
     * Find tasks with no dependencies
     */
    findIndependentTasks(tasks) {
        return tasks
            .filter(task => !task.dependsOn || task.dependsOn.length === 0)
            .map(task => task.id);
    }
    /**
     * Find groups of tasks that can execute in parallel
     */
    findParallelGroups(tasks) {
        const groups = [];
        const processed = new Set();
        // Group tasks by their dependency level
        const levelMap = new Map();
        for (const task of tasks) {
            const level = this.calculateTaskLevel(task, tasks);
            if (!levelMap.has(level)) {
                levelMap.set(level, []);
            }
            levelMap.get(level).push(task.id);
        }
        // Convert levels to parallel groups (skip level 0 as those are independentTasks)
        for (const [level, taskIds] of levelMap.entries()) {
            if (taskIds.length > 1) {
                groups.push(taskIds);
            }
        }
        return groups;
    }
    /**
     * Calculate the dependency level of a task
     */
    calculateTaskLevel(task, allTasks) {
        if (!task.dependsOn || task.dependsOn.length === 0) {
            return 0;
        }
        const taskMap = new Map(allTasks.map(t => [t.id, t]));
        const maxDepLevel = Math.max(...task.dependsOn.map(depId => {
            const depTask = taskMap.get(depId);
            return depTask ? this.calculateTaskLevel(depTask, allTasks) : 0;
        }));
        return maxDepLevel + 1;
    }
    /**
     * Find critical path (longest path through the graph)
     */
    findCriticalPath(tasks) {
        // Simple implementation: find the longest chain of dependencies
        let longestPath = [];
        const findPath = (taskId, currentPath) => {
            currentPath.push(taskId);
            const task = tasks.find(t => t.id === taskId);
            if (!task || !task.dependsOn || task.dependsOn.length === 0) {
                return currentPath;
            }
            let longest = currentPath;
            for (const depId of task.dependsOn) {
                const path = findPath(depId, [...currentPath]);
                if (path.length > longest.length) {
                    longest = path;
                }
            }
            return longest;
        };
        for (const task of tasks) {
            const path = findPath(task.id, []);
            if (path.length > longestPath.length) {
                longestPath = path;
            }
        }
        return longestPath.reverse();
    }
}
exports.DependencyAnalyzer = DependencyAnalyzer;
//# sourceMappingURL=dependencyAnalyzer.js.map