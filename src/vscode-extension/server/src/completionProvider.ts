import { CompletionItem, CompletionItemKind } from 'vscode-languageserver';
import * as YAML from 'yaml';

export interface CompletionContext {
  text: string;
  position: { line: number; character: number };
  lineText: string;
  isInsideTemplateExpression?: boolean;
  templatePrefix?: string;
}

interface PropertyDefinition {
  label: string;
  documentation: string;
  kind: CompletionItemKind;
}

// Top-level Kubernetes resource properties
const TOP_LEVEL_PROPERTIES: PropertyDefinition[] = [
  { label: 'apiVersion', documentation: 'API version for the resource (e.g., workflow.io/v1)', kind: CompletionItemKind.Property },
  { label: 'kind', documentation: 'Resource type (Workflow or WorkflowTask)', kind: CompletionItemKind.Property },
  { label: 'metadata', documentation: 'Resource metadata including name, namespace, labels', kind: CompletionItemKind.Property },
  { label: 'spec', documentation: 'Resource specification', kind: CompletionItemKind.Property },
];

// Workflow spec properties
const WORKFLOW_SPEC_PROPERTIES: PropertyDefinition[] = [
  { label: 'description', documentation: 'Human-readable description of the workflow', kind: CompletionItemKind.Property },
  { label: 'input', documentation: 'Input schema definition for the workflow', kind: CompletionItemKind.Property },
  { label: 'tasks', documentation: 'Array of task steps to execute', kind: CompletionItemKind.Property },
  { label: 'output', documentation: 'Output mapping from task results', kind: CompletionItemKind.Property },
  { label: 'triggers', documentation: 'Trigger definitions (schedule, webhook, etc.)', kind: CompletionItemKind.Property },
];

// WorkflowTask spec properties
const WORKFLOW_TASK_SPEC_PROPERTIES: PropertyDefinition[] = [
  { label: 'type', documentation: 'Task type (e.g., http)', kind: CompletionItemKind.Property },
  { label: 'http', documentation: 'HTTP task configuration', kind: CompletionItemKind.Property },
  { label: 'input', documentation: 'Input schema for the task', kind: CompletionItemKind.Property },
  { label: 'output', documentation: 'Output schema for the task', kind: CompletionItemKind.Property },
];

// Task step properties (inside tasks array)
const TASK_STEP_PROPERTIES: PropertyDefinition[] = [
  { label: 'id', documentation: 'Unique identifier for this task step', kind: CompletionItemKind.Property },
  { label: 'taskRef', documentation: 'Reference to a WorkflowTask resource', kind: CompletionItemKind.Property },
  { label: 'workflowRef', documentation: 'Reference to a sub-workflow', kind: CompletionItemKind.Property },
  { label: 'input', documentation: 'Input values for the task', kind: CompletionItemKind.Property },
  { label: 'dependsOn', documentation: 'Array of task IDs this step depends on', kind: CompletionItemKind.Property },
  { label: 'condition', documentation: 'Conditional expression for executing this task', kind: CompletionItemKind.Property },
  { label: 'forEach', documentation: 'Loop configuration for iterating over arrays', kind: CompletionItemKind.Property },
  { label: 'switch', documentation: 'Switch/case configuration', kind: CompletionItemKind.Property },
  { label: 'timeout', documentation: 'Timeout duration for this task (e.g., "30s", "5m")', kind: CompletionItemKind.Property },
];

export class CompletionProvider {
  getCompletions(context: CompletionContext): CompletionItem[] {
    const { text, position, lineText, isInsideTemplateExpression, templatePrefix } = context;

    // Handle template expression completions
    if (isInsideTemplateExpression) {
      return this.getTemplateExpressionCompletions(text, templatePrefix || '');
    }

    // Parse the document to understand context
    let doc: any;
    try {
      doc = YAML.parse(text);
    } catch {
      // If YAML parsing fails, provide top-level completions
      return this.toCompletionItems(TOP_LEVEL_PROPERTIES);
    }

    if (!doc) {
      return this.toCompletionItems(TOP_LEVEL_PROPERTIES);
    }

    const kind = doc.kind;
    const indent = this.getIndentLevel(lineText);
    const isInTasksArray = this.isInsideTasksArray(text, position);
    const isInDependsOnArray = this.isInsideDependsOnArray(lineText);

    // Handle dependsOn completions
    if (isInDependsOnArray) {
      return this.getDependsOnCompletions(doc, position, text);
    }

    // Determine context based on indentation and document structure
    if (indent === 0) {
      // Root level - suggest top-level properties
      return this.toCompletionItems(TOP_LEVEL_PROPERTIES);
    }

    if (isInTasksArray) {
      // Inside tasks array - suggest task step properties
      return this.toCompletionItems(TASK_STEP_PROPERTIES);
    }

    // Inside spec block - depends on kind
    if (indent >= 2 && this.isInsideSpec(text, position)) {
      if (kind === 'Workflow') {
        return this.toCompletionItems(WORKFLOW_SPEC_PROPERTIES);
      } else if (kind === 'WorkflowTask') {
        return this.toCompletionItems(WORKFLOW_TASK_SPEC_PROPERTIES);
      }
    }

    // Default to top-level
    return this.toCompletionItems(TOP_LEVEL_PROPERTIES);
  }

  private getIndentLevel(lineText: string): number {
    const match = lineText.match(/^(\s*)/);
    return match ? match[1].length : 0;
  }

  private isInsideSpec(text: string, position: { line: number }): boolean {
    const lines = text.split('\n');
    for (let i = position.line - 1; i >= 0; i--) {
      const line = lines[i];
      if (line && /^spec:/.test(line.trim())) {
        return true;
      }
      if (line && /^(apiVersion|kind|metadata):/.test(line.trim())) {
        return false;
      }
    }
    return false;
  }

  private isInsideTasksArray(text: string, position: { line: number }): boolean {
    const lines = text.split('\n');
    const currentLine = lines[position.line] || '';

    // Check if current line starts with "- " indicating array item
    if (/^\s+-\s*/.test(currentLine)) {
      // Look backwards to find if we're in a tasks array
      for (let i = position.line - 1; i >= 0; i--) {
        const line = lines[i];
        if (line && /^\s*tasks:/.test(line)) {
          return true;
        }
        // If we hit another top-level property, we're not in tasks
        if (line && /^(apiVersion|kind|metadata|spec):/.test(line.trim())) {
          return false;
        }
      }
    }
    return false;
  }

  private isInsideDependsOnArray(lineText: string): boolean {
    // Check if we're on a line that looks like "        - " inside dependsOn
    return /^\s+-\s*$/.test(lineText) && lineText.length > 8;
  }

  private getDependsOnCompletions(doc: any, position: { line: number }, text: string): CompletionItem[] {
    const tasks = doc?.spec?.tasks;
    if (!Array.isArray(tasks)) {
      return [];
    }

    // Find the current task by looking for the nearest "- id:" before the cursor
    const currentTaskId = this.findCurrentTaskId(text, position);

    // Get all task IDs, excluding the current task
    const taskIds: string[] = [];
    for (const task of tasks) {
      if (task.id && task.id !== currentTaskId) {
        taskIds.push(task.id);
      }
    }

    return taskIds.map(id => ({
      label: id,
      kind: CompletionItemKind.Reference,
      documentation: `Depend on task '${id}'`,
    }));
  }

  private findCurrentTaskId(text: string, position: { line: number }): string | null {
    const lines = text.split('\n');
    // Look backwards from current position for "id:" line
    for (let i = position.line; i >= 0; i--) {
      const line = lines[i];
      if (!line) continue;

      // Match "- id: taskname" or "  id: taskname"
      const match = line.match(/^\s*-?\s*id:\s*(\S+)/);
      if (match) {
        return match[1];
      }

      // If we hit a new array item that's not ours, stop
      if (/^\s+-\s*\w+:/.test(line) && !line.includes('id:')) {
        continue;
      }
    }
    return null;
  }

  private getTemplateExpressionCompletions(text: string, prefix: string): CompletionItem[] {
    let doc: any;
    try {
      doc = YAML.parse(text);
    } catch {
      return [];
    }

    if (!doc) {
      return [];
    }

    if (prefix === 'input.') {
      // Suggest input properties
      const inputSchema = doc?.spec?.input?.properties;
      if (inputSchema && typeof inputSchema === 'object') {
        return Object.keys(inputSchema).map(key => ({
          label: key,
          kind: CompletionItemKind.Variable,
          documentation: `Input field: ${key}`,
        }));
      }
    }

    if (prefix === 'tasks.') {
      // Suggest task IDs
      const tasks = doc?.spec?.tasks;
      if (Array.isArray(tasks)) {
        return tasks
          .filter(t => t.id)
          .map(t => ({
            label: t.id,
            kind: CompletionItemKind.Reference,
            documentation: `Output from task '${t.id}'`,
          }));
      }
    }

    return [];
  }

  private toCompletionItems(properties: PropertyDefinition[]): CompletionItem[] {
    return properties.map(prop => ({
      label: prop.label,
      kind: prop.kind,
      documentation: prop.documentation,
    }));
  }
}
