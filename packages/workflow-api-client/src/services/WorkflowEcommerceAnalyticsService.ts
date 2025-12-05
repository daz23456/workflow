/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';
export class WorkflowEcommerceAnalyticsService {
    constructor(public readonly httpRequest: BaseHttpRequest) {}
    /**
     * Execute ecommerce-analytics workflow
     * Execute the 'ecommerce-analytics' workflow with the provided input parameters.
     * @returns any Workflow execution completed successfully
     * @throws ApiError
     */
    public ecommerceAnalyticsExecute({
        requestBody,
    }: {
        /**
         * Workflow input parameters matching the defined schema
         */
        requestBody: {
            input: {
                /**
                 * Raw customer data from CRM
                 */
                customers: string;
                /**
                 * Raw order data from database
                 */
                orders: string;
            };
        },
    }): CancelablePromise<{
        /**
         * Unique execution ID
         */
        executionId?: string;
        /**
         * Execution status (Succeeded/Failed)
         */
        status?: string;
        /**
         * Workflow output values
         */
        outputs?: Record<string, any>;
        /**
         * Task execution details
         */
        tasks?: any[];
    }> {
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
    public ecommerceAnalyticsTest({
        requestBody,
    }: {
        /**
         * Workflow input parameters matching the defined schema
         */
        requestBody: {
            input: {
                /**
                 * Raw customer data from CRM
                 */
                customers: string;
                /**
                 * Raw order data from database
                 */
                orders: string;
            };
        },
    }): CancelablePromise<{
        /**
         * Unique execution ID
         */
        executionId?: string;
        /**
         * Execution status (Succeeded/Failed)
         */
        status?: string;
        /**
         * Workflow output values
         */
        outputs?: Record<string, any>;
        /**
         * Task execution details
         */
        tasks?: any[];
    }> {
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
    public ecommerceAnalyticsGetDetails(): CancelablePromise<{
        /**
         * Workflow name
         */
        name?: string;
        /**
         * Workflow description
         */
        description?: string;
        /**
         * Input schema definition
         */
        input?: Record<string, any>;
        /**
         * Output mapping definition
         */
        output?: Record<string, any>;
        /**
         * Task definitions
         */
        tasks?: any[];
    }> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/api/v1/workflows/ecommerce-analytics',
            errors: {
                404: `Workflow not found`,
            },
        });
    }
}
