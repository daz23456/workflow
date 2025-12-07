/**
 * HTTP client for communicating with the Workflow Gateway API
 */
export class GatewayClient {
    baseUrl;
    constructor(baseUrl) {
        this.baseUrl = baseUrl ?? process.env.GATEWAY_URL ?? 'http://localhost:5000';
    }
    /**
     * List all available workflow tasks
     */
    async listTasks() {
        const response = await fetch(`${this.baseUrl}/api/v1/tasks`);
        if (!response.ok) {
            throw new Error(`Failed to fetch tasks: ${response.status} ${response.statusText}`);
        }
        const result = await response.json();
        // Handle both {tasks: [...]} and [...] response formats
        return Array.isArray(result) ? result : result.tasks;
    }
    /**
     * Get a single task by name
     */
    async getTask(name) {
        const response = await fetch(`${this.baseUrl}/api/v1/tasks/${name}`);
        if (!response.ok) {
            throw new Error(`Failed to fetch task: ${response.status} ${response.statusText}`);
        }
        return response.json();
    }
    /**
     * Validate a workflow YAML using the test-execute endpoint (dry-run mode)
     */
    async validateWorkflow(yaml) {
        const response = await fetch(`${this.baseUrl}/api/v1/workflows/test-execute`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ workflowYaml: yaml, input: {} })
        });
        // Parse response regardless of status code
        const result = await response.json();
        if (!response.ok) {
            // Return validation errors if available
            if (result.validationErrors && result.validationErrors.length > 0) {
                return {
                    valid: false,
                    errors: result.validationErrors.map(msg => ({ message: msg })),
                    warnings: []
                };
            }
            // Return detailed error
            const errorMsg = result.detail ?? result.error ?? result.title ?? `Validation failed: ${response.status}`;
            return {
                valid: false,
                errors: [{ message: errorMsg }],
                warnings: []
            };
        }
        return {
            valid: result.success ?? true,
            errors: result.validationErrors?.map(msg => ({ message: msg })) ?? [],
            warnings: []
        };
    }
    /**
     * Dry-run a workflow with sample input (no actual HTTP calls)
     */
    async dryRunWorkflow(yaml, sampleInput) {
        const response = await fetch(`${this.baseUrl}/api/v1/workflows/test-execute`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ yaml, input: sampleInput })
        });
        if (!response.ok) {
            throw new Error(`Failed to dry-run workflow: ${response.status} ${response.statusText}`);
        }
        const result = await response.json();
        return {
            valid: result.valid ?? false,
            executionPlan: result.executionPlan ?? { tasks: [], parallelGroups: [] },
            errors: result.errors ?? []
        };
    }
    /**
     * Execute a deployed workflow with actual input
     */
    async executeWorkflow(workflowName, input) {
        const response = await fetch(`${this.baseUrl}/api/v1/workflows/${workflowName}/execute`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(input)
        });
        if (!response.ok) {
            if (response.status === 404) {
                throw new Error(`Workflow not found: ${workflowName}`);
            }
            throw new Error(`Failed to execute workflow: ${response.status} ${response.statusText}`);
        }
        const result = await response.json();
        return {
            executionId: result.executionId,
            status: result.status,
            output: result.output ?? {},
            taskResults: result.taskResults ?? [],
            totalDuration: result.totalDuration ?? 0
        };
    }
}
//# sourceMappingURL=gateway-client.js.map