import type { GatewayClient } from './gateway-client.js';
import type { TaskSummary, RefinementResult } from '../types/index.js';
/**
 * Service for iterative workflow refinement with loop prevention
 */
export declare class RefinementService {
    private client;
    private maxIterations;
    constructor(client: GatewayClient, maxIterations?: number);
    /**
     * Refine a workflow by iteratively fixing validation errors
     */
    refineWorkflow(yaml: string, availableTasks: TaskSummary[]): Promise<RefinementResult>;
    /**
     * Hash errors for oscillation detection
     */
    private hashErrors;
    /**
     * Check if an error can be automatically fixed
     */
    private canAutoFix;
    /**
     * Generate fixes for a list of errors
     */
    private generateFixes;
    /**
     * Generate a single fix based on error type
     */
    private generateFix;
    /**
     * Apply fixes to YAML
     */
    private applyFixes;
    /**
     * Find the closest matching task name
     */
    private findClosestTask;
    /**
     * Calculate similarity score between two strings (0-1)
     */
    private similarityScore;
    /**
     * Fix common template issues
     */
    private fixTemplate;
    /**
     * Add a dependency to a task in YAML
     */
    private addDependency;
    /**
     * Escape special regex characters
     */
    private escapeRegex;
}
//# sourceMappingURL=refinement-service.d.ts.map