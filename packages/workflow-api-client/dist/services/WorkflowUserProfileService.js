"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkflowUserProfileService = void 0;
class WorkflowUserProfileService {
    constructor(httpRequest) {
        this.httpRequest = httpRequest;
    }
    /**
     * Execute user-profile workflow
     * Execute the 'user-profile' workflow with the provided input parameters.
     * @returns any Workflow execution completed successfully
     * @throws ApiError
     */
    userProfileExecute({ requestBody, }) {
        return this.httpRequest.request({
            method: 'POST',
            url: '/api/v1/workflows/user-profile/execute',
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
     * Test user-profile workflow
     * Test the 'user-profile' workflow (dry-run mode). Validates input and returns execution plan without executing tasks.
     * @returns any Workflow execution completed successfully
     * @throws ApiError
     */
    userProfileTest({ requestBody, }) {
        return this.httpRequest.request({
            method: 'POST',
            url: '/api/v1/workflows/user-profile/test',
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
     * Get user-profile workflow details
     * Get detailed information about the 'user-profile' workflow including input schema, tasks, and output mapping.
     * @returns any Workflow details retrieved successfully
     * @throws ApiError
     */
    userProfileGetDetails() {
        return this.httpRequest.request({
            method: 'GET',
            url: '/api/v1/workflows/user-profile',
            errors: {
                404: `Workflow not found`,
            },
        });
    }
}
exports.WorkflowUserProfileService = WorkflowUserProfileService;
//# sourceMappingURL=WorkflowUserProfileService.js.map