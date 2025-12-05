import type { GatewayClient } from '../services/gateway-client.js';
import type {
  ValidateWorkflowParams,
  ValidationResult,
  ValidationError,
  ValidationWarning
} from '../types/index.js';
import { generateSuggestion } from '../prompts/error-fixing.js';

/**
 * Validate a workflow YAML and return detailed feedback
 */
export async function validateWorkflow(
  client: GatewayClient,
  params: ValidateWorkflowParams
): Promise<ValidationResult> {
  // Get available tasks for suggestion generation
  let availableTasks: string[] = [];
  if (params.suggestFixes !== false) {
    try {
      const tasks = await client.listTasks();
      availableTasks = tasks.map(t => t.name);
    } catch {
      // Continue without task list for suggestions
    }
  }

  // Validate via the gateway API
  const result = await client.validateWorkflow(params.yaml);

  // Enhance errors with suggestions if enabled
  const errors: ValidationError[] = result.errors.map(error => {
    const enhanced: ValidationError = {
      message: error.message,
      location: error.location
    };

    if (params.suggestFixes !== false) {
      const suggestion = generateSuggestion(error.message, availableTasks);
      if (suggestion) {
        enhanced.suggestion = suggestion;
      }
    }

    return enhanced;
  });

  // Pass through warnings
  const warnings: ValidationWarning[] = (result.warnings ?? []).map(warning => ({
    message: warning.message,
    suggestion: warning.suggestion
  }));

  return {
    valid: result.valid,
    errors,
    warnings
  };
}
