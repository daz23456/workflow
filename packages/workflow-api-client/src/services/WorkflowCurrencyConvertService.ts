/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';
export class WorkflowCurrencyConvertService {
    constructor(public readonly httpRequest: BaseHttpRequest) {}
    /**
     * Execute currency-convert workflow
     * Execute the 'currency-convert' workflow with the provided input parameters.
     * @returns any Workflow execution completed successfully
     * @throws ApiError
     */
    public currencyConvertExecute({
        requestBody,
    }: {
        /**
         * Workflow input parameters matching the defined schema
         */
        requestBody: {
            input: {
                /**
                 * The amount to convert
                 */
                amount: number;
                /**
                 * Source currency code (e.g., USD, EUR, GBP)
                 */
                fromCurrency: string;
                /**
                 * Target currency code (e.g., USD, EUR, GBP)
                 */
                toCurrency: string;
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
    public currencyConvertTest({
        requestBody,
    }: {
        /**
         * Workflow input parameters matching the defined schema
         */
        requestBody: {
            input: {
                /**
                 * The amount to convert
                 */
                amount: number;
                /**
                 * Source currency code (e.g., USD, EUR, GBP)
                 */
                fromCurrency: string;
                /**
                 * Target currency code (e.g., USD, EUR, GBP)
                 */
                toCurrency: string;
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
    public currencyConvertGetDetails(): CancelablePromise<{
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
            url: '/api/v1/workflows/currency-convert',
            errors: {
                404: `Workflow not found`,
            },
        });
    }
}
