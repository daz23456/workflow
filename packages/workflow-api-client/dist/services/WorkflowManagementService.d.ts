import type { TaskListResponse } from '../models/TaskListResponse';
import type { WorkflowListResponse } from '../models/WorkflowListResponse';
import type { WorkflowVersionListResponse } from '../models/WorkflowVersionListResponse';
import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';
export declare class WorkflowManagementService {
    readonly httpRequest: BaseHttpRequest;
    constructor(httpRequest: BaseHttpRequest);
    /**
     * @returns void
     * @throws ApiError
     */
    deleteApiV1Workflows({ workflowName, namespace, }: {
        workflowName: string;
        namespace?: string;
    }): CancelablePromise<void>;
    /**
     * @returns WorkflowListResponse OK
     * @throws ApiError
     */
    getApiV1Workflows({ namespace, }: {
        namespace?: string;
    }): CancelablePromise<WorkflowListResponse>;
    /**
     * @returns TaskListResponse OK
     * @throws ApiError
     */
    getApiV1Tasks({ namespace, }: {
        namespace?: string;
    }): CancelablePromise<TaskListResponse>;
    /**
     * @returns WorkflowVersionListResponse OK
     * @throws ApiError
     */
    getApiV1WorkflowsVersions({ workflowName, }: {
        workflowName: string;
    }): CancelablePromise<WorkflowVersionListResponse>;
}
//# sourceMappingURL=WorkflowManagementService.d.ts.map