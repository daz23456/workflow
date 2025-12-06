/**
 * Validate Command
 * Validates workflow YAML files locally
 */

import { loadWorkflow, loadTasksFromDirectory, WorkflowDefinition, TaskDefinition } from '../loaders.js';

/**
 * A single validation check result
 */
export interface ValidationCheck {
  name: string;
  passed: boolean;
  skipped: boolean;
  message?: string;
  errors?: string[];
}

/**
 * Complete validation result
 */
export interface ValidationResult {
  valid: boolean;
  workflowName: string;
  errors: string[];
  warnings: string[];
  checks: ValidationCheck[];
}

/**
 * Options for validateWorkflow
 */
export interface ValidateOptions {
  tasksPath?: string;
}

/**
 * Template expression regex pattern
 */
const TEMPLATE_PATTERN = /\{\{([^}]+)\}\}/g;

/**
 * Valid template prefixes
 */
const VALID_PREFIXES = ['input', 'tasks', 'env'];

/**
 * Extract all template expressions from an object
 */
function extractTemplateExpressions(obj: unknown): string[] {
  const expressions: string[] = [];

  function traverse(value: unknown): void {
    if (typeof value === 'string') {
      const matches = value.matchAll(TEMPLATE_PATTERN);
      for (const match of matches) {
        expressions.push(match[1].trim());
      }
    } else if (Array.isArray(value)) {
      for (const item of value) {
        traverse(item);
      }
    } else if (value && typeof value === 'object') {
      for (const key of Object.keys(value)) {
        traverse((value as Record<string, unknown>)[key]);
      }
    }
  }

  traverse(obj);
  return expressions;
}

/**
 * Validate template expression paths
 */
function validateTemplateExpression(expr: string, taskIds: string[]): string | null {
  const parts = expr.split('.');

  if (parts.length === 0) {
    return `Invalid template expression: empty expression`;
  }

  const prefix = parts[0];

  if (!VALID_PREFIXES.includes(prefix)) {
    return `Invalid template expression: "${expr}" - unknown prefix "${prefix}"`;
  }

  // Check tasks.X.output references
  if (prefix === 'tasks') {
    if (parts.length < 2) {
      return `Invalid template expression: "${expr}" - missing task ID`;
    }
    const taskId = parts[1];
    if (!taskIds.includes(taskId)) {
      return `Invalid template expression: "${expr}" - task "${taskId}" not found`;
    }
  }

  return null;
}

/**
 * Detect circular dependencies using DFS
 */
function detectCircularDependencies(workflow: WorkflowDefinition): string[] {
  const errors: string[] = [];
  const taskMap = new Map<string, string[]>();

  // Build dependency map
  for (const task of workflow.spec.tasks) {
    taskMap.set(task.id, task.dependsOn || []);
  }

  // DFS to detect cycles
  const visited = new Set<string>();
  const recursionStack = new Set<string>();

  function dfs(taskId: string, path: string[]): boolean {
    if (recursionStack.has(taskId)) {
      const cycle = [...path, taskId].join(' -> ');
      errors.push(`Circular dependency detected: ${cycle}`);
      return true;
    }

    if (visited.has(taskId)) {
      return false;
    }

    visited.add(taskId);
    recursionStack.add(taskId);

    const deps = taskMap.get(taskId) || [];
    for (const dep of deps) {
      if (dfs(dep, [...path, taskId])) {
        return true;
      }
    }

    recursionStack.delete(taskId);
    return false;
  }

  for (const taskId of taskMap.keys()) {
    if (!visited.has(taskId)) {
      dfs(taskId, []);
    }
  }

  return errors;
}

/**
 * Validate a workflow YAML file
 */
export async function validateWorkflow(
  workflowPath: string,
  options: ValidateOptions = {}
): Promise<ValidationResult> {
  const checks: ValidationCheck[] = [];
  const errors: string[] = [];
  const warnings: string[] = [];
  let workflowName = 'unknown';

  // Load workflow
  let workflow: WorkflowDefinition;
  try {
    workflow = await loadWorkflow(workflowPath);
    workflowName = workflow.metadata.name;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    errors.push(`Failed to load workflow: ${message}`);
    checks.push({
      name: 'schema',
      passed: false,
      skipped: false,
      message: `Failed to load workflow`,
      errors: [message]
    });
    return {
      valid: false,
      workflowName,
      errors,
      warnings,
      checks
    };
  }

  // Schema validation
  const schemaCheck = validateSchema(workflow);
  checks.push(schemaCheck);
  if (!schemaCheck.passed) {
    errors.push(...(schemaCheck.errors || []));
  }

  // Load tasks if path provided
  let tasks: TaskDefinition[] = [];
  const hasTasksPath = !!options.tasksPath;

  if (hasTasksPath) {
    try {
      tasks = await loadTasksFromDirectory(options.tasksPath!);
    } catch {
      // Tasks directory not accessible - not fatal
      tasks = [];
    }
  }

  // Task references validation
  const taskRefCheck = validateTaskReferences(workflow, tasks, hasTasksPath);
  checks.push(taskRefCheck);
  if (!taskRefCheck.passed && !taskRefCheck.skipped) {
    errors.push(...(taskRefCheck.errors || []));
  }

  // Template expressions validation
  const taskIds = workflow.spec.tasks.map(t => t.id);
  const templateCheck = validateTemplateExpressions(workflow, taskIds);
  checks.push(templateCheck);
  if (!templateCheck.passed) {
    errors.push(...(templateCheck.errors || []));
  }

  // Circular dependencies check
  const circularCheck = validateCircularDependencies(workflow);
  checks.push(circularCheck);
  if (!circularCheck.passed) {
    errors.push(...(circularCheck.errors || []));
  }

  // Duplicate task IDs check
  const duplicateCheck = validateDuplicateTaskIds(workflow);
  checks.push(duplicateCheck);
  if (!duplicateCheck.passed) {
    errors.push(...(duplicateCheck.errors || []));
  }

  // DependsOn references check
  const dependsOnCheck = validateDependsOnReferences(workflow);
  checks.push(dependsOnCheck);
  if (!dependsOnCheck.passed) {
    errors.push(...(dependsOnCheck.errors || []));
  }

  return {
    valid: errors.length === 0,
    workflowName,
    errors,
    warnings,
    checks
  };
}

/**
 * Validate workflow schema structure
 */
function validateSchema(workflow: WorkflowDefinition): ValidationCheck {
  const errors: string[] = [];

  if (!workflow.metadata.name || workflow.metadata.name.trim() === '') {
    errors.push('Workflow metadata.name is required');
  }

  if (!workflow.spec.tasks || workflow.spec.tasks.length === 0) {
    errors.push('Workflow must have at least one task');
  }

  return {
    name: 'schema',
    passed: errors.length === 0,
    skipped: false,
    message: errors.length === 0 ? 'Schema is valid' : 'Schema validation failed',
    errors: errors.length > 0 ? errors : undefined
  };
}

/**
 * Validate task references exist
 */
function validateTaskReferences(
  workflow: WorkflowDefinition,
  tasks: TaskDefinition[],
  hasTasksPath: boolean
): ValidationCheck {
  if (!hasTasksPath) {
    return {
      name: 'task-references',
      passed: false,
      skipped: true,
      message: 'No tasks path provided'
    };
  }

  const errors: string[] = [];
  const taskNames = new Set(tasks.map(t => t.metadata.name));

  for (const task of workflow.spec.tasks) {
    if (!taskNames.has(task.taskRef)) {
      errors.push(`Task reference "${task.taskRef}" not found in available tasks`);
    }
  }

  return {
    name: 'task-references',
    passed: errors.length === 0,
    skipped: false,
    message: errors.length === 0 ? 'All task references exist' : 'Missing task references',
    errors: errors.length > 0 ? errors : undefined
  };
}

/**
 * Validate template expressions
 */
function validateTemplateExpressions(
  workflow: WorkflowDefinition,
  taskIds: string[]
): ValidationCheck {
  const errors: string[] = [];

  // Check task inputs
  for (const task of workflow.spec.tasks) {
    if (task.input) {
      const expressions = extractTemplateExpressions(task.input);
      for (const expr of expressions) {
        const error = validateTemplateExpression(expr, taskIds);
        if (error) {
          errors.push(error);
        }
      }
    }
  }

  // Check workflow output
  if (workflow.spec.output) {
    const expressions = extractTemplateExpressions(workflow.spec.output);
    for (const expr of expressions) {
      const error = validateTemplateExpression(expr, taskIds);
      if (error) {
        errors.push(error);
      }
    }
  }

  return {
    name: 'template-expressions',
    passed: errors.length === 0,
    skipped: false,
    message: errors.length === 0 ? 'All template expressions are valid' : 'Invalid template expressions',
    errors: errors.length > 0 ? errors : undefined
  };
}

/**
 * Validate no circular dependencies
 */
function validateCircularDependencies(workflow: WorkflowDefinition): ValidationCheck {
  const errors = detectCircularDependencies(workflow);

  return {
    name: 'circular-dependencies',
    passed: errors.length === 0,
    skipped: false,
    message: errors.length === 0 ? 'No circular dependencies' : 'Circular dependencies detected',
    errors: errors.length > 0 ? errors : undefined
  };
}

/**
 * Validate no duplicate task IDs
 */
function validateDuplicateTaskIds(workflow: WorkflowDefinition): ValidationCheck {
  const errors: string[] = [];
  const seen = new Set<string>();

  for (const task of workflow.spec.tasks) {
    if (seen.has(task.id)) {
      errors.push(`Duplicate task ID "${task.id}"`);
    }
    seen.add(task.id);
  }

  return {
    name: 'duplicate-task-ids',
    passed: errors.length === 0,
    skipped: false,
    message: errors.length === 0 ? 'No duplicate task IDs' : 'Duplicate task IDs found',
    errors: errors.length > 0 ? errors : undefined
  };
}

/**
 * Validate dependsOn references point to valid task IDs
 */
function validateDependsOnReferences(workflow: WorkflowDefinition): ValidationCheck {
  const errors: string[] = [];
  const taskIds = new Set(workflow.spec.tasks.map(t => t.id));

  for (const task of workflow.spec.tasks) {
    if (task.dependsOn) {
      for (const dep of task.dependsOn) {
        if (!taskIds.has(dep)) {
          errors.push(`Task "${task.id}" depends on non-existent task "${dep}"`);
        }
      }
    }
  }

  return {
    name: 'depends-on-references',
    passed: errors.length === 0,
    skipped: false,
    message: errors.length === 0 ? 'All dependsOn references are valid' : 'Invalid dependsOn references',
    errors: errors.length > 0 ? errors : undefined
  };
}
