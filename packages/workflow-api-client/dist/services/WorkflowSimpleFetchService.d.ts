import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';
export declare class WorkflowSimpleFetchService {
    readonly httpRequest: BaseHttpRequest;
    constructor(httpRequest: BaseHttpRequest);
    /**
     * Execute simple-fetch workflow
     * Execute the 'simple-fetch' workflow with the provided input parameters.
     * @returns any Workflow execution completed successfully
     * @throws ApiError
     */
    simpleFetchExecute({ requestBody, }: {
        /**
         * Workflow input parameters matching the defined schema
         */
        requestBody: {
            input: {
                /**
                 * The user ID to fetch
                 */
                userId: string;
            };
        };
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
    }>;
    /**
     * Test simple-fetch workflow
     * Test the 'simple-fetch' workflow (dry-run mode). Validates input and returns execution plan without executing tasks.
     * @returns any Workflow execution completed successfully
     * @throws ApiError
     */
    simpleFetchTest({ requestBody, }: {
        /**
         * Workflow input parameters matching the defined schema
         */
        requestBody: {
            input: {
                /**
                 * The user ID to fetch
                 */
                userId: string;
            };
        };
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
    }>;
    /**
     * Get simple-fetch workflow details
     * Get detailed information about the 'simple-fetch' workflow including input schema, tasks, and output mapping.
     * @returns any Workflow details retrieved successfully
     * @throws ApiError
     */
    simpleFetchGetDetails(): CancelablePromise<{
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
    }>;
}
//# sourceMappingURL=WorkflowSimpleFetchService.d.ts.map