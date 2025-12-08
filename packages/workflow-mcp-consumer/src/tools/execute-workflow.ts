/**
 * execute_workflow MCP tool implementation
 * Stage 15.3: MCP Execution Tool
 */

import type { ConsumerGatewayClient } from '../services/consumer-gateway-client.js';
import type {
  ExecuteWorkflowInput,
  ExecuteWorkflowResult,
  ExecuteWorkflowSuccessResult,
  ExecuteWorkflowValidationError,
  ExecuteWorkflowExecutionError,
  DryRunResult,
  TaskExecutionResult
} from '../types.js';

/**
 * Calculate parallel groups from tasks based on dependencies
 * Uses Kahn's algorithm for topological sort with level tracking
 */
function calculateParallelGroups(
  tasks: Array<{ id: string; dependsOn?: string[] }>
): string[][] {
  // Build dependency graph
  const inDegree = new Map<string, number>();
  const dependents = new Map<string, string[]>();

  for (const task of tasks) {
    inDegree.set(task.id, (task.dependsOn ?? []).length);
    dependents.set(task.id, []);
  }

  for (const task of tasks) {
    for (const dep of task.dependsOn ?? []) {
      const deps = dependents.get(dep) ?? [];
      deps.push(task.id);
      dependents.set(dep, deps);
    }
  }

  // Process in levels (parallel groups)
  const groups: string[][] = [];
  const remaining = new Set(tasks.map(t => t.id));

  while (remaining.size > 0) {
    // Find all tasks with no unprocessed dependencies
    const currentLevel: string[] = [];
    for (const taskId of remaining) {
      if ((inDegree.get(taskId) ?? 0) === 0) {
        currentLevel.push(taskId);
      }
    }

    if (currentLevel.length === 0) {
      // Circular dependency - add remaining tasks
      groups.push([...remaining]);
      break;
    }

    groups.push(currentLevel);

    // Remove processed tasks and update in-degrees
    for (const taskId of currentLevel) {
      remaining.delete(taskId);
      for (const dependent of dependents.get(taskId) ?? []) {
        inDegree.set(dependent, (inDegree.get(dependent) ?? 1) - 1);
      }
    }
  }

  return groups;
}

/**
 * Execute a workflow or get execution plan (dry run)
 */
export async function executeWorkflow(
  client: ConsumerGatewayClient,
  input: ExecuteWorkflowInput
): Promise<ExecuteWorkflowResult | DryRunResult> {
  try {
    // For dry run, just return the execution plan
    if (input.dryRun) {
      const workflow = await client.getWorkflow(input.workflow);
      const stats = await client.getWorkflowStats(input.workflow);

      const tasks = (workflow.tasks ?? []).map(t => ({
        id: t.id,
        dependsOn: t.dependsOn
      }));

      const parallelGroups = calculateParallelGroups(tasks);

      return {
        success: true,
        executionPlan: {
          workflow: input.workflow,
          taskCount: tasks.length,
          parallelGroups,
          estimatedDurationMs: stats?.avgDurationMs
        }
      };
    }

    // First validate input
    const validation = await client.validateInput(input.workflow, input.input);

    if (!validation.valid) {
      const validationError: ExecuteWorkflowValidationError = {
        success: false,
        errorType: 'validation',
        missingInputs: validation.missingInputs.map(m => ({
          field: m.field,
          type: m.type,
          description: m.description
        })),
        invalidInputs: validation.invalidInputs.map(i => ({
          field: i.field,
          error: i.error,
          received: i.received
        })),
        suggestedPrompt: validation.suggestedPrompt
      };
      return validationError;
    }

    // Execute the workflow
    const result = await client.executeWorkflow(input.workflow, input.input);

    // Check if execution failed
    if (result.status === 'failed') {
      // Find the failed task
      const failedTask = result.taskResults.find(t => t.status === 'failed');

      // Collect partial output from completed tasks
      const partialOutput: Record<string, unknown> = {};
      for (const task of result.taskResults) {
        if (task.status === 'completed' && task.output) {
          Object.assign(partialOutput, task.output);
        }
      }

      // Also include any output from the execution result itself
      if (result.output && Object.keys(result.output).length > 0) {
        Object.assign(partialOutput, result.output);
      }

      const executionError: ExecuteWorkflowExecutionError = {
        success: false,
        errorType: 'execution',
        failedTask: failedTask?.taskId ?? 'unknown',
        errorMessage: failedTask?.error ?? 'Workflow execution failed',
        partialOutput: Object.keys(partialOutput).length > 0 ? partialOutput : undefined
      };
      return executionError;
    }

    // Map task results
    const taskResults: TaskExecutionResult[] = result.taskResults.map(tr => ({
      taskId: tr.taskId,
      status: tr.status as 'completed' | 'failed' | 'skipped',
      durationMs: tr.durationMs,
      output: tr.output,
      error: tr.error
    }));

    // Success case
    const successResult: ExecuteWorkflowSuccessResult = {
      success: true,
      executionId: result.executionId,
      output: result.output,
      durationMs: result.durationMs,
      taskResults
    };

    return successResult;
  } catch (error) {
    // Handle errors from client calls
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    const executionError: ExecuteWorkflowExecutionError = {
      success: false,
      errorType: 'execution',
      failedTask: 'unknown',
      errorMessage
    };
    return executionError;
  }
}
