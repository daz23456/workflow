import type { TaskSummary, GeneratedWorkflow } from '../types/index.js';
/**
 * Service for LLM-powered workflow generation
 */
export declare class LlmService {
    private client;
    private model;
    private maxTokens;
    constructor();
    /**
     * Check if LLM is available
     */
    isAvailable(): boolean;
    /**
     * Generate a workflow using the LLM
     */
    generateWorkflow(intent: string, availableTasks: TaskSummary[]): Promise<GeneratedWorkflow>;
    /**
     * Parse LLM response to extract YAML and metadata
     */
    private parseResponse;
    /**
     * Detect workflow pattern from YAML structure
     */
    private detectPattern;
}
//# sourceMappingURL=llm-service.d.ts.map