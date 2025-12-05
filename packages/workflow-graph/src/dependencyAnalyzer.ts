import { WorkflowSpec, WorkflowTaskStep } from '@workflow/types';

/**
 * Dependency analysis result
 */
export interface DependencyAnalysis {
  independentTasks: string[]; // Tasks with no dependencies
  parallelGroups: string[][]; // Groups of tasks that can run in parallel
  criticalPath: string[]; // Longest path through the graph
}

/**
 * Analyzes workflow task dependencies
 * Identifies independent tasks and parallel execution opportunities
 */
export class DependencyAnalyzer {
  /**
   * Analyze workflow dependencies
   * @param spec Workflow specification
   * @returns DependencyAnalysis with independent tasks and parallel groups
   */
  analyze(spec: WorkflowSpec): DependencyAnalysis {
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
  private findIndependentTasks(tasks: WorkflowTaskStep[]): string[] {
    return tasks
      .filter(task => !task.dependsOn || task.dependsOn.length === 0)
      .map(task => task.id);
  }

  /**
   * Find groups of tasks that can execute in parallel
   */
  private findParallelGroups(tasks: WorkflowTaskStep[]): string[][] {
    const groups: string[][] = [];
    const processed = new Set<string>();

    // Group tasks by their dependency level
    const levelMap = new Map<number, string[]>();

    for (const task of tasks) {
      const level = this.calculateTaskLevel(task, tasks);
      if (!levelMap.has(level)) {
        levelMap.set(level, []);
      }
      levelMap.get(level)!.push(task.id);
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
  private calculateTaskLevel(task: WorkflowTaskStep, allTasks: WorkflowTaskStep[]): number {
    if (!task.dependsOn || task.dependsOn.length === 0) {
      return 0;
    }

    const taskMap = new Map(allTasks.map(t => [t.id, t]));
    const maxDepLevel = Math.max(
      ...task.dependsOn.map(depId => {
        const depTask = taskMap.get(depId);
        return depTask ? this.calculateTaskLevel(depTask, allTasks) : 0;
      })
    );

    return maxDepLevel + 1;
  }

  /**
   * Find critical path (longest path through the graph)
   */
  private findCriticalPath(tasks: WorkflowTaskStep[]): string[] {
    // Simple implementation: find the longest chain of dependencies
    let longestPath: string[] = [];

    const findPath = (taskId: string, currentPath: string[]): string[] => {
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
