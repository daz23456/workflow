"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkflowCurrencyConvertService = void 0;
class WorkflowCurrencyConvertService {
    constructor(httpRequest) {
        this.httpRequest = httpRequest;
    }
    /**
     * Execute currency-convert workflow
     * Execute the 'currency-convert' workflow with the provided input parameters.
     * @returns any Workflow execution completed successfully
     * @throws ApiError
     */
    currencyConvertExecute({ requestBody, }) {
        return this.httpRequest.request({
            method: 'POST',
            url: '/api/v1/workflows/currency-convert/execute',
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
     * Test currency-convert workflow
     * Test the 'currency-convert' workflow (dry-run mode). Validates input and returns execution plan without executing tasks.
     * @returns any Workflow execution completed successfully
     * @throws ApiError
     */
    currencyConvertTest({ requestBody, }) {
        return this.httpRequest.request({
            method: 'POST',
            url: '/api/v1/workflows/currency-convert/test',
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
     * Get currency-convert workflow details
     * Get detailed information about the 'currency-convert' workflow including input schema, tasks, and output mapping.
     * @returns any Workflow details retrieved successfully
     * @throws ApiError
     */
    currencyConvertGetDetails() {
        return this.httpRequest.request({
            method: 'GET',
            url: '/api/v1/workflows/currency-convert',
            errors: {
                404: `Workflow not found`,
            },
        });
    }
}
exports.WorkflowCurrencyConvertService = WorkflowCurrencyConvertService;
//# sourceMappingURL=WorkflowCurrencyConvertService.js.map