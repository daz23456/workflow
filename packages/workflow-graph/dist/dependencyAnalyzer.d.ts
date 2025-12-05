import { WorkflowSpec } from '@workflow/types';
/**
 * Dependency analysis result
 */
export interface DependencyAnalysis {
    independentTasks: string[];
    parallelGroups: string[][];
    criticalPath: string[];
}
/**
 * Analyzes workflow task dependencies
 * Identifies independent tasks and parallel execution opportunities
 */
export declare class DependencyAnalyzer {
    /**
     * Analyze workflow dependencies
     * @param spec Workflow specification
     * @returns DependencyAnalysis with independent tasks and parallel groups
     */
    analyze(spec: WorkflowSpec): DependencyAnalysis;
    /**
     * Find tasks with no dependencies
     */
    private findIndependentTasks;
    /**
     * Find groups of tasks that can execute in parallel
     */
    private findParallelGroups;
    /**
     * Calculate the dependency level of a task
     */
    private calculateTaskLevel;
    /**
     * Find critical path (longest path through the graph)
     */
    private findCriticalPath;
}
//# sourceMappingURL=dependencyAnalyzer.d.ts.map