/**
 * Explain Command
 * Show workflow execution plan with dependency graph
 */

import { loadWorkflow, WorkflowDefinition, WorkflowTask } from '../loaders.js';

/**
 * Execution group for parallel tasks
 */
export interface ExecutionGroup {
  groupIndex: number;
  tasks: string[];
  parallel: boolean;
  dependsOn: number[];
}

/**
 * Task explanation with dependencies
 */
export interface TaskExplanation {
  id: string;
  taskRef: string;
  dependsOn: string[];
  inputRefs: string[];
}

/**
 * Result of explain command
 */
export interface ExplainResult {
  success: boolean;
  error?: string;
  workflowName: string;
  namespace: string;
  description?: string;
  totalTasks: number;
  groups: ExecutionGroup[];
  tasks: TaskExplanation[];
  maxParallelWidth: number;
  executionDepth: number;
  criticalPath: string[];
}

/**
 * Options for explain command
 */
export interface ExplainOptions {
  tasksPath?: string;
}

/**
 * Extract template references from input object
 */
function extractTemplateRefs(obj: unknown): string[] {
  const refs: string[] = [];
  const pattern = /\{\{([^}]+)\}\}/g;

  function extract(value: unknown): void {
    if (typeof value === 'string') {
      let match;
      while ((match = pattern.exec(value)) !== null) {
        refs.push(match[1].trim());
      }
      pattern.lastIndex = 0;
    } else if (Array.isArray(value)) {
      value.forEach(extract);
    } else if (value && typeof value === 'object') {
      Object.values(value).forEach(extract);
    }
  }

  extract(obj);
  return refs;
}

/**
 * Build task explanations from workflow tasks
 */
function buildTaskExplanations(tasks: WorkflowTask[]): TaskExplanation[] {
  return tasks.map(task => ({
    id: task.id,
    taskRef: task.taskRef,
    dependsOn: task.dependsOn || [],
    inputRefs: extractTemplateRefs(task.input)
  }));
}

/**
 * Build execution groups using topological sort
 */
function buildExecutionGroups(tasks: WorkflowTask[]): ExecutionGroup[] {
  const groups: ExecutionGroup[] = [];
  const taskToGroup = new Map<string, number>();
  const remaining = new Set(tasks.map(t => t.id));
  const completed = new Set<string>();

  // Build dependency map
  const dependencyMap = new Map<string, string[]>();
  for (const task of tasks) {
    dependencyMap.set(task.id, task.dependsOn || []);
  }

  let groupIndex = 0;

  while (remaining.size > 0) {
    // Find all tasks with satisfied dependencies
    const ready: string[] = [];

    for (const taskId of remaining) {
      const deps = dependencyMap.get(taskId) || [];
      if (deps.every(d => completed.has(d))) {
        ready.push(taskId);
      }
    }

    if (ready.length === 0) {
      // Circular dependency - should not happen if workflow is valid
      break;
    }

    // Find which previous groups this group depends on
    const groupDeps = new Set<number>();
    for (const taskId of ready) {
      const deps = dependencyMap.get(taskId) || [];
      for (const dep of deps) {
        const depGroup = taskToGroup.get(dep);
        if (depGroup !== undefined) {
          groupDeps.add(depGroup);
        }
      }
    }

    // Create group
    const group: ExecutionGroup = {
      groupIndex,
      tasks: ready.sort(),
      parallel: ready.length > 1,
      dependsOn: Array.from(groupDeps).sort()
    };

    groups.push(group);

    // Mark tasks as completed
    for (const taskId of ready) {
      remaining.delete(taskId);
      completed.add(taskId);
      taskToGroup.set(taskId, groupIndex);
    }

    groupIndex++;
  }

  return groups;
}

/**
 * Calculate execution depth (longest path)
 */
function calculateExecutionDepth(tasks: WorkflowTask[]): number {
  const depthMap = new Map<string, number>();

  // Build dependency map
  const dependencyMap = new Map<string, string[]>();
  for (const task of tasks) {
    dependencyMap.set(task.id, task.dependsOn || []);
  }

  function getDepth(taskId: string): number {
    if (depthMap.has(taskId)) {
      return depthMap.get(taskId)!;
    }

    const deps = dependencyMap.get(taskId) || [];
    if (deps.length === 0) {
      depthMap.set(taskId, 1);
      return 1;
    }

    const maxDepDep = Math.max(...deps.map(getDepth));
    const depth = maxDepDep + 1;
    depthMap.set(taskId, depth);
    return depth;
  }

  if (tasks.length === 0) return 0;

  return Math.max(...tasks.map(t => getDepth(t.id)));
}

/**
 * Calculate max parallel width
 */
function calculateMaxParallelWidth(groups: ExecutionGroup[]): number {
  if (groups.length === 0) return 0;
  return Math.max(...groups.map(g => g.tasks.length));
}

/**
 * Find critical path (longest execution path)
 */
function findCriticalPath(tasks: WorkflowTask[]): string[] {
  if (tasks.length === 0) return [];

  // Build dependency map
  const dependencyMap = new Map<string, string[]>();
  const reverseDependencyMap = new Map<string, string[]>();

  for (const task of tasks) {
    dependencyMap.set(task.id, task.dependsOn || []);
    reverseDependencyMap.set(task.id, []);
  }

  for (const task of tasks) {
    const deps = task.dependsOn || [];
    for (const dep of deps) {
      const existing = reverseDependencyMap.get(dep) || [];
      existing.push(task.id);
      reverseDependencyMap.set(dep, existing);
    }
  }

  // Find longest path using DFS
  const depthMap = new Map<string, number>();
  const nextOnPath = new Map<string, string | null>();

  function calculatePathLength(taskId: string): number {
    if (depthMap.has(taskId)) {
      return depthMap.get(taskId)!;
    }

    const dependents = reverseDependencyMap.get(taskId) || [];
    if (dependents.length === 0) {
      depthMap.set(taskId, 1);
      nextOnPath.set(taskId, null);
      return 1;
    }

    let maxLength = 0;
    let maxNext: string | null = null;

    for (const dep of dependents) {
      const length = calculatePathLength(dep);
      if (length > maxLength) {
        maxLength = length;
        maxNext = dep;
      }
    }

    const totalLength = maxLength + 1;
    depthMap.set(taskId, totalLength);
    nextOnPath.set(taskId, maxNext);
    return totalLength;
  }

  // Calculate path lengths from all root nodes
  const roots = tasks.filter(t => (t.dependsOn || []).length === 0);
  let longestPathStart: string | null = null;
  let longestPathLength = 0;

  for (const root of roots) {
    const length = calculatePathLength(root.id);
    if (length > longestPathLength) {
      longestPathLength = length;
      longestPathStart = root.id;
    }
  }

  // Build path
  const path: string[] = [];
  let current = longestPathStart;

  while (current !== null) {
    path.push(current);
    current = nextOnPath.get(current) ?? null;
  }

  return path;
}

/**
 * Explain a workflow's execution plan
 */
export async function explainWorkflow(
  workflowPath: string,
  options: ExplainOptions = {}
): Promise<ExplainResult> {
  let workflow: WorkflowDefinition;

  try {
    workflow = await loadWorkflow(workflowPath);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      error: `Failed to load workflow: ${message}`,
      workflowName: '',
      namespace: '',
      totalTasks: 0,
      groups: [],
      tasks: [],
      maxParallelWidth: 0,
      executionDepth: 0,
      criticalPath: []
    };
  }

  const tasks = workflow.spec.tasks || [];
  const groups = buildExecutionGroups(tasks);
  const taskExplanations = buildTaskExplanations(tasks);
  const maxParallelWidth = calculateMaxParallelWidth(groups);
  const executionDepth = calculateExecutionDepth(tasks);
  const criticalPath = findCriticalPath(tasks);

  return {
    success: true,
    workflowName: workflow.metadata.name,
    namespace: workflow.metadata.namespace,
    description: workflow.spec.description,
    totalTasks: tasks.length,
    groups,
    tasks: taskExplanations,
    maxParallelWidth,
    executionDepth,
    criticalPath
  };
}
