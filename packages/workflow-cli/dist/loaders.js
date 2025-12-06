/**
 * Workflow and Task Loaders
 * Load workflow and task definitions from YAML files
 */
import * as fs from 'fs/promises';
import * as path from 'path';
import * as yaml from 'yaml';
/**
 * Load a workflow definition from a YAML file
 * @param filePath Path to the workflow YAML file
 * @returns Parsed workflow definition
 * @throws Error if file doesn't exist, YAML is invalid, or resource is not a Workflow
 */
export async function loadWorkflow(filePath) {
    const content = await fs.readFile(filePath, 'utf-8');
    let parsed;
    try {
        parsed = yaml.parse(content);
    }
    catch (error) {
        throw new Error(`Invalid YAML in ${filePath}: ${error}`);
    }
    if (!parsed || typeof parsed !== 'object') {
        throw new Error(`Invalid workflow definition in ${filePath}`);
    }
    const resource = parsed;
    if (resource.kind !== 'Workflow') {
        throw new Error(`Expected kind: Workflow, but got: ${resource.kind}`);
    }
    return resource;
}
/**
 * Load task definitions from a YAML file
 * Supports multi-document YAML (separated by ---)
 * @param filePath Path to the task YAML file
 * @returns Array of parsed task definitions
 * @throws Error if file doesn't exist or YAML is invalid
 */
export async function loadTasks(filePath) {
    const content = await fs.readFile(filePath, 'utf-8');
    const tasks = [];
    // Parse multi-document YAML
    const documents = yaml.parseAllDocuments(content);
    for (const doc of documents) {
        if (doc.errors && doc.errors.length > 0) {
            throw new Error(`Invalid YAML in ${filePath}: ${doc.errors[0].message}`);
        }
        const parsed = doc.toJSON();
        if (parsed && typeof parsed === 'object' && parsed.kind === 'WorkflowTask') {
            tasks.push(parsed);
        }
    }
    return tasks;
}
/**
 * Load all task definitions from a directory
 * @param dirPath Path to the directory containing task YAML files
 * @param options Options for filtering tasks
 * @returns Array of all task definitions found
 * @throws Error if directory doesn't exist
 */
export async function loadTasksFromDirectory(dirPath, options = {}) {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    const tasks = [];
    for (const entry of entries) {
        // Skip directories and non-YAML files
        if (!entry.isFile())
            continue;
        const ext = path.extname(entry.name).toLowerCase();
        if (ext !== '.yaml' && ext !== '.yml')
            continue;
        const filePath = path.join(dirPath, entry.name);
        const fileTasks = await loadTasks(filePath);
        // Filter by namespace if specified
        if (options.namespace) {
            tasks.push(...fileTasks.filter(t => t.metadata.namespace === options.namespace));
        }
        else {
            tasks.push(...fileTasks);
        }
    }
    return tasks;
}
//# sourceMappingURL=loaders.js.map