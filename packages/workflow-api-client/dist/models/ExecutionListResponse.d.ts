import type { ExecutionSummary } from './ExecutionSummary';
export type ExecutionListResponse = {
    workflowName?: string | null;
    executions?: Array<ExecutionSummary> | null;
    totalCount?: number;
    skip?: number;
    take?: number;
};
//# sourceMappingURL=ExecutionListResponse.d.ts.map