/**
 * Auto-generated from JSON Schema - DO NOT EDIT MANUALLY
 * Generated at: 2025-11-26T10:27:14Z
 * Source: schemas/workflow-task.schema.json
 */
/**
 * Kubernetes Custom Resource for WorkflowTask
 */
export interface WorkflowTask {
    /**
     * API version
     */
    apiVersion: "workflow.example.com/v1";
    /**
     * Resource kind
     */
    kind: "WorkflowTask";
    metadata: ResourceMetadata;
    spec: WorkflowTaskSpec;
    status?: WorkflowTaskStatus;
    [k: string]: any | undefined;
}
/**
 * Kubernetes resource metadata
 */
export interface ResourceMetadata {
    /**
     * Resource name
     */
    name: string;
    /**
     * Resource namespace
     */
    namespace: string;
}
/**
 * WorkflowTask specification
 */
export interface WorkflowTaskSpec {
    /**
     * Task type (fetch, transform, etc.)
     */
    type: "fetch" | "transform" | "webhook";
    inputSchema?: SchemaDefinition;
    outputSchema?: SchemaDefinition;
    request?: HttpRequestDefinition;
    http?: HttpRequestDefinition;
    transform?: TransformDefinition;
    /**
     * Task timeout (e.g., 30s, 5m, 2h)
     */
    timeout?: string;
    [k: string]: any | undefined;
}
/**
 * JSON Schema definition for validation
 */
export interface SchemaDefinition {
    type: "object" | "array" | "string" | "number" | "integer" | "boolean" | "null";
    properties?: {
        [k: string]: PropertyDefinition | undefined;
    };
    required?: string[];
    description?: string;
    items?: PropertyDefinition | undefined;
}
/**
 * Property definition within a schema
 */
export interface PropertyDefinition {
    type: "object" | "array" | "string" | "number" | "integer" | "boolean" | "null";
    description?: string;
    format?: string;
    properties?: {
        [k: string]: PropertyDefinition | undefined;
    };
    items?: PropertyDefinition | undefined;
    enum?: string[];
    minimum?: number;
    maximum?: number;
    pattern?: string;
    required?: string[];
}
/**
 * HTTP request definition for fetch tasks
 */
export interface HttpRequestDefinition {
    /**
     * HTTP method
     */
    method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
    /**
     * Request URL (supports templates)
     */
    url: string;
    /**
     * HTTP headers
     */
    headers?: {
        [k: string]: string | undefined;
    };
    /**
     * Request body (supports templates)
     */
    body?: string;
    [k: string]: any | undefined;
}
/**
 * Transform definition for data transformation tasks
 */
export interface TransformDefinition {
    /**
     * JSONPath to input data
     */
    input: string;
    /**
     * JSONPath expression for transformation
     */
    jsonPath: string;
    /**
     * Legacy: JSONPath query (deprecated)
     */
    query?: string;
    [k: string]: any | undefined;
}
/**
 * WorkflowTask status
 */
export interface WorkflowTaskStatus {
    /**
     * Number of times this task has been used
     */
    usageCount?: number;
    /**
     * Last update timestamp
     */
    lastUpdated?: string;
    [k: string]: any | undefined;
}
//# sourceMappingURL=workflow-task.d.ts.map