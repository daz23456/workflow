/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ExecutionStatus } from '../models/ExecutionStatus';
import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';
export class ExecutionHistoryService {
    constructor(public readonly httpRequest: BaseHttpRequest) {}
    /**
     * @returns any OK
     * @throws ApiError
     */
    public getApiV1ExecutionsWorkflowsList({
        workflowName,
        status,
        skip,
        take = 20,
    }: {
        workflowName: string,
        status?: ExecutionStatus,
        skip?: number,
        take?: number,
    }): CancelablePromise<any> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/api/v1/executions/workflows/{workflowName}/list',
            path: {
                'workflowName': workflowName,
            },
            query: {
                'status': status,
                'skip': skip,
                'take': take,
            },
        });
    }
    /**
     * @returns any OK
     * @throws ApiError
     */
    public getApiV1Executions({
        id,
    }: {
        id: string,
    }): CancelablePromise<any> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/api/v1/executions/{id}',
            path: {
                'id': id,
            },
        });
    }
    /**
     * @returns any OK
     * @throws ApiError
     */
    public getApiV1ExecutionsTrace({
        id,
    }: {
        id: string,
    }): CancelablePromise<any> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/api/v1/executions/{id}/trace',
            path: {
                'id': id,
            },
        });
    }
}
