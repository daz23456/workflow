import { generateSuggestion } from '../prompts/error-fixing.js';
/**
 * Validate a workflow YAML and return detailed feedback
 */
export async function validateWorkflow(client, params) {
    // Get available tasks for suggestion generation
    let availableTasks = [];
    if (params.suggestFixes !== false) {
        try {
            const tasks = await client.listTasks();
            availableTasks = tasks.map(t => t.name);
        }
        catch {
            // Continue without task list for suggestions
        }
    }
    // Validate via the gateway API
    const result = await client.validateWorkflow(params.yaml);
    // Enhance errors with suggestions if enabled
    const errors = result.errors.map(error => {
        const enhanced = {
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
    const warnings = (result.warnings ?? []).map(warning => ({
        message: warning.message,
        suggestion: warning.suggestion
    }));
    return {
        valid: result.valid,
        errors,
        warnings
    };
}
//# sourceMappingURL=validate-workflow.js.map