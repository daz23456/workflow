/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { TaskListResponse } from '../models/TaskListResponse';
import type { WorkflowListResponse } from '../models/WorkflowListResponse';
import type { WorkflowVersionListResponse } from '../models/WorkflowVersionListResponse';
import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';
export class WorkflowManagementService {
    constructor(public readonly httpRequest: BaseHttpRequest) {}
    /**
     * @returns void
     * @throws ApiError
     */
    public deleteApiV1Workflows({
        workflowName,
        namespace,
    }: {
        workflowName: string,
        namespace?: string,
    }): CancelablePromise<void> {
        return this.httpRequest.request({
            method: 'DELETE',
            url: '/api/v1/workflows/{workflowName}',
            path: {
                'workflowName': workflowName,
            },
            query: {
                'namespace': namespace,
            },
            errors: {
                404: `Not Found`,
                500: `Internal Server Error`,
            },
        });
    }
    /**
     * @returns WorkflowListResponse OK
     * @throws ApiError
     */
    public getApiV1Workflows({
        namespace,
    }: {
        namespace?: string,
    }): CancelablePromise<WorkflowListResponse> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/api/v1/workflows',
            query: {
                'namespace': namespace,
            },
        });
    }
    /**
     * @returns TaskListResponse OK
     * @throws ApiError
     */
    public getApiV1Tasks({
        namespace,
    }: {
        namespace?: string,
    }): CancelablePromise<TaskListResponse> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/api/v1/tasks',
            query: {
                'namespace': namespace,
            },
        });
    }
    /**
     * @returns WorkflowVersionListResponse OK
     * @throws ApiError
     */
    public getApiV1WorkflowsVersions({
        workflowName,
    }: {
        workflowName: string,
    }): CancelablePromise<WorkflowVersionListResponse> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/api/v1/workflows/{workflowName}/versions',
            path: {
                'workflowName': workflowName,
            },
        });
    }
}
