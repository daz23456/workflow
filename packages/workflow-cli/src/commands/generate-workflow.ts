/**
 * Generate Workflow Command
 * Creates workflow YAML from compatible task chains
 */

import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'yaml';
import {
  findCompatibleChains,
  scaffoldWorkflow,
  type TaskDefinition,
  type TaskChain,
  type WorkflowScaffold
} from '../workflow-generator/index.js';

export interface GenerateWorkflowOptions {
  tasks: TaskDefinition[];
  workflowName: string;
  description?: string;
  outputPath?: string;
  autoChain?: boolean;
  write?: boolean;
}

export interface GenerateWorkflowResult {
  success: boolean;
  workflow?: WorkflowScaffold;
  chains?: TaskChain[];
  filePath?: string;
  error?: string;
}

/**
 * Generate a workflow from task definitions.
 */
export async function generateWorkflowCommand(
  options: GenerateWorkflowOptions
): Promise<GenerateWorkflowResult> {
  const { tasks, workflowName, description, outputPath, autoChain, write } = options;

  // Find compatible chains if autoChain is enabled
  let chains: TaskChain[] = [];
  if (autoChain) {
    chains = findCompatibleChains(tasks, 2);

    if (chains.length === 0) {
      return {
        success: false,
        error: 'No compatible task chains found. Tasks may not have compatible input/output schemas.'
      };
    }
  }

  // Use first chain or create from provided tasks
  const chain: TaskChain = chains.length > 0
    ? chains[0]
    : { tasks, mappings: [] };

  // Generate workflow scaffold
  const workflow = scaffoldWorkflow(chain, {
    workflowName,
    description
  });

  // Write to file if requested
  let filePath: string | undefined;
  if (write && outputPath) {
    const yamlContent = yaml.stringify(workflow);
    filePath = path.join(outputPath, `${workflowName}.yaml`);

    // Ensure directory exists
    if (!fs.existsSync(outputPath)) {
      fs.mkdirSync(outputPath, { recursive: true });
    }

    fs.writeFileSync(filePath, yamlContent, 'utf-8');
  }

  return {
    success: true,
    workflow,
    chains: chains.length > 0 ? chains : undefined,
    filePath
  };
}
