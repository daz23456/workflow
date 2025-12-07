import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';
export declare class WorkflowUserActivityAnalysisService {
    readonly httpRequest: BaseHttpRequest;
    constructor(httpRequest: BaseHttpRequest);
    /**
     * Execute user-activity-analysis workflow
     * Execute the 'user-activity-analysis' workflow with the provided input parameters.
     * @returns any Workflow execution completed successfully
     * @throws ApiError
     */
    userActivityAnalysisExecute({ requestBody, }: {
        /**
         * Workflow input parameters matching the defined schema
         */
        requestBody: {
            input: {
                /**
                 * User ID to analyze from JSONPlaceholder
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
     * Test user-activity-analysis workflow
     * Test the 'user-activity-analysis' workflow (dry-run mode). Validates input and returns execution plan without executing tasks.
     * @returns any Workflow execution completed successfully
     * @throws ApiError
     */
    userActivityAnalysisTest({ requestBody, }: {
        /**
         * Workflow input parameters matching the defined schema
         */
        requestBody: {
            input: {
                /**
                 * User ID to analyze from JSONPlaceholder
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
     * Get user-activity-analysis workflow details
     * Get detailed information about the 'user-activity-analysis' workflow including input schema, tasks, and output mapping.
     * @returns any Workflow details retrieved successfully
     * @throws ApiError
     */
    userActivityAnalysisGetDetails(): CancelablePromise<{
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
//# sourceMappingURL=WorkflowUserActivityAnalysisService.d.ts.map