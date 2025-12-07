import type { WorkflowPattern } from '../types/index.js';
export interface FewShotExample {
    intent: string;
    yaml: string;
    pattern: WorkflowPattern;
    explanation: string;
}
/**
 * Few-shot examples for different workflow patterns (Kubernetes CRD format)
 */
export declare const FEW_SHOT_EXAMPLES: Record<WorkflowPattern, FewShotExample>;
/**
 * Get the most relevant example based on intent analysis
 */
export declare function selectRelevantExample(intent: string): FewShotExample;
/**
 * Format a few-shot example for inclusion in a prompt
 */
export declare function formatExample(example: FewShotExample): string;
//# sourceMappingURL=few-shot-examples.d.ts.map