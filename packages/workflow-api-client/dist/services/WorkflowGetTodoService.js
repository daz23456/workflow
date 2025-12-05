"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkflowGetTodoService = void 0;
class WorkflowGetTodoService {
    constructor(httpRequest) {
        this.httpRequest = httpRequest;
    }
    /**
     * Execute get-todo workflow
     * Execute the 'get-todo' workflow with the provided input parameters.
     * @returns any Workflow execution completed successfully
     * @throws ApiError
     */
    getTodoExecute({ requestBody, }) {
        return this.httpRequest.request({
            method: 'POST',
            url: '/api/v1/workflows/get-todo/execute',
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
     * Test get-todo workflow
     * Test the 'get-todo' workflow (dry-run mode). Validates input and returns execution plan without executing tasks.
     * @returns any Workflow execution completed successfully
     * @throws ApiError
     */
    getTodoTest({ requestBody, }) {
        return this.httpRequest.request({
            method: 'POST',
            url: '/api/v1/workflows/get-todo/test',
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
     * Get get-todo workflow details
     * Get detailed information about the 'get-todo' workflow including input schema, tasks, and output mapping.
     * @returns any Workflow details retrieved successfully
     * @throws ApiError
     */
    getTodoGetDetails() {
        return this.httpRequest.request({
            method: 'GET',
            url: '/api/v1/workflows/get-todo',
            errors: {
                404: `Workflow not found`,
            },
        });
    }
}
exports.WorkflowGetTodoService = WorkflowGetTodoService;
//# sourceMappingURL=WorkflowGetTodoService.js.map