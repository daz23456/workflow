/**
 * Run Command
 * Execute a workflow locally (mock) or remotely (via Gateway)
 */

import { loadWorkflow, loadTasksFromDirectory, WorkflowDefinition, TaskDefinition } from '../loaders.js';
import { GatewayClient } from '../services/gateway-client.js';
import { MockExecutor, MockTaskResult } from '../services/mock-executor.js';

/**
 * Run command options
 */
export interface RunOptions {
  input?: Record<string, unknown>;
  inputJson?: string;
  remote?: boolean;
  gatewayUrl?: string;
  namespace?: string;
  tasksPath?: string;
  verbose?: boolean;
}

/**
 * Run command result
 */
export interface RunResult {
  success: boolean;
  mode: 'mock' | 'remote';
  workflowName: string;
  executionId?: string;
  status?: 'completed' | 'failed' | 'running';
  output?: Record<string, unknown>;
  duration?: number;
  error?: string;
  failedTask?: string;
  taskResults?: MockTaskResult[];
}

/**
 * Execute a workflow
 */
export async function runWorkflow(
  workflowPath: string,
  options: RunOptions
): Promise<RunResult> {
  try {
    // Parse JSON input if provided
    let input: Record<string, unknown> = options.input || {};
    if (options.inputJson) {
      try {
        input = JSON.parse(options.inputJson);
      } catch {
        return {
          success: false,
          mode: options.remote ? 'remote' : 'mock',
          workflowName: 'unknown',
          error: 'Invalid JSON input'
        };
      }
    }

    // Load workflow
    const workflow = await loadWorkflow(workflowPath);
    const workflowName = workflow.metadata.name;

    if (options.remote) {
      // Remote mode - execute via Gateway
      return await executeRemote(workflow, input, options);
    } else {
      // Mock mode - execute locally
      return await executeMock(workflow, input, options);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      mode: options.remote ? 'remote' : 'mock',
      workflowName: 'unknown',
      error: errorMessage
    };
  }
}

/**
 * Execute workflow via Gateway API
 */
async function executeRemote(
  workflow: WorkflowDefinition,
  input: Record<string, unknown>,
  options: RunOptions
): Promise<RunResult> {
  const client = new GatewayClient(
    options.gatewayUrl || 'http://localhost:5001',
    options.namespace
  );

  try {
    const result = await client.executeWorkflow(
      workflow.metadata.name,
      input,
      options.namespace
    );

    return {
      success: result.status === 'completed',
      mode: 'remote',
      workflowName: workflow.metadata.name,
      executionId: result.executionId,
      status: result.status,
      output: result.output,
      duration: result.duration,
      error: result.error,
      failedTask: result.failedTask
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      mode: 'remote',
      workflowName: workflow.metadata.name,
      error: errorMessage
    };
  }
}

/**
 * Execute workflow locally with mock responses
 */
async function executeMock(
  workflow: WorkflowDefinition,
  input: Record<string, unknown>,
  options: RunOptions
): Promise<RunResult> {
  // Load tasks
  const tasks = options.tasksPath
    ? await loadTasksFromDirectory(options.tasksPath)
    : [];

  const executor = new MockExecutor();

  // Set default response for all tasks
  executor.setDefaultResponse({ status: 200, body: {} });

  const result = await executor.execute(workflow, tasks, input);

  const runResult: RunResult = {
    success: result.status === 'completed',
    mode: 'mock',
    workflowName: workflow.metadata.name,
    executionId: result.executionId,
    status: result.status,
    output: result.output,
    duration: result.duration
  };

  if (result.status === 'failed') {
    runResult.error = result.error;
    runResult.failedTask = result.failedTask;
  }

  if (options.verbose) {
    runResult.taskResults = result.taskResults;
  }

  return runResult;
}
