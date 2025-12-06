/**
 * Init Command
 * Initialize a new workflow project from templates
 */
import * as fs from 'fs/promises';
import * as path from 'path';
/**
 * Available workflow templates
 */
const TEMPLATES = [
    {
        id: 'basic',
        name: 'Basic Workflow',
        description: 'A minimal workflow template with a single task'
    },
    {
        id: 'api-composition',
        name: 'API Composition',
        description: 'Workflow that composes multiple API calls with dependencies'
    },
    {
        id: 'parallel-fetch',
        name: 'Parallel Fetch',
        description: 'Workflow with parallel task execution'
    }
];
/**
 * Generate workflow YAML content
 */
function generateWorkflowYaml(name, template) {
    if (template === 'api-composition') {
        return `apiVersion: workflow.example.com/v1
kind: Workflow
metadata:
  name: ${name}
  namespace: default
spec:
  input:
    type: object
    properties:
      userId:
        type: string
    required:
      - userId
  tasks:
    - id: fetch-user
      taskRef: get-user
      input:
        id: "{{input.userId}}"
    - id: fetch-orders
      taskRef: get-orders
      dependsOn:
        - fetch-user
      input:
        userId: "{{tasks.fetch-user.output.id}}"
  output:
    user: "{{tasks.fetch-user.output}}"
    orders: "{{tasks.fetch-orders.output}}"
`;
    }
    if (template === 'parallel-fetch') {
        return `apiVersion: workflow.example.com/v1
kind: Workflow
metadata:
  name: ${name}
  namespace: default
spec:
  input:
    type: object
    properties:
      userId:
        type: string
    required:
      - userId
  tasks:
    - id: fetch-user
      taskRef: get-user
      input:
        id: "{{input.userId}}"
    - id: fetch-preferences
      taskRef: get-preferences
      input:
        userId: "{{input.userId}}"
    - id: process-data
      taskRef: process-data
      dependsOn:
        - fetch-user
        - fetch-preferences
      input:
        user: "{{tasks.fetch-user.output}}"
        preferences: "{{tasks.fetch-preferences.output}}"
  output:
    result: "{{tasks.process-data.output}}"
`;
    }
    // Default: basic template
    return `apiVersion: workflow.example.com/v1
kind: Workflow
metadata:
  name: ${name}
  namespace: default
spec:
  input:
    type: object
    properties:
      input:
        type: string
  tasks:
    - id: main-task
      taskRef: example-task
      input:
        data: "{{input.input}}"
  output:
    result: "{{tasks.main-task.output}}"
`;
}
/**
 * Generate .workflowrc config content
 */
function generateConfigYaml() {
    return `# Workflow CLI configuration
gateway:
  url: http://localhost:5001
  namespace: default
tasks:
  localPath: ./tasks/
  remoteFetch: true
templates:
  customPath: ./templates/
`;
}
/**
 * Get list of available templates
 */
export function getAvailableTemplates() {
    return [...TEMPLATES];
}
/**
 * Initialize a new workflow project
 */
export async function initWorkflow(name, options) {
    const template = options.template || 'basic';
    const outputPath = options.outputPath || process.cwd();
    const workflowPath = path.join(outputPath, name);
    const createdFiles = [];
    // Validate template
    const validTemplate = TEMPLATES.find(t => t.id === template);
    if (!validTemplate) {
        return {
            success: false,
            error: `Invalid template: ${template}. Available templates: ${TEMPLATES.map(t => t.id).join(', ')}`
        };
    }
    // Check if directory already exists
    try {
        await fs.access(workflowPath);
        return {
            success: false,
            error: `Directory already exists: ${workflowPath}`
        };
    }
    catch {
        // Directory doesn't exist, proceed
    }
    try {
        // Create main directory
        await fs.mkdir(workflowPath, { recursive: true });
        // Create tasks directory
        const tasksPath = path.join(workflowPath, 'tasks');
        await fs.mkdir(tasksPath, { recursive: true });
        createdFiles.push('tasks/');
        // Create workflow.yaml
        const workflowYamlPath = path.join(workflowPath, 'workflow.yaml');
        const workflowContent = generateWorkflowYaml(name, template);
        await fs.writeFile(workflowYamlPath, workflowContent, 'utf-8');
        createdFiles.push('workflow.yaml');
        // Create .workflowrc
        const configPath = path.join(workflowPath, '.workflowrc');
        const configContent = generateConfigYaml();
        await fs.writeFile(configPath, configContent, 'utf-8');
        createdFiles.push('.workflowrc');
        return {
            success: true,
            workflowPath,
            template,
            createdFiles
        };
    }
    catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
            success: false,
            error: `Failed to create workflow: ${message}`
        };
    }
}
//# sourceMappingURL=init.js.map