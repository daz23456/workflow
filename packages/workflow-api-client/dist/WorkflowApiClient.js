"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkflowApiClient = void 0;
const FetchHttpRequest_1 = require("./core/FetchHttpRequest");
const DynamicWorkflowService_1 = require("./services/DynamicWorkflowService");
const ExecutionHistoryService_1 = require("./services/ExecutionHistoryService");
const WorkflowCurrencyConvertService_1 = require("./services/WorkflowCurrencyConvertService");
const WorkflowEcommerceAnalyticsService_1 = require("./services/WorkflowEcommerceAnalyticsService");
const WorkflowGetTodoService_1 = require("./services/WorkflowGetTodoService");
const WorkflowManagementService_1 = require("./services/WorkflowManagementService");
const WorkflowSimpleFetchService_1 = require("./services/WorkflowSimpleFetchService");
const WorkflowSpaceInfoService_1 = require("./services/WorkflowSpaceInfoService");
const WorkflowUserActivityAnalysisService_1 = require("./services/WorkflowUserActivityAnalysisService");
const WorkflowUserProfileService_1 = require("./services/WorkflowUserProfileService");
class WorkflowApiClient {
    constructor(config, HttpRequest = FetchHttpRequest_1.FetchHttpRequest) {
        this.request = new HttpRequest({
            BASE: config?.BASE ?? '',
            VERSION: config?.VERSION ?? '1',
            WITH_CREDENTIALS: config?.WITH_CREDENTIALS ?? false,
            CREDENTIALS: config?.CREDENTIALS ?? 'include',
            TOKEN: config?.TOKEN,
            USERNAME: config?.USERNAME,
            PASSWORD: config?.PASSWORD,
            HEADERS: config?.HEADERS,
            ENCODE_PATH: config?.ENCODE_PATH,
        });
        this.dynamicWorkflow = new DynamicWorkflowService_1.DynamicWorkflowService(this.request);
        this.executionHistory = new ExecutionHistoryService_1.ExecutionHistoryService(this.request);
        this.workflowCurrencyConvert = new WorkflowCurrencyConvertService_1.WorkflowCurrencyConvertService(this.request);
        this.workflowEcommerceAnalytics = new WorkflowEcommerceAnalyticsService_1.WorkflowEcommerceAnalyticsService(this.request);
        this.workflowGetTodo = new WorkflowGetTodoService_1.WorkflowGetTodoService(this.request);
        this.workflowManagement = new WorkflowManagementService_1.WorkflowManagementService(this.request);
        this.workflowSimpleFetch = new WorkflowSimpleFetchService_1.WorkflowSimpleFetchService(this.request);
        this.workflowSpaceInfo = new WorkflowSpaceInfoService_1.WorkflowSpaceInfoService(this.request);
        this.workflowUserActivityAnalysis = new WorkflowUserActivityAnalysisService_1.WorkflowUserActivityAnalysisService(this.request);
        this.workflowUserProfile = new WorkflowUserProfileService_1.WorkflowUserProfileService(this.request);
    }
}
exports.WorkflowApiClient = WorkflowApiClient;
//# sourceMappingURL=WorkflowApiClient.js.map