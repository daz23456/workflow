import { WorkflowSpec } from '@workflow/types';
/**
 * Execution graph node representing a task in the workflow
 */
export interface GraphNode {
    id: string;
    taskRef: string;
    dependencies: string[];
    level: number;
}
/**
 * Execution graph for a workflow
 */
export interface ExecutionGraph {
    nodes: GraphNode[];
    edges: Array<{
        from: string;
        to: string;
    }>;
    executionOrder: string[];
    hasCycles: boolean;
    cycles?: string[][];
}
/**
 * Builds execution graph from workflow specification
 * Analyzes dependencies and provides execution order
 */
export declare class ExecutionGraphBuilder {
    /**
     * Build execution graph from workflow specification
     * @param spec Workflow specification
     * @returns ExecutionGraph with nodes, edges, and execution order
     */
    build(spec: WorkflowSpec): ExecutionGraph;
    /**
     * Analyze graph for cycles and execution order using DFS
     */
    private analyzeGraph;
    /**
     * Calculate topological levels for each task (for visualization)
     */
    private calculateLevels;
}
//# sourceMappingURL=executionGraphBuilder.d.ts.map