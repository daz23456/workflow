import type { GatewayClient } from '../services/gateway-client.js';
import type { ValidateWorkflowParams, ValidationResult } from '../types/index.js';
/**
 * Validate a workflow YAML and return detailed feedback
 */
export declare function validateWorkflow(client: GatewayClient, params: ValidateWorkflowParams): Promise<ValidationResult>;
//# sourceMappingURL=validate-workflow.d.ts.map