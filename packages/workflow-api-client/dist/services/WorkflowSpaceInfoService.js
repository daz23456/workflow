"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkflowSpaceInfoService = void 0;
class WorkflowSpaceInfoService {
    constructor(httpRequest) {
        this.httpRequest = httpRequest;
    }
    /**
     * Execute space-info workflow
     * Execute the 'space-info' workflow with the provided input parameters.
     * @returns any Workflow execution completed successfully
     * @throws ApiError
     */
    spaceInfoExecute({ requestBody, }) {
        return this.httpRequest.request({
            method: 'POST',
            url: '/api/v1/workflows/space-info/execute',
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
     * Test space-info workflow
     * Test the 'space-info' workflow (dry-run mode). Validates input and returns execution plan without executing tasks.
     * @returns any Workflow execution completed successfully
     * @throws ApiError
     */
    spaceInfoTest({ requestBody, }) {
        return this.httpRequest.request({
            method: 'POST',
            url: '/api/v1/workflows/space-info/test',
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
     * Get space-info workflow details
     * Get detailed information about the 'space-info' workflow including input schema, tasks, and output mapping.
     * @returns any Workflow details retrieved successfully
     * @throws ApiError
     */
    spaceInfoGetDetails() {
        return this.httpRequest.request({
            method: 'GET',
            url: '/api/v1/workflows/space-info',
            errors: {
                404: `Workflow not found`,
            },
        });
    }
}
exports.WorkflowSpaceInfoService = WorkflowSpaceInfoService;
//# sourceMappingURL=WorkflowSpaceInfoService.js.map