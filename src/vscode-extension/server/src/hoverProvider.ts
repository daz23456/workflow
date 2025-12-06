export interface HoverContext {
  text: string;
  position: { line: number; character: number };
  word: string;
}

export interface HoverResult {
  contents: string;
}

interface PropertyDocumentation {
  [key: string]: string;
}

// Top-level Kubernetes resource properties
const TOP_LEVEL_DOCS: PropertyDocumentation = {
  apiVersion: 'API version for the resource (e.g., workflow.io/v1)',
  kind: 'Resource type (Workflow or WorkflowTask)',
  metadata: 'Resource metadata including name, namespace, labels, and annotations',
  spec: 'Resource specification containing the main configuration',
};

// Workflow spec properties
const WORKFLOW_SPEC_DOCS: PropertyDocumentation = {
  description: 'Human-readable description of the workflow',
  input: 'Input schema definition for the workflow. Defines what parameters the workflow accepts.',
  tasks: 'Array of task steps to execute. Each task must have an id and either taskRef or workflowRef.',
  output: 'Output mapping from task results to workflow output',
  triggers: 'Trigger definitions (schedule, webhook, event-driven)',
};

// WorkflowTask spec properties
const TASK_SPEC_DOCS: PropertyDocumentation = {
  type: 'Task type (e.g., http)',
  http: 'HTTP task configuration including url, method, headers, and body',
  input: 'Input schema definition for the task',
  output: 'Output schema definition for the task result',
};

// Task step properties (inside tasks array)
const TASK_STEP_DOCS: PropertyDocumentation = {
  id: 'Unique identifier for this task step. Used to reference this task in dependsOn and template expressions.',
  taskRef: 'Reference to a WorkflowTask resource. The task will be executed with the provided input.',
  workflowRef: 'Reference to another Workflow resource for sub-workflow execution.',
  input: 'Input values for the task. Can use template expressions like {{input.field}} or {{tasks.taskId.output.field}}.',
  dependsOn: 'Array of task IDs this step depends on. Task will wait for all dependencies to complete before executing.',
  condition: 'Conditional expression for executing this task. Task is skipped if condition evaluates to false.',
  forEach: 'Loop configuration for iterating over arrays. Executes the task once for each item.',
  switch: 'Switch/case configuration for conditional branching.',
  timeout: 'Timeout duration for this task (e.g., "30s", "5m", "1h"). Task fails if timeout is exceeded.',
};

// Combine all documentation
const ALL_DOCS: PropertyDocumentation = {
  ...TOP_LEVEL_DOCS,
  ...WORKFLOW_SPEC_DOCS,
  ...TASK_SPEC_DOCS,
  ...TASK_STEP_DOCS,
};

export class HoverProvider {
  getHover(context: HoverContext): HoverResult | null {
    const { word } = context;

    // Look up documentation for the word
    const documentation = ALL_DOCS[word];

    if (documentation) {
      return {
        contents: documentation,
      };
    }

    return null;
  }
}
