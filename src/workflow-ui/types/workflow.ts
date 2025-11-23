export interface WorkflowListItem {
  name: string;
  namespace: string;
  description: string;
  taskCount: number;
  inputSchemaPreview: string;
  endpoint: string;
  stats: {
    totalExecutions: number;
    successRate: number;
    avgDurationMs: number;
    lastExecuted?: string;
  };
}

export interface WorkflowDetail {
  name: string;
  namespace: string;
  description: string;
  inputSchema: JSONSchema;
  outputSchema: Record<string, string>;
  tasks: TaskDetail[];
  graph: {
    nodes: GraphNode[];
    edges: GraphEdge[];
    parallelGroups: ParallelGroup[];
  };
  endpoints: {
    execute: string;
    test: string;
    details: string;
  };
}

export interface TaskDetail {
  id: string;
  taskRef: string;
  description: string;
  input: Record<string, string>;
  inputSchema: JSONSchema;
  outputSchema: JSONSchema;
  httpRequest?: {
    method: string;
    url: string;
    headers: Record<string, string>;
    bodyTemplate: string;
  };
  timeout?: string;
  condition?: string;
}

export interface JSONSchema {
  type: string;
  properties?: Record<string, PropertyDefinition>;
  required?: string[];
  description?: string;
}

export interface PropertyDefinition {
  type: string;
  description?: string;
  format?: string;
  default?: any;
  minLength?: number;
  maxLength?: number;
  minimum?: number;
  maximum?: number;
  pattern?: string;
  enum?: string[];
}

export interface GraphNode {
  id: string;
  type: 'task';
  data: {
    label: string;
    taskRef: string;
    level: number;
    description?: string;
  };
  position: { x: number; y: number };
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  type: 'dependency';
  label?: string;
  data?: {
    hasWarning?: boolean;
    hasError?: boolean;
    validationIssues?: ValidationIssue[];
    isFlowing?: boolean;
  };
}

export interface ParallelGroup {
  level: number;
  taskIds: string[];
}

export interface ValidationIssue {
  severity: 'error' | 'warning' | 'info';
  message: string;
  sourceField?: string;
  targetField?: string;
  suggestedFix?: string;
}
