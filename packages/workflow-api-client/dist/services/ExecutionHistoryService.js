"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExecutionHistoryService = void 0;
class ExecutionHistoryService {
    constructor(httpRequest) {
        this.httpRequest = httpRequest;
    }
    /**
     * @returns any OK
     * @throws ApiError
     */
    getApiV1ExecutionsWorkflowsList({ workflowName, status, skip, take = 20, }) {
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
    getApiV1Executions({ id, }) {
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
    getApiV1ExecutionsTrace({ id, }) {
        return this.httpRequest.request({
            method: 'GET',
            url: '/api/v1/executions/{id}/trace',
            path: {
                'id': id,
            },
        });
    }
}
exports.ExecutionHistoryService = ExecutionHistoryService;
//# sourceMappingURL=ExecutionHistoryService.js.map