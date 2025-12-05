"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkflowUserActivityAnalysisService = void 0;
class WorkflowUserActivityAnalysisService {
    constructor(httpRequest) {
        this.httpRequest = httpRequest;
    }
    /**
     * Execute user-activity-analysis workflow
     * Execute the 'user-activity-analysis' workflow with the provided input parameters.
     * @returns any Workflow execution completed successfully
     * @throws ApiError
     */
    userActivityAnalysisExecute({ requestBody, }) {
        return this.httpRequest.request({
            method: 'POST',
            url: '/api/v1/workflows/user-activity-analysis/execute',
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
     * Test user-activity-analysis workflow
     * Test the 'user-activity-analysis' workflow (dry-run mode). Validates input and returns execution plan without executing tasks.
     * @returns any Workflow execution completed successfully
     * @throws ApiError
     */
    userActivityAnalysisTest({ requestBody, }) {
        return this.httpRequest.request({
            method: 'POST',
            url: '/api/v1/workflows/user-activity-analysis/test',
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
     * Get user-activity-analysis workflow details
     * Get detailed information about the 'user-activity-analysis' workflow including input schema, tasks, and output mapping.
     * @returns any Workflow details retrieved successfully
     * @throws ApiError
     */
    userActivityAnalysisGetDetails() {
        return this.httpRequest.request({
            method: 'GET',
            url: '/api/v1/workflows/user-activity-analysis',
            errors: {
                404: `Workflow not found`,
            },
        });
    }
}
exports.WorkflowUserActivityAnalysisService = WorkflowUserActivityAnalysisService;
//# sourceMappingURL=WorkflowUserActivityAnalysisService.js.map