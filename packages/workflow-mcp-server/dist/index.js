#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { GatewayClient } from './services/gateway-client.js';
import { listTasks } from './tools/list-tasks.js';
import { generateWorkflow } from './tools/generate-workflow.js';
import { validateWorkflow } from './tools/validate-workflow.js';
import { dryRunWorkflow } from './tools/dry-run-workflow.js';
import { executeWorkflow } from './tools/execute-workflow.js';
// Server version
const VERSION = '0.1.0';
// Create the MCP server
const server = new McpServer({
    name: 'workflow-mcp-server',
    version: VERSION
}, {
    capabilities: {
        tools: {}
    },
    instructions: `This MCP server provides tools for AI-powered workflow generation.

Available tools:
- list_tasks: List available workflow tasks with their schemas
- generate_workflow: Generate workflow YAML from natural language
- validate_workflow: Validate workflow YAML and get fix suggestions
- dry_run_workflow: Test workflow with sample input (no side effects)
- execute_workflow: Execute a deployed workflow

Use these tools to create, validate, test, and execute Kubernetes-native workflows.`
});
// Create gateway client
const gatewayClient = new GatewayClient();
// Register list_tasks tool
server.registerTool('list_tasks', {
    title: 'List Available Tasks',
    description: 'List all available workflow tasks with their input/output schemas. Optionally filter by category or search term.',
    inputSchema: z.object({
        category: z.string().optional().describe('Filter tasks by category'),
        search: z.string().optional().describe('Search tasks by name or description')
    })
}, async (params) => {
    try {
        const result = await listTasks(gatewayClient, params);
        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify(result, null, 2)
                }
            ]
        };
    }
    catch (error) {
        return {
            content: [
                {
                    type: 'text',
                    text: `Error listing tasks: ${error instanceof Error ? error.message : 'Unknown error'}`
                }
            ],
            isError: true
        };
    }
});
// Register generate_workflow tool
server.registerTool('generate_workflow', {
    title: 'Generate Workflow',
    description: 'Generate a workflow YAML from natural language description. Uses AI (Claude) when API key is configured, otherwise uses template-based generation.',
    inputSchema: z.object({
        intent: z.string().describe('Natural language description of what the workflow should do'),
        constraints: z.object({
            maxTasks: z.number().optional().describe('Maximum number of tasks in the workflow'),
            allowedTasks: z.array(z.string()).optional().describe('List of allowed task names to use'),
            timeout: z.string().optional().describe('Overall workflow timeout (e.g., "30s", "5m")')
        }).optional().describe('Optional constraints for workflow generation'),
        useLLM: z.boolean().optional().describe('Use LLM for generation (default: true if ANTHROPIC_API_KEY is set)')
    })
}, async (params) => {
    try {
        const result = await generateWorkflow(gatewayClient, params);
        return {
            content: [
                {
                    type: 'text',
                    text: `## Generated Workflow (${result.pattern} pattern)

\`\`\`yaml
${result.yaml}
\`\`\`

**Explanation:** ${result.explanation}

**Tasks Used:** ${result.taskCount}`
                }
            ]
        };
    }
    catch (error) {
        return {
            content: [
                {
                    type: 'text',
                    text: `Error generating workflow: ${error instanceof Error ? error.message : 'Unknown error'}`
                }
            ],
            isError: true
        };
    }
});
// Register validate_workflow tool
server.registerTool('validate_workflow', {
    title: 'Validate Workflow',
    description: 'Validate workflow YAML and get detailed feedback with fix suggestions for any errors.',
    inputSchema: z.object({
        yaml: z.string().describe('The workflow YAML to validate'),
        suggestFixes: z.boolean().optional().default(true).describe('Whether to include fix suggestions for errors')
    })
}, async (params) => {
    try {
        const result = await validateWorkflow(gatewayClient, params);
        if (result.valid) {
            return {
                content: [
                    {
                        type: 'text',
                        text: '✅ Workflow is valid!'
                    }
                ]
            };
        }
        let output = '❌ Workflow validation failed\n\n';
        if (result.errors.length > 0) {
            output += '## Errors\n\n';
            for (const error of result.errors) {
                output += `- **${error.message}**`;
                if (error.location) {
                    output += ` (at ${error.location})`;
                }
                output += '\n';
                if (error.suggestion) {
                    output += `  - 💡 Suggestion: ${error.suggestion}\n`;
                }
            }
        }
        if (result.warnings.length > 0) {
            output += '\n## Warnings\n\n';
            for (const warning of result.warnings) {
                output += `- ${warning.message}\n`;
                if (warning.suggestion) {
                    output += `  - 💡 Suggestion: ${warning.suggestion}\n`;
                }
            }
        }
        return {
            content: [
                {
                    type: 'text',
                    text: output
                }
            ]
        };
    }
    catch (error) {
        return {
            content: [
                {
                    type: 'text',
                    text: `Error validating workflow: ${error instanceof Error ? error.message : 'Unknown error'}`
                }
            ],
            isError: true
        };
    }
});
// Register dry_run_workflow tool
server.registerTool('dry_run_workflow', {
    title: 'Dry Run Workflow',
    description: 'Test a workflow with sample input without making actual HTTP calls. Returns the execution plan with resolved templates.',
    inputSchema: z.object({
        yaml: z.string().describe('The workflow YAML to dry-run'),
        sampleInput: z.record(z.string(), z.unknown()).describe('Sample input data to test template resolution')
    })
}, async (params) => {
    try {
        const result = await dryRunWorkflow(gatewayClient, params);
        if (result.valid) {
            let output = '✅ Dry-run successful!\n\n';
            output += '## Execution Plan\n\n';
            // Show parallel groups
            if (result.executionPlan.parallelGroups.length > 0) {
                output += '### Execution Order\n\n';
                result.executionPlan.parallelGroups.forEach((group, index) => {
                    output += `**Group ${index + 1}** (parallel): ${group.join(', ')}\n`;
                });
                output += '\n';
            }
            // Show tasks with resolved inputs
            output += '### Tasks\n\n';
            for (const task of result.executionPlan.tasks) {
                output += `#### ${task.id} (${task.taskRef})\n`;
                if (task.dependencies.length > 0) {
                    output += `- Dependencies: ${task.dependencies.join(', ')}\n`;
                }
                output += `- Resolved Input:\n\`\`\`json\n${JSON.stringify(task.resolvedInput, null, 2)}\n\`\`\`\n\n`;
            }
            return {
                content: [{ type: 'text', text: output }]
            };
        }
        let output = '❌ Dry-run failed\n\n## Errors\n\n';
        for (const error of result.errors) {
            output += `- ${error.message}\n`;
        }
        return {
            content: [{ type: 'text', text: output }]
        };
    }
    catch (error) {
        return {
            content: [{
                    type: 'text',
                    text: `Error during dry-run: ${error instanceof Error ? error.message : 'Unknown error'}`
                }],
            isError: true
        };
    }
});
// Register execute_workflow tool
server.registerTool('execute_workflow', {
    title: 'Execute Workflow',
    description: 'Execute a deployed workflow with actual input. Returns execution results with task-level details.',
    inputSchema: z.object({
        workflowName: z.string().describe('Name of the deployed workflow to execute'),
        input: z.record(z.string(), z.unknown()).describe('Input data for the workflow')
    })
}, async (params) => {
    try {
        const result = await executeWorkflow(gatewayClient, params);
        let output = result.status === 'completed'
            ? '✅ Workflow completed successfully!\n\n'
            : '❌ Workflow execution failed\n\n';
        output += `**Execution ID:** ${result.executionId}\n`;
        output += `**Status:** ${result.status}\n`;
        output += `**Total Duration:** ${result.totalDuration}ms\n\n`;
        // Show output
        if (Object.keys(result.output).length > 0) {
            output += '## Output\n\n```json\n' + JSON.stringify(result.output, null, 2) + '\n```\n\n';
        }
        // Show task results
        if (result.taskResults.length > 0) {
            output += '## Task Results\n\n';
            for (const task of result.taskResults) {
                const icon = task.status === 'completed' ? '✅' : '❌';
                output += `### ${icon} ${task.taskId}\n`;
                output += `- Status: ${task.status}\n`;
                output += `- Duration: ${task.duration}ms\n`;
                if (task.output) {
                    output += `- Output:\n\`\`\`json\n${JSON.stringify(task.output, null, 2)}\n\`\`\`\n`;
                }
                if (task.error) {
                    output += `- Error: ${task.error}\n`;
                }
                output += '\n';
            }
        }
        return {
            content: [{ type: 'text', text: output }]
        };
    }
    catch (error) {
        return {
            content: [{
                    type: 'text',
                    text: `Error executing workflow: ${error instanceof Error ? error.message : 'Unknown error'}`
                }],
            isError: true
        };
    }
});
// Start the server
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error('Workflow MCP Server started');
}
main().catch((error) => {
    console.error('Failed to start server:', error);
    process.exit(1);
});
//# sourceMappingURL=index.js.map