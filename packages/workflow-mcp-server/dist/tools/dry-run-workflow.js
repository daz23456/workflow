/**
 * Dry-run a workflow with sample input (no actual HTTP calls)
 * Returns the execution plan with resolved templates
 */
export async function dryRunWorkflow(client, params) {
    const { yaml, sampleInput } = params;
    if (!yaml || yaml.trim() === '') {
        return {
            valid: false,
            executionPlan: { tasks: [], parallelGroups: [] },
            errors: [{ message: 'Workflow YAML is required' }]
        };
    }
    try {
        const result = await client.dryRunWorkflow(yaml, sampleInput);
        return result;
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error during dry-run';
        return {
            valid: false,
            executionPlan: { tasks: [], parallelGroups: [] },
            errors: [{ message }]
        };
    }
}
//# sourceMappingURL=dry-run-workflow.js.map