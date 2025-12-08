/**
 * MCP Prompts for workflow discovery and execution
 * Stage 15.4: MCP Resources & Prompts
 */

import type { ConsumerGatewayClient } from '../services/consumer-gateway-client.js';

/**
 * Prompt message
 */
export interface PromptMessage {
  role: 'user' | 'assistant';
  content: string;
}

/**
 * Prompt result
 */
export interface PromptResult {
  description: string;
  messages: PromptMessage[];
}

/**
 * Input for discover-workflow prompt
 */
export interface DiscoverWorkflowInput {
  intent: string;
}

/**
 * Input for execute-workflow prompt
 */
export interface ExecuteWorkflowInput {
  workflow: string;
  partialInput?: Record<string, unknown>;
}

/**
 * Input for troubleshoot-execution prompt
 */
export interface TroubleshootExecutionInput {
  executionId: string;
  workflowName: string;
  error: string;
}

/**
 * Generate discovery context with available workflows
 */
export async function getDiscoverWorkflowPrompt(
  client: ConsumerGatewayClient,
  input: DiscoverWorkflowInput
): Promise<PromptResult> {
  const workflows = await client.listWorkflows();

  // Build workflow summaries
  const workflowList = workflows.map(wf => {
    const inputFields = wf.input
      ? Object.entries(wf.input)
          .map(([name, def]) => `${name} (${def.type}${def.required ? ', required' : ''})`)
          .join(', ')
      : 'no input';

    return `- **${wf.name}**: ${wf.description ?? 'No description'}\n  Input: ${inputFields}`;
  }).join('\n');

  const systemContent = `You are helping the user find the right workflow for their task.

## Available Workflows

${workflowList}

## User Intent
The user wants to: ${input.intent}

## Instructions
1. Analyze the user's intent
2. Recommend the most suitable workflow(s)
3. Explain why each recommendation matches their needs
4. If needed, ask clarifying questions to narrow down options`;

  return {
    description: 'Help the user discover the right workflow for their task',
    messages: [
      {
        role: 'user',
        content: systemContent
      }
    ]
  };
}

/**
 * Generate execution context for a workflow
 */
export async function getExecuteWorkflowPrompt(
  client: ConsumerGatewayClient,
  input: ExecuteWorkflowInput
): Promise<PromptResult> {
  const workflow = await client.getWorkflow(input.workflow);

  // Build input schema description
  const inputFields = workflow.input
    ? Object.entries(workflow.input)
        .map(([name, def]) => {
          let fieldDesc = `- **${name}** (${def.type})`;
          if (def.required) fieldDesc += ' - required';
          if (def.description) fieldDesc += `: ${def.description}`;
          if (def.default !== undefined) fieldDesc += ` (default: ${JSON.stringify(def.default)})`;
          return fieldDesc;
        })
        .join('\n')
    : 'No input required';

  // Build examples
  const examples = (workflow.examples ?? [])
    .map(ex => `### ${ex.name}\n\`\`\`json\n${JSON.stringify(ex.input, null, 2)}\n\`\`\``)
    .join('\n\n');

  let systemContent = `You are helping the user execute the "${workflow.name}" workflow.

## Workflow Description
${workflow.description ?? 'No description available'}

## Input Schema
${inputFields}`;

  if (examples) {
    systemContent += `\n\n## Examples\n${examples}`;
  }

  if (input.partialInput && Object.keys(input.partialInput).length > 0) {
    systemContent += `\n\n## Partial Input Provided\n\`\`\`json\n${JSON.stringify(input.partialInput, null, 2)}\n\`\`\``;
  }

  systemContent += `\n\n## Instructions
1. Help the user provide all required inputs
2. Validate inputs match expected types
3. When ready, call execute_workflow with the complete input`;

  return {
    description: 'Guide the user through executing a workflow',
    messages: [
      {
        role: 'user',
        content: systemContent
      }
    ]
  };
}

/**
 * Generate troubleshooting context for a failed execution
 */
export async function getTroubleshootExecutionPrompt(
  client: ConsumerGatewayClient,
  input: TroubleshootExecutionInput
): Promise<PromptResult> {
  const workflow = await client.getWorkflow(input.workflowName);

  // Build task list
  const taskList = (workflow.tasks ?? [])
    .map(t => `- **${t.id}** (${t.taskRef})${t.description ? `: ${t.description}` : ''}`)
    .join('\n');

  const systemContent = `You are helping the user troubleshoot a failed workflow execution.

## Execution Details
- **Execution ID:** ${input.executionId}
- **Workflow:** ${input.workflowName}
- **Error:** ${input.error}

## Workflow Structure
${workflow.description ?? 'No description'}

### Tasks
${taskList || 'No tasks defined'}

## Instructions
1. Analyze the error message
2. Identify potential causes
3. Suggest specific remediation steps
4. If the error is transient, suggest retry
5. If input-related, help the user correct their input`;

  return {
    description: 'Help the user troubleshoot a failed workflow execution',
    messages: [
      {
        role: 'user',
        content: systemContent
      }
    ]
  };
}
