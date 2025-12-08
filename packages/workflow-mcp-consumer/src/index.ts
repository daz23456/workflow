#!/usr/bin/env node

/**
 * MCP Server for External Workflow Consumption
 * Stage 15: Enable external chatbots and AI assistants to discover and execute workflows
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

import { HttpConsumerGatewayClient } from './services/consumer-gateway-client.js';
import { listWorkflows } from './tools/list-workflows.js';
import { searchWorkflows } from './tools/search-workflows.js';
import { getWorkflowDetails } from './tools/get-workflow-details.js';
import { executeWorkflow } from './tools/execute-workflow.js';
import { getWorkflowResource, getWorkflowSchemaResource } from './resources/workflow-resource.js';
import { getDiscoverWorkflowPrompt, getExecuteWorkflowPrompt, getTroubleshootExecutionPrompt } from './prompts/workflow-prompts.js';

// Stage 32.3: Label tools
import { listLabels } from './tools/list-labels.js';
import { listTasks } from './tools/list-tasks.js';
import { manageLabels } from './tools/manage-labels.js';
import { suggestLabels } from './tools/suggest-labels.js';

// Server version
const VERSION = '0.1.0';

// Create the MCP server
const server = new McpServer(
  {
    name: 'workflow-mcp-consumer',
    version: VERSION
  },
  {
    capabilities: {
      tools: {},
      resources: {},
      prompts: {}
    },
    instructions: `This MCP server enables external chatbots and AI assistants to discover and execute workflows.

Available tools:
- list_workflows: List all available workflows with metadata (categories, tags, input summary)
- search_workflows: Search workflows by natural language query with auto-execute support
- get_workflow_details: Get full workflow details including schema, examples, and tasks
- execute_workflow: Execute a workflow with input, supports dry-run mode

Available resources:
- workflow://{name}: Get full workflow details as a resource
- workflow://{name}/schema: Get JSON Schema for workflow input

Available prompts:
- discover-workflow: Help user find the right workflow for their task
- execute-workflow: Guide user through workflow execution with input validation
- troubleshoot-execution: Help diagnose and fix failed executions

Use these tools, resources, and prompts to help users discover and execute workflows through natural conversation.`
  }
);

// Create gateway client
const gatewayClient = new HttpConsumerGatewayClient();

// Register list_workflows tool
server.registerTool(
  'list_workflows',
  {
    title: 'List Workflows',
    description: 'List all available workflows with metadata. Filter by category, tags, or exclude tags.',
    inputSchema: z.object({
      category: z.string().optional().describe('Filter by single category (e.g., "orders", "users")'),
      categories: z.array(z.string()).optional().describe('Filter by multiple categories (OR logic - must have at least one)'),
      tags: z.array(z.string()).optional().describe('Filter by tags (AND logic - must have all)'),
      anyTags: z.array(z.string()).optional().describe('Filter by tags (OR logic - must have at least one)'),
      excludeTags: z.array(z.string()).optional().describe('Exclude workflows with these tags'),
      includeStats: z.boolean().optional().describe('Include execution statistics')
    })
  },
  async (params) => {
    try {
      const result = await listWorkflows(gatewayClient, params);
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(result, null, 2)
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text' as const,
            text: `Error listing workflows: ${error instanceof Error ? error.message : 'Unknown error'}`
          }
        ],
        isError: true
      };
    }
  }
);

// Register search_workflows tool
server.registerTool(
  'search_workflows',
  {
    title: 'Search Workflows',
    description: 'Search workflows by natural language query. Use autoExecute mode for hands-free execution.',
    inputSchema: z.object({
      query: z.string().describe('Natural language search query (e.g., "process an order", "get user profile")'),
      autoExecute: z.boolean().optional().describe('Enable auto-execute mode - returns best match with canAutoExecute flag'),
      context: z.record(z.string(), z.unknown()).optional().describe('Context from conversation for input extraction')
    })
  },
  async (params) => {
    try {
      const result = await searchWorkflows(gatewayClient, params);

      let output = `## Search Results for "${params.query}"\n\n`;

      if (result.matches.length === 0) {
        output += 'No matching workflows found.\n';
      } else {
        output += `Found ${result.matches.length} matching workflow(s):\n\n`;

        for (const match of result.matches) {
          const confidence = (match.confidence * 100).toFixed(0);
          output += `### ${match.workflow} (${confidence}% confidence)\n`;
          output += `- Reason: ${match.matchReason}\n`;
          if (match.requiredInputs.length > 0) {
            output += `- Required inputs: ${match.requiredInputs.join(', ')}\n`;
          }
          output += '\n';
        }

        if (result.bestMatch) {
          output += '---\n';
          output += '## Best Match for Auto-Execute\n\n';
          output += `**Workflow:** ${result.bestMatch.workflow}\n`;
          output += `**Can Auto-Execute:** ${result.bestMatch.canAutoExecute ? 'Yes' : 'No'}\n`;

          if (Object.keys(result.bestMatch.extractedInputs).length > 0) {
            output += `**Extracted Inputs:** ${JSON.stringify(result.bestMatch.extractedInputs)}\n`;
          }

          if (result.bestMatch.missingInputs.length > 0) {
            output += `**Missing Inputs:** ${result.bestMatch.missingInputs.join(', ')}\n`;
          }
        }
      }

      return {
        content: [{ type: 'text' as const, text: output }]
      };
    } catch (error) {
      return {
        content: [{
          type: 'text' as const,
          text: `Error searching workflows: ${error instanceof Error ? error.message : 'Unknown error'}`
        }],
        isError: true
      };
    }
  }
);

// Register get_workflow_details tool
server.registerTool(
  'get_workflow_details',
  {
    title: 'Get Workflow Details',
    description: 'Get full details for a specific workflow including input schema, examples, and task list.',
    inputSchema: z.object({
      name: z.string().describe('The workflow name to get details for')
    })
  },
  async (params) => {
    try {
      const details = await getWorkflowDetails(gatewayClient, params);

      let output = `# ${details.name}\n\n`;
      output += `${details.description}\n\n`;

      if (details.categories && details.categories.length > 0) {
        output += `**Categories:** ${details.categories.join(', ')}\n`;
      }
      if (details.tags && details.tags.length > 0) {
        output += `**Tags:** ${details.tags.join(', ')}\n`;
      }
      if (details.estimatedDurationMs) {
        output += `**Estimated Duration:** ${details.estimatedDurationMs}ms\n`;
      }
      output += '\n';

      // Input Schema
      output += '## Input Schema\n\n';
      if (Object.keys(details.inputSchema).length === 0) {
        output += 'No input required.\n\n';
      } else {
        for (const [name, param] of Object.entries(details.inputSchema)) {
          const required = param.required ? '(required)' : '(optional)';
          output += `- **${name}** ${required}: ${param.type}`;
          if (param.description) {
            output += ` - ${param.description}`;
          }
          output += '\n';
        }
        output += '\n';
      }

      // Examples
      if (details.examples.length > 0) {
        output += '## Examples\n\n';
        for (const example of details.examples) {
          output += `### ${example.name}\n`;
          if (example.description) {
            output += `${example.description}\n\n`;
          }
          output += '**Input:**\n```json\n' + JSON.stringify(example.input, null, 2) + '\n```\n\n';
          if (example.expectedOutput) {
            output += '**Expected Output:**\n```json\n' + JSON.stringify(example.expectedOutput, null, 2) + '\n```\n\n';
          }
        }
      }

      // Tasks
      if (details.tasks.length > 0) {
        output += '## Tasks\n\n';
        for (const task of details.tasks) {
          output += `- **${task.id}**`;
          if (task.description) {
            output += `: ${task.description}`;
          }
          if (task.dependencies.length > 0) {
            output += ` (depends on: ${task.dependencies.join(', ')})`;
          }
          output += '\n';
        }
      }

      return {
        content: [{ type: 'text' as const, text: output }]
      };
    } catch (error) {
      return {
        content: [{
          type: 'text' as const,
          text: `Error getting workflow details: ${error instanceof Error ? error.message : 'Unknown error'}`
        }],
        isError: true
      };
    }
  }
);

// Register execute_workflow tool
server.registerTool(
  'execute_workflow',
  {
    title: 'Execute Workflow',
    description: 'Execute a workflow with input. Use dryRun mode to preview execution plan without running.',
    inputSchema: z.object({
      workflow: z.string().describe('The workflow name to execute'),
      input: z.record(z.string(), z.unknown()).describe('Input data for the workflow'),
      dryRun: z.boolean().optional().describe('Preview execution plan without executing')
    })
  },
  async (params) => {
    try {
      const result = await executeWorkflow(gatewayClient, params);

      let output = '';

      if (result.success) {
        if ('executionPlan' in result) {
          // Dry run result
          output = `## Execution Plan for "${result.executionPlan.workflow}"\n\n`;
          output += `- **Tasks:** ${result.executionPlan.taskCount}\n`;
          if (result.executionPlan.estimatedDurationMs) {
            output += `- **Estimated Duration:** ${result.executionPlan.estimatedDurationMs}ms\n`;
          }
          output += '\n### Parallel Groups\n\n';
          result.executionPlan.parallelGroups.forEach((group, i) => {
            output += `**Group ${i + 1}:** ${group.join(', ')}\n`;
          });
        } else {
          // Success result
          output = `## Execution Completed\n\n`;
          output += `- **Execution ID:** ${result.executionId}\n`;
          output += `- **Duration:** ${result.durationMs}ms\n\n`;
          output += `### Output\n\`\`\`json\n${JSON.stringify(result.output, null, 2)}\n\`\`\`\n\n`;
          output += `### Task Results\n`;
          for (const task of result.taskResults) {
            output += `- **${task.taskId}:** ${task.status} (${task.durationMs}ms)\n`;
          }
        }
      } else {
        if (result.errorType === 'validation') {
          output = `## Validation Error\n\n`;
          if (result.missingInputs.length > 0) {
            output += `### Missing Inputs\n`;
            for (const m of result.missingInputs) {
              output += `- **${m.field}** (${m.type})`;
              if (m.description) output += `: ${m.description}`;
              output += '\n';
            }
          }
          if (result.invalidInputs.length > 0) {
            output += `### Invalid Inputs\n`;
            for (const i of result.invalidInputs) {
              output += `- **${i.field}:** ${i.error}`;
              if (i.received !== undefined) output += ` (received: ${JSON.stringify(i.received)})`;
              output += '\n';
            }
          }
          if (result.suggestedPrompt) {
            output += `\n### Suggested Action\n${result.suggestedPrompt}\n`;
          }
        } else {
          output = `## Execution Error\n\n`;
          output += `- **Failed Task:** ${result.failedTask}\n`;
          output += `- **Error:** ${result.errorMessage}\n`;
          if (result.partialOutput) {
            output += `\n### Partial Output\n\`\`\`json\n${JSON.stringify(result.partialOutput, null, 2)}\n\`\`\`\n`;
          }
        }
      }

      return {
        content: [{ type: 'text' as const, text: output }],
        isError: !result.success
      };
    } catch (error) {
      return {
        content: [{
          type: 'text' as const,
          text: `Error executing workflow: ${error instanceof Error ? error.message : 'Unknown error'}`
        }],
        isError: true
      };
    }
  }
);

// ============================================
// Stage 32.3: Label Management Tools
// ============================================

// Register list_labels tool
server.registerTool(
  'list_labels',
  {
    title: 'List Labels',
    description: 'List all available labels (tags and categories) with usage counts.',
    inputSchema: z.object({
      entityType: z.enum(['workflow', 'task']).optional().describe('Filter labels by entity type'),
      sortBy: z.enum(['usage', 'name']).optional().describe('Sort order (default: usage)')
    })
  },
  async (params) => {
    try {
      const result = await listLabels(gatewayClient, params);
      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify(result, null, 2)
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: 'text' as const,
          text: `Error listing labels: ${error instanceof Error ? error.message : 'Unknown error'}`
        }],
        isError: true
      };
    }
  }
);

// Register list_tasks tool
server.registerTool(
  'list_tasks',
  {
    title: 'List Tasks',
    description: 'List all available task definitions. Filter by tags or category.',
    inputSchema: z.object({
      tags: z.array(z.string()).optional().describe('Filter by tags (AND logic - must have all)'),
      anyTags: z.array(z.string()).optional().describe('Filter by tags (OR logic - must have at least one)'),
      excludeTags: z.array(z.string()).optional().describe('Exclude tasks with these tags'),
      category: z.string().optional().describe('Filter by category')
    })
  },
  async (params) => {
    try {
      const result = await listTasks(gatewayClient, params);
      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify(result, null, 2)
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: 'text' as const,
          text: `Error listing tasks: ${error instanceof Error ? error.message : 'Unknown error'}`
        }],
        isError: true
      };
    }
  }
);

// Register manage_labels tool
server.registerTool(
  'manage_labels',
  {
    title: 'Manage Labels',
    description: 'Add or remove labels (tags and categories) on workflows or tasks. Supports dry-run mode.',
    inputSchema: z.object({
      entityType: z.enum(['workflow', 'task']).describe('Type of entity to update'),
      entityNames: z.array(z.string()).describe('Names of entities to update'),
      addTags: z.array(z.string()).optional().describe('Tags to add'),
      removeTags: z.array(z.string()).optional().describe('Tags to remove'),
      addCategories: z.array(z.string()).optional().describe('Categories to add'),
      removeCategories: z.array(z.string()).optional().describe('Categories to remove'),
      dryRun: z.boolean().optional().describe('Preview changes without applying')
    })
  },
  async (params) => {
    try {
      const result = await manageLabels(gatewayClient, params);
      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify(result, null, 2)
        }],
        isError: !result.success
      };
    } catch (error) {
      return {
        content: [{
          type: 'text' as const,
          text: `Error managing labels: ${error instanceof Error ? error.message : 'Unknown error'}`
        }],
        isError: true
      };
    }
  }
);

// Register suggest_labels tool
server.registerTool(
  'suggest_labels',
  {
    title: 'Suggest Labels',
    description: 'Get AI-powered label suggestions for a workflow or task based on name and metadata analysis.',
    inputSchema: z.object({
      entityType: z.enum(['workflow', 'task']).describe('Type of entity'),
      entityName: z.string().describe('Name of the entity to analyze')
    })
  },
  async (params) => {
    try {
      const result = await suggestLabels(gatewayClient, params);

      let output = `## Label Suggestions for "${params.entityName}"\n\n`;

      if (result.suggestions.length === 0) {
        output += 'No label suggestions available.\n';
      } else {
        output += `Found ${result.suggestions.length} suggestion(s):\n\n`;
        for (const suggestion of result.suggestions) {
          const confidence = (suggestion.confidence * 100).toFixed(0);
          output += `- **${suggestion.label}** (${suggestion.type}, ${confidence}% confidence)\n`;
          output += `  ${suggestion.reason}\n\n`;
        }
      }

      return {
        content: [{ type: 'text' as const, text: output }]
      };
    } catch (error) {
      return {
        content: [{
          type: 'text' as const,
          text: `Error suggesting labels: ${error instanceof Error ? error.message : 'Unknown error'}`
        }],
        isError: true
      };
    }
  }
);

// Register resources
server.resource(
  'workflow',
  'workflow://{name}',
  async (uri) => {
    try {
      // Parse workflow name from URI: workflow://name
      const workflowName = uri.pathname.replace(/^\/+/, '') || uri.host;
      const resource = await getWorkflowResource(gatewayClient, workflowName);
      return {
        contents: [{
          uri: resource.uri,
          mimeType: resource.mimeType,
          text: resource.text
        }]
      };
    } catch (error) {
      throw new Error(`Failed to get workflow resource: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
);

server.resource(
  'workflow-schema',
  'workflow://{name}/schema',
  async (uri) => {
    try {
      // Parse workflow name from URI: workflow://name/schema
      const pathParts = uri.pathname.split('/').filter(Boolean);
      const workflowName = uri.host || pathParts[0];
      const resource = await getWorkflowSchemaResource(gatewayClient, workflowName);
      return {
        contents: [{
          uri: resource.uri,
          mimeType: resource.mimeType,
          text: resource.text
        }]
      };
    } catch (error) {
      throw new Error(`Failed to get workflow schema resource: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
);

// Register prompts
server.prompt(
  'discover-workflow',
  {
    intent: z.string().describe('What the user wants to accomplish')
  },
  async (params) => {
    const result = await getDiscoverWorkflowPrompt(gatewayClient, { intent: params.intent });
    return {
      description: result.description,
      messages: result.messages.map(m => ({
        role: m.role,
        content: { type: 'text' as const, text: m.content }
      }))
    };
  }
);

server.prompt(
  'execute-workflow',
  {
    workflow: z.string().describe('The workflow name to execute'),
    partialInput: z.string().optional().describe('JSON string of partial input already collected')
  },
  async (params) => {
    const partialInput = params.partialInput ? JSON.parse(params.partialInput) : undefined;
    const result = await getExecuteWorkflowPrompt(gatewayClient, {
      workflow: params.workflow,
      partialInput
    });
    return {
      description: result.description,
      messages: result.messages.map(m => ({
        role: m.role,
        content: { type: 'text' as const, text: m.content }
      }))
    };
  }
);

server.prompt(
  'troubleshoot-execution',
  {
    executionId: z.string().describe('The execution ID that failed'),
    workflowName: z.string().describe('The workflow name'),
    error: z.string().describe('The error message')
  },
  async (params) => {
    const result = await getTroubleshootExecutionPrompt(gatewayClient, {
      executionId: params.executionId,
      workflowName: params.workflowName,
      error: params.error
    });
    return {
      description: result.description,
      messages: result.messages.map(m => ({
        role: m.role,
        content: { type: 'text' as const, text: m.content }
      }))
    };
  }
);

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Workflow MCP Consumer Server started');
}

main().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
