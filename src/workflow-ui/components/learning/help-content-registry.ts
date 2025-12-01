/**
 * Centralized registry of all help topics for Stage 9.5 contextual help system.
 *
 * Organization:
 * - Workflow Builder (workflow metadata, properties)
 * - Task Configuration (task properties, fields)
 * - Task Palette (search, filters, categories)
 * - Template Syntax (expressions, references)
 * - Execution (testing, parallel execution, dependencies)
 * - Validation (errors, requirements)
 * - Advanced Features (output mapping, timeouts)
 */

import type { HelpTopic } from '@/types/learning';

// ============================================================================
// WORKFLOW BUILDER - Workflow Metadata
// ============================================================================

export const WORKFLOW_NAME: HelpTopic = {
  id: 'workflow-name',
  title: 'Workflow Name',
  content: 'A unique identifier for your workflow. Use lowercase with hyphens (kebab-case) for best practices. This name will be used in API endpoints and CLI commands.',
  examples: [
    'user-registration',
    'order-processing',
    'data-sync-pipeline',
  ],
  keywords: ['name', 'identifier', 'workflow', 'metadata'],
};

export const WORKFLOW_DESCRIPTION: HelpTopic = {
  id: 'workflow-description',
  title: 'Workflow Description',
  content: 'A human-readable description of what this workflow does. This helps other developers understand the purpose and behavior of your workflow.',
  examples: [
    'Fetches user data and sends welcome email',
    'Processes payment and updates inventory',
  ],
  keywords: ['description', 'documentation', 'workflow'],
};

export const WORKFLOW_VERSION: HelpTopic = {
  id: 'workflow-version',
  title: 'Workflow Version',
  content: 'Semantic version number for this workflow. The system automatically tracks version changes when the workflow definition is modified. Use semantic versioning (e.g., 1.0.0, 1.2.3).',
  examples: ['1.0.0', '2.1.0', '3.0.0-beta'],
  links: [
    { text: 'Semantic Versioning', url: 'https://semver.org/' },
  ],
  keywords: ['version', 'semver', 'versioning'],
};

export const WORKFLOW_NAMESPACE: HelpTopic = {
  id: 'workflow-namespace',
  title: 'Workflow Namespace',
  content: 'Kubernetes namespace where this workflow will be deployed. Namespaces provide isolation and organization for different environments or teams.',
  examples: ['default', 'production', 'staging', 'team-alpha'],
  keywords: ['namespace', 'kubernetes', 'deployment'],
};

// ============================================================================
// TASK CONFIGURATION - Task Properties
// ============================================================================

export const TASK_LABEL: HelpTopic = {
  id: 'task-label',
  title: 'Task Label',
  content: 'A unique identifier for this task within the workflow. Use descriptive names that clearly indicate what the task does. This label is used to reference the task in dependencies and output mappings.',
  examples: [
    'fetch-user-data',
    'validate-payment',
    'send-notification',
  ],
  keywords: ['label', 'task', 'identifier', 'name'],
};

export const TASK_REFERENCE: HelpTopic = {
  id: 'task-reference',
  title: 'Task Reference',
  content: 'The WorkflowTask resource to execute. This references a reusable task definition (like http-request, websocket-connect, etc.). Task definitions are created by administrators and define the schema and behavior.',
  examples: [
    'http-request',
    'websocket-connect',
    'email-sender',
  ],
  links: [
    { text: 'Available Tasks', url: '/tasks' },
  ],
  keywords: ['taskRef', 'reference', 'task', 'resource'],
};

export const TASK_DESCRIPTION: HelpTopic = {
  id: 'task-description',
  title: 'Task Description',
  content: 'Optional human-readable description of what this specific task instance does in your workflow. This appears in the visual graph and execution traces.',
  examples: [
    'Fetches current user profile from API',
    'Validates credit card using Stripe',
  ],
  keywords: ['description', 'documentation', 'task'],
};

export const TASK_TIMEOUT: HelpTopic = {
  id: 'task-timeout',
  title: 'Task Timeout',
  content: 'Maximum time this task is allowed to run before being cancelled. Use duration syntax: 30s (seconds), 5m (minutes), 2h (hours). If not specified, defaults to the workflow-level timeout.',
  examples: ['30s', '5m', '1h', '500ms'],
  keywords: ['timeout', 'duration', 'limit', 'performance'],
};

export const TASK_RETRY_POLICY: HelpTopic = {
  id: 'task-retry-policy',
  title: 'Retry Policy',
  content: 'Configures automatic retry behavior when a task fails. Supports exponential backoff, maximum attempts, and retry conditions.',
  examples: [
    'maxAttempts: 3',
    'backoff: exponential',
    'initialDelay: 1s',
  ],
  keywords: ['retry', 'error', 'resilience', 'failure'],
};

// ============================================================================
// TASK CONFIGURATION - Task Inputs & Outputs
// ============================================================================

export const TASK_INPUT: HelpTopic = {
  id: 'task-input',
  title: 'Task Input',
  content: 'Data passed to this task for execution. Can reference workflow inputs using {{input.fieldName}} or outputs from previous tasks using {{tasks.taskLabel.output.fieldName}}.',
  examples: [
    '{{input.userId}}',
    '{{tasks.fetch-user.output.email}}',
    'Static value',
  ],
  links: [
    { text: 'Template Syntax Guide', url: '#template-syntax' },
  ],
  keywords: ['input', 'data', 'template', 'reference'],
};

export const TASK_OUTPUT: HelpTopic = {
  id: 'task-output',
  title: 'Task Output',
  content: 'The data returned by this task after execution. Other tasks can reference this output in their inputs using {{tasks.thisTaskLabel.output.fieldName}}.',
  examples: [
    'output.userId',
    'output.data.email',
    'output.status',
  ],
  keywords: ['output', 'result', 'data', 'reference'],
};

export const INPUT_TYPES: HelpTopic = {
  id: 'input-types',
  title: 'Input Types',
  content: 'Workflow inputs are validated against JSON Schema. Supported types: string, number, integer, boolean, object, array. Each input can have constraints like format, pattern, min/max, required, etc.',
  examples: [
    'type: string',
    'type: integer',
    'type: object',
  ],
  links: [
    { text: 'JSON Schema Spec', url: 'https://json-schema.org/' },
  ],
  keywords: ['input', 'schema', 'validation', 'type'],
};

export const REQUIRED_FIELDS: HelpTopic = {
  id: 'required-fields',
  title: 'Required Fields',
  content: 'Fields marked as required must be provided when executing the workflow. The API will reject executions with missing required fields.',
  examples: [
    'required: [userId, email]',
  ],
  keywords: ['required', 'validation', 'input', 'mandatory'],
};

// ============================================================================
// TASK PALETTE - Search & Filters
// ============================================================================

export const SEARCH_TASKS: HelpTopic = {
  id: 'search-tasks',
  title: 'Search Tasks',
  content: 'Search for tasks by name, description, or category. The search is case-insensitive and matches partial strings. Use this to quickly find the task you need.',
  examples: [
    'http',
    'websocket',
    'email',
  ],
  keywords: ['search', 'filter', 'find', 'task'],
};

export const CATEGORY_FILTER: HelpTopic = {
  id: 'category-filter',
  title: 'Category Filter',
  content: 'Filter tasks by category to narrow down the list. Categories group related tasks together (e.g., API Integration, Data Processing, Messaging).',
  examples: [
    'API Integration',
    'Data Processing',
    'Messaging',
  ],
  keywords: ['category', 'filter', 'group', 'task'],
};

export const TASK_DRAG_DROP: HelpTopic = {
  id: 'task-drag-drop',
  title: 'Drag & Drop Tasks',
  content: 'Drag a task from the palette and drop it onto the canvas to add it to your workflow. The task will appear as a node that you can then configure and connect.',
  keywords: ['drag', 'drop', 'add', 'task', 'canvas'],
};

export const TASK_PREVIEW: HelpTopic = {
  id: 'task-preview',
  title: 'Task Preview',
  content: 'Click the preview button to see detailed information about a task, including its input/output schema, description, and usage examples.',
  keywords: ['preview', 'details', 'task', 'schema'],
};

// ============================================================================
// TEMPLATE SYNTAX - Expressions & References
// ============================================================================

export const TEMPLATE_SYNTAX: HelpTopic = {
  id: 'template-syntax',
  title: 'Template Syntax',
  content: 'Use {{expression}} syntax to reference dynamic values in task inputs. You can reference workflow inputs with {{input.field}} or task outputs with {{tasks.taskLabel.output.field}}. Supports nested paths with dot notation.',
  examples: [
    '{{input.userId}}',
    '{{tasks.fetch-user.output.data.email}}',
    '{{input.config.apiKey}}',
  ],
  links: [
    { text: 'Template Guide', url: '/docs/templates' },
  ],
  keywords: ['template', 'expression', 'reference', 'syntax'],
};

export const WORKFLOW_INPUT_REFERENCE: HelpTopic = {
  id: 'workflow-input-reference',
  title: 'Workflow Input Reference',
  content: 'Reference workflow inputs using {{input.fieldName}}. The field name must match a field defined in the workflow input schema.',
  examples: [
    '{{input.userId}}',
    '{{input.email}}',
    '{{input.config.timeout}}',
  ],
  keywords: ['input', 'reference', 'template', 'workflow'],
};

export const TASK_OUTPUT_REFERENCE: HelpTopic = {
  id: 'task-output-reference',
  title: 'Task Output Reference',
  content: 'Reference task outputs using {{tasks.taskLabel.output.fieldName}}. The task must execute before this reference can be resolved. This creates an implicit dependency.',
  examples: [
    '{{tasks.fetch-user.output.email}}',
    '{{tasks.validate.output.isValid}}',
    '{{tasks.api-call.output.data[0].id}}',
  ],
  keywords: ['task', 'output', 'reference', 'template', 'dependency'],
};

export const NESTED_PATHS: HelpTopic = {
  id: 'nested-paths',
  title: 'Nested Property Paths',
  content: 'Access nested properties using dot notation. You can traverse deeply nested objects and arrays.',
  examples: [
    '{{input.user.address.city}}',
    '{{tasks.api.output.data[0].name}}',
    '{{tasks.config.output.settings.database.host}}',
  ],
  keywords: ['nested', 'path', 'dot', 'notation', 'object'],
};

// ============================================================================
// EXECUTION - Testing & Execution Modes
// ============================================================================

export const EXECUTE_VS_TEST: HelpTopic = {
  id: 'execute-vs-test',
  title: 'Execute vs Test (Dry-Run)',
  content: 'Execute runs your workflow for real, calling actual APIs and performing actions. Test (dry-run) validates your workflow configuration, resolves templates, and shows the execution plan WITHOUT making any actual API calls or side effects.',
  keywords: ['execute', 'test', 'dry-run', 'validation'],
};

export const DRY_RUN_MODE: HelpTopic = {
  id: 'dry-run-mode',
  title: 'Dry-Run Mode',
  content: 'Dry-run mode validates your workflow without executing it. It checks for errors, resolves templates with sample data, and shows you the execution plan. Use this to test changes safely before deploying.',
  keywords: ['dry-run', 'test', 'validation', 'safe'],
};

export const EXECUTION_PLAN: HelpTopic = {
  id: 'execution-plan',
  title: 'Execution Plan',
  content: 'The execution plan shows the order in which tasks will run, which tasks can run in parallel, and estimated execution time based on historical data. This helps you understand and optimize your workflow.',
  keywords: ['plan', 'execution', 'order', 'parallel'],
};

export const PARALLEL_EXECUTION: HelpTopic = {
  id: 'parallel-execution',
  title: 'Parallel Execution',
  content: 'Tasks with no dependencies on each other run in parallel automatically, dramatically speeding up execution. The system detects independent tasks and executes them concurrently.',
  examples: [
    'fetch-user and fetch-products run in parallel',
  ],
  keywords: ['parallel', 'concurrent', 'performance', 'execution'],
};

export const TASK_DEPENDENCIES: HelpTopic = {
  id: 'task-dependencies',
  title: 'Task Dependencies',
  content: 'Dependencies define execution order. A task depends on another if it references that task\'s output. Dependencies are automatically detected from template references, or you can manually connect tasks in the visual editor.',
  examples: [
    'send-email depends on fetch-user (uses {{tasks.fetch-user.output.email}})',
  ],
  keywords: ['dependency', 'order', 'reference', 'execution'],
};

export const CIRCULAR_DEPENDENCIES: HelpTopic = {
  id: 'circular-dependencies',
  title: 'Circular Dependencies',
  content: 'Circular dependencies occur when tasks depend on each other in a loop (A → B → C → A). This is invalid and will be rejected by the validation system. Restructure your workflow to break the cycle.',
  examples: [
    'Invalid: task-a → task-b → task-a',
  ],
  keywords: ['circular', 'dependency', 'cycle', 'error', 'validation'],
};

// ============================================================================
// VALIDATION - Errors & Requirements
// ============================================================================

export const VALIDATION_ERRORS: HelpTopic = {
  id: 'validation-errors',
  title: 'Validation Errors',
  content: 'Validation errors occur when your workflow configuration is invalid. Common errors include: missing required fields, invalid template syntax, circular dependencies, type mismatches, or invalid task references.',
  keywords: ['validation', 'error', 'invalid', 'workflow'],
};

export const SCHEMA_VALIDATION: HelpTopic = {
  id: 'schema-validation',
  title: 'Schema Validation',
  content: 'All workflow inputs and task outputs are validated against JSON Schema definitions. This ensures type safety and catches errors before execution.',
  links: [
    { text: 'JSON Schema', url: 'https://json-schema.org/' },
  ],
  keywords: ['schema', 'validation', 'json', 'type'],
};

export const TYPE_COMPATIBILITY: HelpTopic = {
  id: 'type-compatibility',
  title: 'Type Compatibility',
  content: 'When passing data between tasks, the output type of the source task must be compatible with the input type of the target task. The system validates this at design time.',
  keywords: ['type', 'compatibility', 'validation', 'schema'],
};

export const MISSING_TASK_REFERENCE: HelpTopic = {
  id: 'missing-task-reference',
  title: 'Missing Task Reference',
  content: 'This error occurs when you reference a task output that doesn\'t exist or use a task label that hasn\'t been defined. Double-check your template expressions and task labels.',
  examples: [
    'Error: {{tasks.non-existent.output.value}}',
  ],
  keywords: ['error', 'missing', 'reference', 'task'],
};

// ============================================================================
// ADVANCED FEATURES - Output Mapping & Performance
// ============================================================================

export const OUTPUT_MAPPING: HelpTopic = {
  id: 'output-mapping',
  title: 'Output Mapping',
  content: 'Define which task outputs become workflow outputs. This allows you to expose specific data from your workflow execution to the caller. Use template syntax to map outputs.',
  examples: [
    'userId: {{tasks.create-user.output.id}}',
    'email: {{tasks.fetch-user.output.email}}',
  ],
  keywords: ['output', 'mapping', 'workflow', 'result'],
};

export const CONNECTION_HANDLES: HelpTopic = {
  id: 'connection-handles',
  title: 'Connection Handles',
  content: 'Use connection handles (small circles on task nodes) to visually create dependencies. Drag from the source handle to the target handle to connect tasks. This creates an explicit dependency relationship.',
  keywords: ['connection', 'handle', 'dependency', 'visual', 'graph'],
};

export const AUTO_LAYOUT: HelpTopic = {
  id: 'auto-layout',
  title: 'Auto-Layout',
  content: 'Automatically arrange tasks in a hierarchical layout based on dependencies. This makes complex workflows easier to read and understand.',
  keywords: ['layout', 'arrange', 'graph', 'visual'],
};

export const ZOOM_PAN: HelpTopic = {
  id: 'zoom-pan',
  title: 'Zoom & Pan',
  content: 'Use mouse wheel to zoom in/out, and drag the canvas to pan. This helps navigate large workflows. You can also use the minimap for quick navigation.',
  keywords: ['zoom', 'pan', 'navigation', 'canvas'],
};

export const MINIMAP: HelpTopic = {
  id: 'minimap',
  title: 'Minimap',
  content: 'The minimap shows an overview of your entire workflow. Click on areas of the minimap to quickly jump to that section of the canvas.',
  keywords: ['minimap', 'overview', 'navigation', 'canvas'],
};

export const YAML_PREVIEW: HelpTopic = {
  id: 'yaml-preview',
  title: 'YAML Preview',
  content: 'The YAML preview shows the raw Kubernetes resource definition for your workflow. This is the actual configuration that will be deployed. Changes in the visual editor update the YAML in real-time.',
  keywords: ['yaml', 'preview', 'kubernetes', 'configuration'],
};

export const LIVE_YAML_EDITING: HelpTopic = {
  id: 'live-yaml-editing',
  title: 'Live YAML Editing',
  content: 'Edit the YAML directly and see changes reflected in the visual graph in real-time. This is useful for advanced users who prefer working with YAML or need to make bulk changes.',
  keywords: ['yaml', 'edit', 'live', 'sync'],
};

export const EXECUTION_HISTORY: HelpTopic = {
  id: 'execution-history',
  title: 'Execution History',
  content: 'View past executions of this workflow, including status, duration, inputs, outputs, and errors. Use this to debug issues or analyze performance.',
  keywords: ['history', 'execution', 'logs', 'debug'],
};

export const EXECUTION_TRACE: HelpTopic = {
  id: 'execution-trace',
  title: 'Execution Trace',
  content: 'Detailed timeline showing when each task started, completed, and how long it took. Includes wait times, parallel execution detection, and template resolution logs.',
  keywords: ['trace', 'timeline', 'execution', 'debug'],
};

export const DURATION_TRENDS: HelpTopic = {
  id: 'duration-trends',
  title: 'Duration Trends',
  content: 'Visualize how workflow execution time changes over time. Identify performance regressions or improvements. Shows percentile breakdown (p50, p95, p99) for detailed analysis.',
  keywords: ['duration', 'trends', 'performance', 'analytics'],
};

export const TASK_USAGE_ANALYTICS: HelpTopic = {
  id: 'task-usage-analytics',
  title: 'Task Usage Analytics',
  content: 'See which tasks are most commonly used, their success rates, and average execution times. This helps identify reusable patterns and optimization opportunities.',
  keywords: ['usage', 'analytics', 'tasks', 'metrics'],
};

export const WORKFLOW_VERSIONING: HelpTopic = {
  id: 'workflow-versioning',
  title: 'Workflow Versioning',
  content: 'The system automatically tracks workflow changes using SHA256 hashing. View version history to see when changes were made and compare different versions.',
  keywords: ['versioning', 'history', 'changes', 'audit'],
};

export const WEBHOOK_INTEGRATION: HelpTopic = {
  id: 'webhook-integration',
  title: 'Webhook Integration',
  content: 'Execute workflows via webhook triggers. Useful for integrating with external systems like GitHub, Stripe, or custom event sources.',
  keywords: ['webhook', 'trigger', 'integration', 'event'],
};

export const API_ENDPOINTS: HelpTopic = {
  id: 'api-endpoints',
  title: 'API Endpoints',
  content: 'Every workflow automatically gets a REST API endpoint for execution. Use POST /api/v1/workflows/{name}/execute with JSON input to run your workflow programmatically.',
  examples: [
    'POST /api/v1/workflows/user-onboarding/execute',
  ],
  keywords: ['api', 'endpoint', 'rest', 'execution'],
};

export const KUBERNETES_DEPLOYMENT: HelpTopic = {
  id: 'kubernetes-deployment',
  title: 'Kubernetes Deployment',
  content: 'Workflows are deployed as Kubernetes Custom Resources. Use kubectl apply -f workflow.yaml to deploy, or use the UI\'s "Deploy" button which does this automatically.',
  examples: [
    'kubectl apply -f workflow.yaml',
  ],
  keywords: ['kubernetes', 'deploy', 'kubectl', 'crd'],
};

// ============================================================================
// REGISTRY - Centralized Access
// ============================================================================

/**
 * Centralized registry of all help topics.
 * Import individual topics for type safety and autocomplete.
 */
export const HELP_TOPICS = {
  // Workflow Builder
  WORKFLOW_NAME,
  WORKFLOW_DESCRIPTION,
  WORKFLOW_VERSION,
  WORKFLOW_NAMESPACE,

  // Task Configuration
  TASK_LABEL,
  TASK_REFERENCE,
  TASK_DESCRIPTION,
  TASK_TIMEOUT,
  TASK_RETRY_POLICY,
  TASK_INPUT,
  TASK_OUTPUT,
  INPUT_TYPES,
  REQUIRED_FIELDS,

  // Task Palette
  SEARCH_TASKS,
  CATEGORY_FILTER,
  TASK_DRAG_DROP,
  TASK_PREVIEW,

  // Template Syntax
  TEMPLATE_SYNTAX,
  WORKFLOW_INPUT_REFERENCE,
  TASK_OUTPUT_REFERENCE,
  NESTED_PATHS,

  // Execution
  EXECUTE_VS_TEST,
  DRY_RUN_MODE,
  EXECUTION_PLAN,
  PARALLEL_EXECUTION,
  TASK_DEPENDENCIES,
  CIRCULAR_DEPENDENCIES,

  // Validation
  VALIDATION_ERRORS,
  SCHEMA_VALIDATION,
  TYPE_COMPATIBILITY,
  MISSING_TASK_REFERENCE,

  // Advanced Features
  OUTPUT_MAPPING,
  CONNECTION_HANDLES,
  AUTO_LAYOUT,
  ZOOM_PAN,
  MINIMAP,
  YAML_PREVIEW,
  LIVE_YAML_EDITING,
  EXECUTION_HISTORY,
  EXECUTION_TRACE,
  DURATION_TRENDS,
  TASK_USAGE_ANALYTICS,
  WORKFLOW_VERSIONING,
  WEBHOOK_INTEGRATION,
  API_ENDPOINTS,
  KUBERNETES_DEPLOYMENT,
} as const;

/**
 * Get a help topic by ID (type-safe lookup)
 */
export function getHelpTopic(id: string): HelpTopic | undefined {
  return Object.values(HELP_TOPICS).find(topic => topic.id === id);
}

/**
 * Search help topics by keyword
 */
export function searchHelpTopics(query: string): HelpTopic[] {
  const lowerQuery = query.toLowerCase();
  return Object.values(HELP_TOPICS).filter(topic =>
    topic.title.toLowerCase().includes(lowerQuery) ||
    topic.content.toLowerCase().includes(lowerQuery) ||
    topic.keywords?.some(keyword => keyword.toLowerCase().includes(lowerQuery))
  );
}
