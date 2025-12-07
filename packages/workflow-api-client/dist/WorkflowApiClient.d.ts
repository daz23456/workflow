import type { BaseHttpRequest } from './core/BaseHttpRequest';
import type { OpenAPIConfig } from './core/OpenAPI';
import { DynamicWorkflowService } from './services/DynamicWorkflowService';
import { ExecutionHistoryService } from './services/ExecutionHistoryService';
import { WorkflowCurrencyConvertService } from './services/WorkflowCurrencyConvertService';
import { WorkflowEcommerceAnalyticsService } from './services/WorkflowEcommerceAnalyticsService';
import { WorkflowGetTodoService } from './services/WorkflowGetTodoService';
import { WorkflowManagementService } from './services/WorkflowManagementService';
import { WorkflowSimpleFetchService } from './services/WorkflowSimpleFetchService';
import { WorkflowSpaceInfoService } from './services/WorkflowSpaceInfoService';
import { WorkflowUserActivityAnalysisService } from './services/WorkflowUserActivityAnalysisService';
import { WorkflowUserProfileService } from './services/WorkflowUserProfileService';
type HttpRequestConstructor = new (config: OpenAPIConfig) => BaseHttpRequest;
export declare class WorkflowApiClient {
    readonly dynamicWorkflow: DynamicWorkflowService;
    readonly executionHistory: ExecutionHistoryService;
    readonly workflowCurrencyConvert: WorkflowCurrencyConvertService;
    readonly workflowEcommerceAnalytics: WorkflowEcommerceAnalyticsService;
    readonly workflowGetTodo: WorkflowGetTodoService;
    readonly workflowManagement: WorkflowManagementService;
    readonly workflowSimpleFetch: WorkflowSimpleFetchService;
    readonly workflowSpaceInfo: WorkflowSpaceInfoService;
    readonly workflowUserActivityAnalysis: WorkflowUserActivityAnalysisService;
    readonly workflowUserProfile: WorkflowUserProfileService;
    readonly request: BaseHttpRequest;
    constructor(config?: Partial<OpenAPIConfig>, HttpRequest?: HttpRequestConstructor);
}
export {};
//# sourceMappingURL=WorkflowApiClient.d.ts.map