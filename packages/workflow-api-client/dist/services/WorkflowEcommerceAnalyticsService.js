"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkflowEcommerceAnalyticsService = void 0;
class WorkflowEcommerceAnalyticsService {
    constructor(httpRequest) {
        this.httpRequest = httpRequest;
    }
    /**
     * Execute ecommerce-analytics workflow
     * Execute the 'ecommerce-analytics' workflow with the provided input parameters.
     * @returns any Workflow execution completed successfully
     * @throws ApiError
     */
    ecommerceAnalyticsExecute({ requestBody, }) {
        return this.httpRequest.request({
            method: 'POST',
            url: '/api/v1/workflows/ecommerce-analytics/execute',
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
     * Test ecommerce-analytics workflow
     * Test the 'ecommerce-analytics' workflow (dry-run mode). Validates input and returns execution plan without executing tasks.
     * @returns any Workflow execution completed successfully
     * @throws ApiError
     */
    ecommerceAnalyticsTest({ requestBody, }) {
        return this.httpRequest.request({
            method: 'POST',
            url: '/api/v1/workflows/ecommerce-analytics/test',
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
     * Get ecommerce-analytics workflow details
     * Get detailed information about the 'ecommerce-analytics' workflow including input schema, tasks, and output mapping.
     * @returns any Workflow details retrieved successfully
     * @throws ApiError
     */
    ecommerceAnalyticsGetDetails() {
        return this.httpRequest.request({
            method: 'GET',
            url: '/api/v1/workflows/ecommerce-analytics',
            errors: {
                404: `Workflow not found`,
            },
        });
    }
}
exports.WorkflowEcommerceAnalyticsService = WorkflowEcommerceAnalyticsService;
//# sourceMappingURL=WorkflowEcommerceAnalyticsService.js.map