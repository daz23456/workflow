/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ExecutionListResponse } from '../models/ExecutionListResponse';
import type { WorkflowDetailResponse } from '../models/WorkflowDetailResponse';
import type { WorkflowExecutionRequest } from '../models/WorkflowExecutionRequest';
import type { WorkflowExecutionResponse } from '../models/WorkflowExecutionResponse';
import type { WorkflowTestRequest } from '../models/WorkflowTestRequest';
import type { WorkflowTestResponse } from '../models/WorkflowTestResponse';
import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';
export class DynamicWorkflowService {
    constructor(public readonly httpRequest: BaseHttpRequest) {}
    /**
     * @returns WorkflowExecutionResponse OK
     * @throws ApiError
     */
    public postApiV1WorkflowsExecute({
        workflowName,
        namespace,
        requestBody,
    }: {
        workflowName: string,
        namespace?: string,
        requestBody?: WorkflowExecutionRequest,
    }): CancelablePromise<WorkflowExecutionResponse> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/api/v1/workflows/{workflowName}/execute',
            path: {
                'workflowName': workflowName,
            },
            query: {
                'namespace': namespace,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `Bad Request`,
                404: `Not Found`,
            },
        });
    }
    /**
     * @returns WorkflowTestResponse OK
     * @throws ApiError
     */
    public postApiV1WorkflowsTest({
        workflowName,
        namespace,
        requestBody,
    }: {
        workflowName: string,
        namespace?: string,
        requestBody?: WorkflowTestRequest,
    }): CancelablePromise<WorkflowTestResponse> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/api/v1/workflows/{workflowName}/test',
            path: {
                'workflowName': workflowName,
            },
            query: {
                'namespace': namespace,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                404: `Not Found`,
            },
        });
    }
    /**
     * @returns WorkflowDetailResponse OK
     * @throws ApiError
     */
    public getApiV1Workflows({
        workflowName,
        namespace,
    }: {
        workflowName: string,
        namespace?: string,
    }): CancelablePromise<WorkflowDetailResponse> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/api/v1/workflows/{workflowName}',
            path: {
                'workflowName': workflowName,
            },
            query: {
                'namespace': namespace,
            },
            errors: {
                404: `Not Found`,
            },
        });
    }
    /**
     * @returns ExecutionListResponse OK
     * @throws ApiError
     */
    public getApiV1WorkflowsExecutions({
        workflowName,
        namespace,
        status,
        skip,
        take,
    }: {
        workflowName: string,
        namespace?: string,
        status?: string,
        skip?: number,
        take?: number,
    }): CancelablePromise<ExecutionListResponse> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/api/v1/workflows/{workflowName}/executions',
            path: {
                'workflowName': workflowName,
            },
            query: {
                'namespace': namespace,
                'status': status,
                'skip': skip,
                'take': take,
            },
            errors: {
                404: `Not Found`,
            },
        });
    }
}
