import * as YAML from 'yaml';

export enum DiagnosticSeverity {
  Error = 1,
  Warning = 2,
  Information = 3,
  Hint = 4,
}

export interface DiagnosticRange {
  start: { line: number; character: number };
  end: { line: number; character: number };
}

export interface Diagnostic {
  range: DiagnosticRange;
  message: string;
  severity: DiagnosticSeverity;
  source: string;
}

export class DiagnosticsProvider {
  getDiagnostics(text: string): Diagnostic[] {
    if (!text || text.trim() === '') {
      return [];
    }

    const diagnostics: Diagnostic[] = [];

    // Parse YAML
    let doc: any;
    try {
      doc = YAML.parse(text);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      diagnostics.push({
        range: {
          start: { line: 0, character: 0 },
          end: { line: 0, character: Number.MAX_VALUE },
        },
        message: `YAML Parse Error: ${message}`,
        severity: DiagnosticSeverity.Error,
        source: 'workflow-validator',
      });
      return diagnostics;
    }

    if (!doc) {
      return [];
    }

    const kind = doc.kind;

    if (kind === 'Workflow') {
      this.validateWorkflow(doc, text, diagnostics);
    } else if (kind === 'WorkflowTask') {
      this.validateWorkflowTask(doc, text, diagnostics);
    }

    return diagnostics;
  }

  private validateWorkflow(doc: any, text: string, diagnostics: Diagnostic[]): void {
    // Check metadata.name
    if (!doc.metadata?.name) {
      const line = this.findLineNumber(text, 'metadata:');
      diagnostics.push({
        range: this.createRange(line >= 0 ? line : 0),
        message: 'Workflow must have metadata.name',
        severity: DiagnosticSeverity.Error,
        source: 'workflow-validator',
      });
    }

    // Check spec.tasks
    if (!doc.spec?.tasks || !Array.isArray(doc.spec.tasks)) {
      const line = this.findLineNumber(text, 'spec:');
      diagnostics.push({
        range: this.createRange(line >= 0 ? line : 0),
        message: 'Workflow must have spec.tasks array',
        severity: DiagnosticSeverity.Error,
        source: 'workflow-validator',
      });
      return;
    }

    // Validate tasks
    const taskIds = new Set<string>();
    const taskLines = this.findTaskLines(text);

    for (let i = 0; i < doc.spec.tasks.length; i++) {
      const task = doc.spec.tasks[i];
      const taskLine = taskLines[i] ?? 0;

      if (!task.id) {
        diagnostics.push({
          range: this.createRange(taskLine),
          message: 'Task must have an id',
          severity: DiagnosticSeverity.Error,
          source: 'workflow-validator',
        });
      } else {
        taskIds.add(task.id);
      }

      if (!task.taskRef && !task.workflowRef) {
        diagnostics.push({
          range: this.createRange(taskLine),
          message: `Task '${task.id || 'unknown'}' must have a taskRef or workflowRef`,
          severity: DiagnosticSeverity.Error,
          source: 'workflow-validator',
        });
      }
    }

    // Validate dependencies
    this.validateDependencies(doc.spec.tasks, taskIds, text, diagnostics);
  }

  private validateWorkflowTask(doc: any, text: string, diagnostics: Diagnostic[]): void {
    // Check metadata.name
    if (!doc.metadata?.name) {
      const line = this.findLineNumber(text, 'metadata:');
      diagnostics.push({
        range: this.createRange(line >= 0 ? line : 0),
        message: 'WorkflowTask must have metadata.name',
        severity: DiagnosticSeverity.Error,
        source: 'workflow-validator',
      });
    }

    // Check spec.type
    if (!doc.spec?.type) {
      const line = this.findLineNumber(text, 'spec:');
      diagnostics.push({
        range: this.createRange(line >= 0 ? line : 0),
        message: 'WorkflowTask must have spec.type',
        severity: DiagnosticSeverity.Error,
        source: 'workflow-validator',
      });
    }
  }

  private validateDependencies(
    tasks: any[],
    taskIds: Set<string>,
    text: string,
    diagnostics: Diagnostic[]
  ): void {
    // Build dependency graph
    const graph = new Map<string, string[]>();
    for (const task of tasks) {
      if (task.id) {
        graph.set(task.id, task.dependsOn || []);
      }
    }

    // Check for unknown dependencies
    for (const task of tasks) {
      if (task.dependsOn && Array.isArray(task.dependsOn)) {
        for (const dep of task.dependsOn) {
          if (!taskIds.has(dep)) {
            const line = this.findLineNumber(text, dep);
            diagnostics.push({
              range: this.createRange(line >= 0 ? line : 0),
              message: `Unknown dependency '${dep}' in task '${task.id}'`,
              severity: DiagnosticSeverity.Error,
              source: 'workflow-validator',
            });
          }
        }
      }
    }

    // Check for circular dependencies
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const hasCycle = (taskId: string): boolean => {
      if (recursionStack.has(taskId)) {
        return true;
      }
      if (visited.has(taskId)) {
        return false;
      }

      visited.add(taskId);
      recursionStack.add(taskId);

      const deps = graph.get(taskId) || [];
      for (const dep of deps) {
        if (hasCycle(dep)) {
          return true;
        }
      }

      recursionStack.delete(taskId);
      return false;
    };

    for (const taskId of graph.keys()) {
      visited.clear();
      recursionStack.clear();
      if (hasCycle(taskId)) {
        const line = this.findLineNumber(text, `id: ${taskId}`);
        diagnostics.push({
          range: this.createRange(line >= 0 ? line : 0),
          message: `Circular dependency detected involving task '${taskId}'`,
          severity: DiagnosticSeverity.Error,
          source: 'workflow-validator',
        });
        break; // Only report once
      }
    }
  }

  private findLineNumber(text: string, search: string): number {
    const lines = text.split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes(search)) {
        return i;
      }
    }
    return -1;
  }

  private findTaskLines(text: string): number[] {
    const lines = text.split('\n');
    const taskLines: number[] = [];
    let inTasks = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (/^\s*tasks:/.test(line)) {
        inTasks = true;
        continue;
      }
      if (inTasks && /^\s+-\s/.test(line)) {
        taskLines.push(i);
      }
      // Exit tasks section when we hit a non-indented line
      if (inTasks && /^\s*\w+:/.test(line) && !/^\s+-/.test(line) && !line.startsWith(' ')) {
        inTasks = false;
      }
    }

    return taskLines;
  }

  private createRange(line: number): DiagnosticRange {
    return {
      start: { line, character: 0 },
      end: { line, character: Number.MAX_VALUE },
    };
  }
}
