import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';
export declare class WorkflowGetTodoService {
    readonly httpRequest: BaseHttpRequest;
    constructor(httpRequest: BaseHttpRequest);
    /**
     * Execute get-todo workflow
     * Execute the 'get-todo' workflow with the provided input parameters.
     * @returns any Workflow execution completed successfully
     * @throws ApiError
     */
    getTodoExecute({ requestBody, }: {
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
     * Test get-todo workflow
     * Test the 'get-todo' workflow (dry-run mode). Validates input and returns execution plan without executing tasks.
     * @returns any Workflow execution completed successfully
     * @throws ApiError
     */
    getTodoTest({ requestBody, }: {
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
     * Get get-todo workflow details
     * Get detailed information about the 'get-todo' workflow including input schema, tasks, and output mapping.
     * @returns any Workflow details retrieved successfully
     * @throws ApiError
     */
    getTodoGetDetails(): CancelablePromise<{
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
//# sourceMappingURL=WorkflowGetTodoService.d.ts.map