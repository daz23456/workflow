import type { ExecutionListResponse } from '../models/ExecutionListResponse';
import type { WorkflowDetailResponse } from '../models/WorkflowDetailResponse';
import type { WorkflowExecutionRequest } from '../models/WorkflowExecutionRequest';
import type { WorkflowExecutionResponse } from '../models/WorkflowExecutionResponse';
import type { WorkflowTestRequest } from '../models/WorkflowTestRequest';
import type { WorkflowTestResponse } from '../models/WorkflowTestResponse';
import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';
export declare class DynamicWorkflowService {
    readonly httpRequest: BaseHttpRequest;
    constructor(httpRequest: BaseHttpRequest);
    /**
     * @returns WorkflowExecutionResponse OK
     * @throws ApiError
     */
    postApiV1WorkflowsExecute({ workflowName, namespace, requestBody, }: {
        workflowName: string;
        namespace?: string;
        requestBody?: WorkflowExecutionRequest;
    }): CancelablePromise<WorkflowExecutionResponse>;
    /**
     * @returns WorkflowTestResponse OK
     * @throws ApiError
     */
    postApiV1WorkflowsTest({ workflowName, namespace, requestBody, }: {
        workflowName: string;
        namespace?: string;
        requestBody?: WorkflowTestRequest;
    }): CancelablePromise<WorkflowTestResponse>;
    /**
     * @returns WorkflowDetailResponse OK
     * @throws ApiError
     */
    getApiV1Workflows({ workflowName, namespace, }: {
        workflowName: string;
        namespace?: string;
    }): CancelablePromise<WorkflowDetailResponse>;
    /**
     * @returns ExecutionListResponse OK
     * @throws ApiError
     */
    getApiV1WorkflowsExecutions({ workflowName, namespace, status, skip, take, }: {
        workflowName: string;
        namespace?: string;
        status?: string;
        skip?: number;
        take?: number;
    }): CancelablePromise<ExecutionListResponse>;
}
//# sourceMappingURL=DynamicWorkflowService.d.ts.map