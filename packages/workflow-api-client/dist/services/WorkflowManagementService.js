"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkflowManagementService = void 0;
class WorkflowManagementService {
    constructor(httpRequest) {
        this.httpRequest = httpRequest;
    }
    /**
     * @returns void
     * @throws ApiError
     */
    deleteApiV1Workflows({ workflowName, namespace, }) {
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
    getApiV1Workflows({ namespace, }) {
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
    getApiV1Tasks({ namespace, }) {
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
    getApiV1WorkflowsVersions({ workflowName, }) {
        return this.httpRequest.request({
            method: 'GET',
            url: '/api/v1/workflows/{workflowName}/versions',
            path: {
                'workflowName': workflowName,
            },
        });
    }
}
exports.WorkflowManagementService = WorkflowManagementService;
//# sourceMappingURL=WorkflowManagementService.js.map