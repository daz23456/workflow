/**
 * Gateway Client
 * HTTP client for WorkflowGateway API
 */
/**
 * Custom error for Gateway API errors
 */
export class GatewayError extends Error {
    statusCode;
    details;
    constructor(message, statusCode, details) {
        super(message);
        this.statusCode = statusCode;
        this.details = details;
        this.name = 'GatewayError';
    }
}
/**
 * Gateway client for WorkflowGateway API
 */
export class GatewayClient {
    baseUrl;
    namespace;
    constructor(baseUrl, namespace) {
        // Remove trailing slash
        this.baseUrl = baseUrl.replace(/\/$/, '');
        this.namespace = namespace;
    }
    /**
     * Make HTTP request to gateway
     */
    async request(path, options = {}) {
        const url = `${this.baseUrl}${path}`;
        const response = await fetch(url, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            }
        });
        if (!response.ok) {
            if (response.status === 404) {
                return null;
            }
            let details;
            try {
                const body = await response.json();
                details = body.details;
            }
            catch {
                // Ignore JSON parse errors
            }
            throw new GatewayError(`Gateway request failed: ${response.statusText}`, response.status, details);
        }
        return response.json();
    }
    /**
     * List all workflows
     */
    async listWorkflows(namespace) {
        const ns = namespace || this.namespace;
        const query = ns ? `?namespace=${encodeURIComponent(ns)}` : '';
        const result = await this.request(`/api/v1/workflows${query}`, { method: 'GET' });
        return result.workflows;
    }
    /**
     * List all tasks
     */
    async listTasks(namespace) {
        const ns = namespace || this.namespace;
        const query = ns ? `?namespace=${encodeURIComponent(ns)}` : '';
        const result = await this.request(`/api/v1/tasks${query}`, { method: 'GET' });
        return result.tasks;
    }
    /**
     * Execute a workflow
     */
    async executeWorkflow(name, input, namespace) {
        const ns = namespace || this.namespace;
        const query = ns ? `?namespace=${encodeURIComponent(ns)}` : '';
        return this.request(`/api/v1/workflows/${encodeURIComponent(name)}/execute${query}`, {
            method: 'POST',
            body: JSON.stringify({ input })
        });
    }
    /**
     * Dry run a workflow (test without execution)
     */
    async dryRunWorkflow(name, input, namespace) {
        const ns = namespace || this.namespace;
        const query = ns ? `?namespace=${encodeURIComponent(ns)}` : '';
        return this.request(`/api/v1/workflows/${encodeURIComponent(name)}/test${query}`, {
            method: 'POST',
            body: JSON.stringify({ input })
        });
    }
    /**
     * Get workflow details
     */
    async getWorkflow(name, namespace) {
        const ns = namespace || this.namespace;
        const query = ns ? `?namespace=${encodeURIComponent(ns)}` : '';
        return this.request(`/api/v1/workflows/${encodeURIComponent(name)}${query}`, { method: 'GET' });
    }
    /**
     * Get execution details
     */
    async getExecution(executionId) {
        return this.request(`/api/v1/executions/${encodeURIComponent(executionId)}`, { method: 'GET' });
    }
    /**
     * Check gateway health
     */
    async health() {
        try {
            const response = await fetch(`${this.baseUrl}/health`, { method: 'GET' });
            return response.ok;
        }
        catch {
            return false;
        }
    }
}
//# sourceMappingURL=gateway-client.js.map