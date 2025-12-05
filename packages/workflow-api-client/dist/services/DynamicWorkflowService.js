"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DynamicWorkflowService = void 0;
class DynamicWorkflowService {
    constructor(httpRequest) {
        this.httpRequest = httpRequest;
    }
    /**
     * @returns WorkflowExecutionResponse OK
     * @throws ApiError
     */
    postApiV1WorkflowsExecute({ workflowName, namespace, requestBody, }) {
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
    postApiV1WorkflowsTest({ workflowName, namespace, requestBody, }) {
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
    getApiV1Workflows({ workflowName, namespace, }) {
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
    getApiV1WorkflowsExecutions({ workflowName, namespace, status, skip, take, }) {
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
exports.DynamicWorkflowService = DynamicWorkflowService;
//# sourceMappingURL=DynamicWorkflowService.js.map