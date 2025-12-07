import { SchemaDefinition } from './schema';
/**
 * Kubernetes Custom Resource for WorkflowTask
 */
export interface WorkflowTaskResource {
    apiVersion: string;
    kind: string;
    metadata: ResourceMetadata;
    spec: WorkflowTaskSpec;
    status?: WorkflowTaskStatus;
}
/**
 * Resource metadata (name, namespace)
 */
export interface ResourceMetadata {
    name: string;
    namespace: string;
}
/**
 * WorkflowTask specification
 */
export interface WorkflowTaskSpec {
    type: string;
    inputSchema?: SchemaDefinition;
    outputSchema?: SchemaDefinition;
    request?: HttpRequestDefinition;
    http?: HttpRequestDefinition;
    transform?: TransformDefinition;
    timeout?: string;
}
/**
 * HTTP request definition for fetch tasks
 */
export interface HttpRequestDefinition {
    method: string;
    url: string;
    headers?: Record<string, string>;
    body?: string;
}
/**
 * Transform definition for data transformation tasks
 */
export interface TransformDefinition {
    input: string;
    jsonPath: string;
    query?: string;
}
/**
 * WorkflowTask status
 */
export interface WorkflowTaskStatus {
    usageCount: number;
    lastUpdated: string;
}
//# sourceMappingURL=workflowTask.d.ts.map