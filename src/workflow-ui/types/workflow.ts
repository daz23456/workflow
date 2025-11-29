export interface WorkflowListItem {
  name: string;
  namespace: string;
  description: string;
  taskCount: number;
  inputSchemaPreview: string;
  endpoint: string;
  stats?: {  // ← Made optional - backend may not provide stats yet
    totalExecutions?: number;
    successRate?: number;
    successRateTrend?: number; // Percentage change (e.g., 2.3 for +2.3%, -1.5 for -1.5%)
    avgDurationMs?: number;
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
  graph?: {  // ← Made optional - backend may not provide graph yet
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
  input?: Record<string, string>;
  inputMapping?: Record<string, string>;
  inputSchema?: JSONSchema;
  outputSchema?: JSONSchema;
  httpRequest?: {
    method: string;
    url: string;
    headers: Record<string, string>;
    bodyTemplate: string;
  };
  timeout?: string;
  condition?: string;
  retryCount?: number;
  dependencies?: string[];
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
  enum?: Array<string | number | boolean>;
  items?: PropertyDefinition | JSONSchema;
  properties?: Record<string, PropertyDefinition>;
}

export interface GraphNode {
  id: string;
  type: 'task' | 'start' | 'end';
  data: {
    label: string;
    taskRef?: string;
    level?: number;
    description?: string;
    status?: string;
    schemaMismatch?: boolean;
  };
  position: { x: number; y: number };
}

export interface GraphEdge {
  id?: string;
  source: string;
  target: string;
  type?: 'dependency';
  label?: string;
  animated?: boolean;
  style?: Record<string, string>;
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

export interface WorkflowGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
  parallelGroups: ParallelGroup[];
}

export interface ValidationIssue {
  severity: 'error' | 'warning' | 'info';
  message: string;
  sourceField?: string;
  targetField?: string;
  suggestedFix?: string;
}
