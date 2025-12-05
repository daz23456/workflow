/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { TaskExecutionDetail } from './TaskExecutionDetail';
export type WorkflowExecutionResponse = {
    executionId?: string;
    workflowName?: string | null;
    success?: boolean;
    output?: Record<string, any> | null;
    executedTasks?: Array<string> | null;
    taskDetails?: Array<TaskExecutionDetail> | null;
    executionTimeMs?: number;
    error?: string | null;
};

