import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';
export declare class WorkflowEcommerceAnalyticsService {
    readonly httpRequest: BaseHttpRequest;
    constructor(httpRequest: BaseHttpRequest);
    /**
     * Execute ecommerce-analytics workflow
     * Execute the 'ecommerce-analytics' workflow with the provided input parameters.
     * @returns any Workflow execution completed successfully
     * @throws ApiError
     */
    ecommerceAnalyticsExecute({ requestBody, }: {
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
     * Test ecommerce-analytics workflow
     * Test the 'ecommerce-analytics' workflow (dry-run mode). Validates input and returns execution plan without executing tasks.
     * @returns any Workflow execution completed successfully
     * @throws ApiError
     */
    ecommerceAnalyticsTest({ requestBody, }: {
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
     * Get ecommerce-analytics workflow details
     * Get detailed information about the 'ecommerce-analytics' workflow including input schema, tasks, and output mapping.
     * @returns any Workflow details retrieved successfully
     * @throws ApiError
     */
    ecommerceAnalyticsGetDetails(): CancelablePromise<{
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
//# sourceMappingURL=WorkflowEcommerceAnalyticsService.d.ts.map