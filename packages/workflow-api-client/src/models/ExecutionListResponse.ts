/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ExecutionSummary } from './ExecutionSummary';
export type ExecutionListResponse = {
    workflowName?: string | null;
    executions?: Array<ExecutionSummary> | null;
    totalCount?: number;
    skip?: number;
    take?: number;
};

