import { selectRelevantExample } from '../prompts/few-shot-examples.js';
import { LlmService } from '../services/llm-service.js';
/**
 * Detect the workflow pattern from user intent
 */
export function detectPattern(intent) {
    const lowerIntent = intent.toLowerCase();
    // Check for parallel indicators
    if (lowerIntent.includes('at the same time') ||
        lowerIntent.includes('simultaneously') ||
        lowerIntent.includes('in parallel') ||
        (lowerIntent.includes('and') && !lowerIntent.includes('then'))) {
        return 'parallel';
    }
    // Check for diamond pattern indicators
    if ((lowerIntent.includes('check') && lowerIntent.includes('then')) ||
        (lowerIntent.includes('validate') && lowerIntent.includes('then')) ||
        lowerIntent.includes('fork') ||
        lowerIntent.includes('join')) {
        return 'diamond';
    }
    // Check for complex/batch indicators
    if (lowerIntent.includes('batch') ||
        lowerIntent.includes('pipeline')) {
        return 'complex';
    }
    // Default to sequential
    return 'sequential';
}
/**
 * Parse YAML from a generated response (may be wrapped in markdown code block)
 */
export function parseGeneratedYaml(response) {
    // Try to extract from markdown code block
    const codeBlockMatch = response.match(/```(?:yaml|yml)?\s*\n([\s\S]*?)\n```/);
    if (codeBlockMatch) {
        return codeBlockMatch[1].trim();
    }
    // Check if response looks like YAML (starts with common YAML keys)
    if (response.match(/^(name:|tasks:|input:|output:)/m)) {
        // Find the YAML portion
        const lines = response.split('\n');
        const yamlLines = [];
        let inYaml = false;
        for (const line of lines) {
            if (line.match(/^(name:|tasks:|input:|output:)/)) {
                inYaml = true;
            }
            if (inYaml) {
                // Stop if we hit non-YAML content
                if (line.match(/^[A-Z]/) && !line.startsWith('  ')) {
                    break;
                }
                yamlLines.push(line);
            }
        }
        return yamlLines.join('\n').trim();
    }
    return '';
}
/**
 * Transform WorkflowTask to TaskSummary
 * Handles both gateway format (inputSchema/outputSchema) and legacy format (spec.input/spec.output)
 */
function toTaskSummary(task) {
    const defaultSchema = { type: 'object', properties: {} };
    return {
        name: task.name,
        description: task.description ?? '',
        category: task.category ?? task.type ?? 'uncategorized',
        inputSchema: task.inputSchema ?? task.spec?.input ?? defaultSchema,
        outputSchema: task.outputSchema ?? task.spec?.output ?? defaultSchema
    };
}
/**
 * Generate a workflow name from intent
 */
function generateWorkflowName(intent) {
    return intent
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .split(/\s+/)
        .slice(0, 3)
        .join('-');
}
/**
 * Generate a workflow YAML based on pattern and available tasks
 */
function generateWorkflowYaml(intent, tasks, pattern, maxTasks) {
    const workflowName = generateWorkflowName(intent);
    const limitedTasks = maxTasks ? tasks.slice(0, maxTasks) : tasks.slice(0, 3);
    if (limitedTasks.length === 0) {
        return {
            yaml: `name: ${workflowName}
input:
  type: object
  properties: {}
output: {}
tasks: []`,
            taskCount: 0
        };
    }
    // Build tasks based on pattern
    let tasksYaml = '';
    const taskIds = [];
    limitedTasks.forEach((task, index) => {
        const taskId = task.name.replace(/_/g, '-');
        taskIds.push(taskId);
        const inputProps = task.inputSchema.properties
            ? Object.keys(task.inputSchema.properties)
            : [];
        const inputMapping = inputProps.length > 0
            ? inputProps.map(prop => `      ${prop}: "{{ input.${prop} }}"`).join('\n')
            : '      {}';
        let dependsOn = '';
        if (pattern === 'sequential' && index > 0) {
            dependsOn = `\n    dependsOn:\n      - ${taskIds[index - 1]}`;
        }
        else if (pattern === 'diamond' && index > 0) {
            if (index === limitedTasks.length - 1 && limitedTasks.length > 2) {
                // Last task depends on all middle tasks
                const middleTasks = taskIds.slice(1, -1);
                if (middleTasks.length > 0) {
                    dependsOn = `\n    dependsOn:\n${middleTasks.map(t => `      - ${t}`).join('\n')}`;
                }
                else {
                    dependsOn = `\n    dependsOn:\n      - ${taskIds[0]}`;
                }
            }
            else if (index > 0) {
                dependsOn = `\n    dependsOn:\n      - ${taskIds[0]}`;
            }
        }
        tasksYaml += `  - id: ${taskId}
    taskRef: ${task.name}
    input:
${inputMapping}${dependsOn}\n`;
    });
    // Build input schema based on first task's input
    const firstTask = limitedTasks[0];
    const inputProps = firstTask.inputSchema.properties
        ? Object.entries(firstTask.inputSchema.properties)
            .map(([name, schema]) => `    ${name}:\n      type: ${schema.type ?? 'string'}`)
            .join('\n')
        : '';
    // Build output mapping from last task
    const lastTaskId = taskIds[taskIds.length - 1];
    const lastTask = limitedTasks[limitedTasks.length - 1];
    const outputProps = lastTask.outputSchema.properties
        ? Object.keys(lastTask.outputSchema.properties)
        : ['result'];
    const outputMapping = outputProps.length > 0
        ? `  ${outputProps[0]}: "{{ tasks.${lastTaskId}.output.${outputProps[0]} }}"`
        : `  result: "{{ tasks.${lastTaskId}.output }}"`;
    const yaml = `name: ${workflowName}
input:
  type: object
  properties:
${inputProps || '    {}'}
output:
${outputMapping}
tasks:
${tasksYaml}`;
    return { yaml: yaml.trim(), taskCount: limitedTasks.length };
}
// Singleton LLM service instance
let llmService = null;
/**
 * Get or create the LLM service
 */
function getLlmService() {
    if (!llmService) {
        llmService = new LlmService();
    }
    return llmService;
}
/**
 * Generate a workflow from natural language intent
 */
export async function generateWorkflow(client, params) {
    // Fetch available tasks
    const allTasks = await client.listTasks();
    // Filter tasks if constraints provided
    let tasks = allTasks;
    if (params.constraints?.allowedTasks) {
        tasks = tasks.filter(t => params.constraints.allowedTasks.includes(t.name));
    }
    const taskSummaries = tasks.map(toTaskSummary);
    // Handle empty task list
    if (taskSummaries.length === 0) {
        return {
            yaml: `name: empty-workflow
input:
  type: object
  properties: {}
output: {}
tasks: []`,
            explanation: 'No tasks available. The workflow has no tasks because there are no tasks available in the system.',
            taskCount: 0,
            pattern: 'sequential'
        };
    }
    // Try LLM generation if requested and available
    const service = getLlmService();
    const shouldUseLLM = params.useLLM !== false && service.isAvailable();
    if (shouldUseLLM) {
        try {
            return await service.generateWorkflow(params.intent, taskSummaries);
        }
        catch (error) {
            // Fall back to template-based generation on LLM failure
            console.error('LLM generation failed, falling back to template:', error);
        }
    }
    // Template-based generation (fallback)
    return generateWorkflowFromTemplate(params.intent, taskSummaries, params.constraints?.maxTasks);
}
/**
 * Generate workflow using template-based approach (fallback)
 */
function generateWorkflowFromTemplate(intent, taskSummaries, maxTasks) {
    // Detect pattern from intent
    const pattern = detectPattern(intent);
    // Generate workflow YAML
    const { yaml, taskCount } = generateWorkflowYaml(intent, taskSummaries, pattern, maxTasks);
    // Generate explanation
    const example = selectRelevantExample(intent);
    const explanation = `This workflow uses a ${pattern} pattern. ${pattern === 'sequential'
        ? 'Tasks execute one after another, each depending on the previous.'
        : pattern === 'parallel'
            ? 'Tasks execute simultaneously without dependencies.'
            : pattern === 'diamond'
                ? 'Tasks fork after the first task and join before the final task.'
                : 'Tasks are organized in a complex pipeline.'} Generated ${taskCount} task(s) based on the intent: "${intent}".`;
    return {
        yaml,
        explanation,
        taskCount,
        pattern
    };
}
//# sourceMappingURL=generate-workflow.js.map