/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';
export class WorkflowUserProfileService {
    constructor(public readonly httpRequest: BaseHttpRequest) {}
    /**
     * Execute user-profile workflow
     * Execute the 'user-profile' workflow with the provided input parameters.
     * @returns any Workflow execution completed successfully
     * @throws ApiError
     */
    public userProfileExecute({
        requestBody,
    }: {
        /**
         * Workflow input parameters matching the defined schema
         */
        requestBody: {
            input: {
                /**
                 * The user ID to fetch profile for
                 */
                userId: string;
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
    public userProfileTest({
        requestBody,
    }: {
        /**
         * Workflow input parameters matching the defined schema
         */
        requestBody: {
            input: {
                /**
                 * The user ID to fetch profile for
                 */
                userId: string;
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
    public userProfileGetDetails(): CancelablePromise<{
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
            url: '/api/v1/workflows/user-profile',
            errors: {
                404: `Workflow not found`,
            },
        });
    }
}
