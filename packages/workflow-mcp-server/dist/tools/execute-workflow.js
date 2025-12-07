/**
 * Execute a deployed workflow with actual input
 * Returns execution results with task-level details
 */
export async function executeWorkflow(client, params) {
    const { workflowName, input } = params;
    if (!workflowName || workflowName.trim() === '') {
        throw new Error('Workflow name is required');
    }
    try {
        const result = await client.executeWorkflow(workflowName, input);
        return result;
    }
    catch (error) {
        if (error instanceof Error) {
            // Re-throw specific errors (like "Workflow not found")
            throw error;
        }
        throw new Error('Unknown error during workflow execution');
    }
}
//# sourceMappingURL=execute-workflow.js.map