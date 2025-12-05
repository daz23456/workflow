/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { SchemaDefinition } from './SchemaDefinition';
import type { WorkflowEndpoints } from './WorkflowEndpoints';
import type { WorkflowTaskStep } from './WorkflowTaskStep';
export type WorkflowDetailResponse = {
    name?: string | null;
    namespace?: string | null;
    inputSchema?: SchemaDefinition;
    outputSchema?: Record<string, any> | null;
    tasks?: Array<WorkflowTaskStep> | null;
    endpoints?: WorkflowEndpoints;
};

