/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';
export class WorkflowGetTodoService {
    constructor(public readonly httpRequest: BaseHttpRequest) {}
    /**
     * Execute get-todo workflow
     * Execute the 'get-todo' workflow with the provided input parameters.
     * @returns any Workflow execution completed successfully
     * @throws ApiError
     */
    public getTodoExecute({
        requestBody,
    }: {
        /**
         * Workflow input parameters matching the defined schema
         */
        requestBody: {
            input: {
                /**
                 * The todo ID to fetch (1-200)
                 */
                todoId: string;
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
    public getTodoTest({
        requestBody,
    }: {
        /**
         * Workflow input parameters matching the defined schema
         */
        requestBody: {
            input: {
                /**
                 * The todo ID to fetch (1-200)
                 */
                todoId: string;
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
    public getTodoGetDetails(): CancelablePromise<{
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
            url: '/api/v1/workflows/get-todo',
            errors: {
                404: `Workflow not found`,
            },
        });
    }
}
