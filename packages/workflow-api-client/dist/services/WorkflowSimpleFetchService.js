"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkflowSimpleFetchService = void 0;
class WorkflowSimpleFetchService {
    constructor(httpRequest) {
        this.httpRequest = httpRequest;
    }
    /**
     * Execute simple-fetch workflow
     * Execute the 'simple-fetch' workflow with the provided input parameters.
     * @returns any Workflow execution completed successfully
     * @throws ApiError
     */
    simpleFetchExecute({ requestBody, }) {
        return this.httpRequest.request({
            method: 'POST',
            url: '/api/v1/workflows/simple-fetch/execute',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `Input validation failed - check input parameters against schema`,
                404: `Workflow not found`,
                500: `Workflow execution failed - check task errors`,
            },
        });
    }
    /**
     * Test simple-fetch workflow
     * Test the 'simple-fetch' workflow (dry-run mode). Validates input and returns execution plan without executing tasks.
     * @returns any Workflow execution completed successfully
     * @throws ApiError
     */
    simpleFetchTest({ requestBody, }) {
        return this.httpRequest.request({
            method: 'POST',
            url: '/api/v1/workflows/simple-fetch/test',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `Input validation failed - check input parameters against schema`,
                404: `Workflow not found`,
                500: `Workflow execution failed - check task errors`,
            },
        });
    }
    /**
     * Get simple-fetch workflow details
     * Get detailed information about the 'simple-fetch' workflow including input schema, tasks, and output mapping.
     * @returns any Workflow details retrieved successfully
     * @throws ApiError
     */
    simpleFetchGetDetails() {
        return this.httpRequest.request({
            method: 'GET',
            url: '/api/v1/workflows/simple-fetch',
            errors: {
                404: `Workflow not found`,
            },
        });
    }
}
exports.WorkflowSimpleFetchService = WorkflowSimpleFetchService;
//# sourceMappingURL=WorkflowSimpleFetchService.js.map