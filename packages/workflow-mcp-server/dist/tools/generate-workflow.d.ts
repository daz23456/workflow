import type { GatewayClient } from '../services/gateway-client.js';
import type { GenerateWorkflowParams, GeneratedWorkflow, WorkflowPattern } from '../types/index.js';
/**
 * Detect the workflow pattern from user intent
 */
export declare function detectPattern(intent: string): WorkflowPattern;
/**
 * Parse YAML from a generated response (may be wrapped in markdown code block)
 */
export declare function parseGeneratedYaml(response: string): string;
/**
 * Generate a workflow from natural language intent
 */
export declare function generateWorkflow(client: GatewayClient, params: GenerateWorkflowParams): Promise<GeneratedWorkflow>;
//# sourceMappingURL=generate-workflow.d.ts.map