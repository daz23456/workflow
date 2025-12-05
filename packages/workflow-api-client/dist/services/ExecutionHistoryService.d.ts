import type { ExecutionStatus } from '../models/ExecutionStatus';
import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';
export declare class ExecutionHistoryService {
    readonly httpRequest: BaseHttpRequest;
    constructor(httpRequest: BaseHttpRequest);
    /**
     * @returns any OK
     * @throws ApiError
     */
    getApiV1ExecutionsWorkflowsList({ workflowName, status, skip, take, }: {
        workflowName: string;
        status?: ExecutionStatus;
        skip?: number;
        take?: number;
    }): CancelablePromise<any>;
    /**
     * @returns any OK
     * @throws ApiError
     */
    getApiV1Executions({ id, }: {
        id: string;
    }): CancelablePromise<any>;
    /**
     * @returns any OK
     * @throws ApiError
     */
    getApiV1ExecutionsTrace({ id, }: {
        id: string;
    }): CancelablePromise<any>;
}
//# sourceMappingURL=ExecutionHistoryService.d.ts.map