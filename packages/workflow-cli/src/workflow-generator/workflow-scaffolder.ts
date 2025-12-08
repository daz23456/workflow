/**
 * Workflow Scaffolder
 * Generates workflow YAML from compatible task chains
 */

import type { JsonSchema } from '../types.js';
import type { TaskChain, TaskDefinition, FieldMapping } from './dependency-analyzer.js';

export interface TaskRef {
  name: string;
  taskRef: string;
  dependsOn: string[];
  input: Record<string, string>;
}

export interface ScaffoldOptions {
  workflowName: string;
  description?: string;
}

export interface WorkflowScaffold {
  apiVersion: string;
  kind: string;
  metadata: {
    name: string;
  };
  spec: {
    description?: string;
    input: JsonSchema;
    output: Record<string, string>;
    steps: TaskRef[];
  };
}

/**
 * Generate step name from task name and position
 */
function generateStepName(task: TaskDefinition, position: number): string {
  return `step-${position}-${task.name}`;
}

/**
 * Generate task references from a task chain.
 * Creates step names, dependencies, and input mappings.
 */
export function generateTaskRefs(chain: TaskChain): TaskRef[] {
  const refs: TaskRef[] = [];

  for (let i = 0; i < chain.tasks.length; i++) {
    const task = chain.tasks[i];
    const stepName = generateStepName(task, i + 1);
    const prevStepName = i > 0 ? generateStepName(chain.tasks[i - 1], i) : null;

    // Build input mappings from field mappings
    const input: Record<string, string> = {};
    if (i > 0 && chain.mappings[i - 1]) {
      for (const mapping of chain.mappings[i - 1]) {
        // Map from previous step's output to this step's input
        input[mapping.to] = `$.steps.${prevStepName}.outputs.${mapping.from}`;
      }
    }

    refs.push({
      name: stepName,
      taskRef: task.name,
      dependsOn: prevStepName ? [prevStepName] : [],
      input
    });
  }

  return refs;
}

/**
 * Scaffold a complete workflow from a task chain.
 * Generates the full workflow YAML structure.
 */
export function scaffoldWorkflow(
  chain: TaskChain,
  options: ScaffoldOptions
): WorkflowScaffold {
  const steps = generateTaskRefs(chain);
  const firstTask = chain.tasks[0];
  const lastTask = chain.tasks[chain.tasks.length - 1];
  const lastStepName = generateStepName(lastTask, chain.tasks.length);

  // Generate output mappings from last task's output schema
  const output: Record<string, string> = {};
  const outputProps = lastTask.outputSchema.properties || {};
  for (const field of Object.keys(outputProps)) {
    output[field] = `$.steps.${lastStepName}.outputs.${field}`;
  }

  return {
    apiVersion: 'workflow.io/v1',
    kind: 'Workflow',
    metadata: {
      name: options.workflowName
    },
    spec: {
      description: options.description,
      input: firstTask.inputSchema,
      output,
      steps
    }
  };
}
