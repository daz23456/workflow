/**
 * Error types that can be detected in workflows
 */
export type ErrorType =
  | 'unknown_task_ref'
  | 'invalid_template'
  | 'circular_dependency'
  | 'schema_mismatch'
  | 'missing_dependency'
  | 'duplicate_task_id'
  | 'invalid_yaml'
  | 'missing_required_field';

/**
 * Generate a fix suggestion for a specific error type
 */
export const ERROR_FIXES: Record<ErrorType, (...args: string[]) => string> = {
  unknown_task_ref: (taskRef: string, availableTasks: string) =>
    `Task "${taskRef}" not found. Available tasks: ${availableTasks}. ` +
    `Please use one of the available task references.`,

  invalid_template: (template: string) =>
    `Invalid template syntax: "${template}". ` +
    `Use {{ input.field }} for workflow inputs or {{ tasks.taskId.output.field }} for task outputs. ` +
    `Make sure the task ID and field names are correct.`,

  circular_dependency: (cycle: string) =>
    `Circular dependency detected: ${cycle}. ` +
    `Remove one of the dependencies to break the cycle. ` +
    `Tasks cannot depend on themselves or create dependency loops.`,

  schema_mismatch: (field: string, expected: string, actual: string) =>
    `Field "${field}" expects type ${expected} but got ${actual}. ` +
    `Check the task's input schema and provide the correct type.`,

  missing_dependency: (taskId: string, referencedTask: string) =>
    `Task "${taskId}" references "${referencedTask}" in its input but doesn't list it in dependsOn. ` +
    `Add "${referencedTask}" to the dependsOn array.`,

  duplicate_task_id: (taskId: string) =>
    `Duplicate task ID "${taskId}". ` +
    `Each task must have a unique ID within the workflow.`,

  invalid_yaml: (error: string) =>
    `Invalid YAML syntax: ${error}. ` +
    `Check indentation and ensure all strings with special characters are quoted.`,

  missing_required_field: (field: string, location: string) =>
    `Missing required field "${field}" in ${location}. ` +
    `Add the required field to fix this error.`
};

/**
 * Parse error messages to detect error type
 */
export function detectErrorType(message: string): ErrorType | null {
  const lowerMessage = message.toLowerCase();

  if (lowerMessage.includes('unknown task') || lowerMessage.includes('task not found')) {
    return 'unknown_task_ref';
  }
  if (lowerMessage.includes('template') || lowerMessage.includes('{{')) {
    return 'invalid_template';
  }
  if (lowerMessage.includes('circular') || lowerMessage.includes('cycle')) {
    return 'circular_dependency';
  }
  if (lowerMessage.includes('type') && (lowerMessage.includes('expected') || lowerMessage.includes('mismatch'))) {
    return 'schema_mismatch';
  }
  if (lowerMessage.includes('depends') || lowerMessage.includes('dependency')) {
    return 'missing_dependency';
  }
  if (lowerMessage.includes('duplicate') && lowerMessage.includes('id')) {
    return 'duplicate_task_id';
  }
  if (lowerMessage.includes('yaml') || lowerMessage.includes('parse')) {
    return 'invalid_yaml';
  }
  if (lowerMessage.includes('required') && lowerMessage.includes('missing')) {
    return 'missing_required_field';
  }

  return null;
}

/**
 * Generate a suggestion for an error based on its message
 */
export function generateSuggestion(
  message: string,
  availableTasks?: string[]
): string | undefined {
  const errorType = detectErrorType(message);

  if (!errorType) {
    return undefined;
  }

  switch (errorType) {
    case 'unknown_task_ref': {
      const match = message.match(/["']([^"']+)["']/);
      const taskRef = match ? match[1] : 'unknown';
      const tasks = availableTasks?.join(', ') ?? 'check available tasks';
      return ERROR_FIXES.unknown_task_ref(taskRef, tasks);
    }
    case 'invalid_template': {
      const match = message.match(/{{[^}]*}}/);
      const template = match ? match[0] : 'template';
      return ERROR_FIXES.invalid_template(template);
    }
    case 'circular_dependency': {
      const match = message.match(/cycle[:\s]+([^\n]+)/i);
      const cycle = match ? match[1] : 'detected';
      return ERROR_FIXES.circular_dependency(cycle);
    }
    case 'invalid_yaml': {
      return ERROR_FIXES.invalid_yaml(message);
    }
    default:
      return `Error: ${message}. Please review your workflow definition.`;
  }
}
