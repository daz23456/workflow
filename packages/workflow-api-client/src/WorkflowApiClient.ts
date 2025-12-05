/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { BaseHttpRequest } from './core/BaseHttpRequest';
import type { OpenAPIConfig } from './core/OpenAPI';
import { FetchHttpRequest } from './core/FetchHttpRequest';
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
export class WorkflowApiClient {
    public readonly dynamicWorkflow: DynamicWorkflowService;
    public readonly executionHistory: ExecutionHistoryService;
    public readonly workflowCurrencyConvert: WorkflowCurrencyConvertService;
    public readonly workflowEcommerceAnalytics: WorkflowEcommerceAnalyticsService;
    public readonly workflowGetTodo: WorkflowGetTodoService;
    public readonly workflowManagement: WorkflowManagementService;
    public readonly workflowSimpleFetch: WorkflowSimpleFetchService;
    public readonly workflowSpaceInfo: WorkflowSpaceInfoService;
    public readonly workflowUserActivityAnalysis: WorkflowUserActivityAnalysisService;
    public readonly workflowUserProfile: WorkflowUserProfileService;
    public readonly request: BaseHttpRequest;
    constructor(config?: Partial<OpenAPIConfig>, HttpRequest: HttpRequestConstructor = FetchHttpRequest) {
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
        this.dynamicWorkflow = new DynamicWorkflowService(this.request);
        this.executionHistory = new ExecutionHistoryService(this.request);
        this.workflowCurrencyConvert = new WorkflowCurrencyConvertService(this.request);
        this.workflowEcommerceAnalytics = new WorkflowEcommerceAnalyticsService(this.request);
        this.workflowGetTodo = new WorkflowGetTodoService(this.request);
        this.workflowManagement = new WorkflowManagementService(this.request);
        this.workflowSimpleFetch = new WorkflowSimpleFetchService(this.request);
        this.workflowSpaceInfo = new WorkflowSpaceInfoService(this.request);
        this.workflowUserActivityAnalysis = new WorkflowUserActivityAnalysisService(this.request);
        this.workflowUserProfile = new WorkflowUserProfileService(this.request);
    }
}

