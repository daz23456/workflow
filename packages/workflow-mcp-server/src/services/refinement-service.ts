import type { GatewayClient } from './gateway-client.js';
import type {
  TaskSummary,
  ValidationError,
  RefinementResult,
  RefinementStep,
  TerminationReason
} from '../types/index.js';
import { detectErrorType, type ErrorType } from '../prompts/error-fixing.js';

/**
 * Error types that can be automatically fixed
 */
const FIXABLE_ERROR_TYPES: ErrorType[] = [
  'unknown_task_ref',
  'invalid_template',
  'missing_dependency'
];

/**
 * Service for iterative workflow refinement with loop prevention
 */
export class RefinementService {
  private maxIterations: number;

  constructor(
    private client: GatewayClient,
    maxIterations: number = 3
  ) {
    this.maxIterations = maxIterations;
  }

  /**
   * Refine a workflow by iteratively fixing validation errors
   */
  async refineWorkflow(
    yaml: string,
    availableTasks: TaskSummary[]
  ): Promise<RefinementResult> {
    const history: RefinementStep[] = [];
    const seenErrorHashes = new Set<string>();
    let currentYaml = yaml;
    let previousErrorCount = Infinity;

    for (let iteration = 0; iteration < this.maxIterations; iteration++) {
      const validation = await this.client.validateWorkflow(currentYaml);

      // Success - workflow is valid
      if (validation.valid) {
        return {
          yaml: currentYaml,
          history,
          valid: true,
          terminationReason: 'success'
        };
      }

      // Check termination conditions
      const errorHash = this.hashErrors(validation.errors);

      // Oscillation detection - seen these exact errors before
      if (seenErrorHashes.has(errorHash)) {
        return {
          yaml: currentYaml,
          history,
          valid: false,
          terminationReason: 'oscillation_detected'
        };
      }
      seenErrorHashes.add(errorHash);

      // No progress - error count not decreasing
      if (iteration > 0 && validation.errors.length >= previousErrorCount) {
        return {
          yaml: currentYaml,
          history,
          valid: false,
          terminationReason: 'no_progress'
        };
      }
      previousErrorCount = validation.errors.length;

      // Check if any errors are fixable
      const fixableErrors = validation.errors.filter(e => this.canAutoFix(e));
      if (fixableErrors.length === 0) {
        return {
          yaml: currentYaml,
          history,
          valid: false,
          terminationReason: 'unfixable_errors'
        };
      }

      // Apply fixes
      const fixes = this.generateFixes(fixableErrors, availableTasks);
      currentYaml = this.applyFixes(currentYaml, fixes);

      history.push({
        iteration: iteration + 1,
        errors: validation.errors.map(e => e.message),
        fixes
      });
    }

    return {
      yaml: currentYaml,
      history,
      valid: false,
      terminationReason: 'max_iterations'
    };
  }

  /**
   * Hash errors for oscillation detection
   */
  private hashErrors(errors: ValidationError[]): string {
    return errors.map(e => e.message).sort().join('|');
  }

  /**
   * Check if an error can be automatically fixed
   */
  private canAutoFix(error: ValidationError): boolean {
    const errorType = detectErrorType(error.message);
    return errorType !== null && FIXABLE_ERROR_TYPES.includes(errorType);
  }

  /**
   * Generate fixes for a list of errors
   */
  private generateFixes(
    errors: ValidationError[],
    availableTasks: TaskSummary[]
  ): string[] {
    const fixes: string[] = [];

    for (const error of errors) {
      const errorType = detectErrorType(error.message);
      if (!errorType) continue;

      const fix = this.generateFix(errorType, error.message, availableTasks);
      if (fix) {
        fixes.push(fix);
      }
    }

    return fixes;
  }

  /**
   * Generate a single fix based on error type
   */
  private generateFix(
    errorType: ErrorType,
    message: string,
    availableTasks: TaskSummary[]
  ): string | null {
    switch (errorType) {
      case 'unknown_task_ref': {
        // Extract the invalid task ref
        const match = message.match(/["']([^"']+)["']/);
        if (!match) return null;
        const invalidRef = match[1];

        // Find closest match
        const closest = this.findClosestTask(invalidRef, availableTasks);
        if (closest) {
          return `Replace taskRef "${invalidRef}" with "${closest}"`;
        }
        return null;
      }

      case 'invalid_template': {
        // Extract the invalid template
        const match = message.match(/{{[^}]*}}/);
        if (!match) return null;
        const template = match[0];

        // Try to fix common issues
        const fixed = this.fixTemplate(template);
        if (fixed !== template) {
          return `Replace "${template}" with "${fixed}"`;
        }
        return null;
      }

      case 'missing_dependency': {
        // Extract task IDs from the message
        const taskMatch = message.match(/["']([^"']+)["'].*references.*["']([^"']+)["']/i);
        if (!taskMatch) return null;
        const [, taskId, referencedTask] = taskMatch;
        return `Add "${referencedTask}" to dependsOn for task "${taskId}"`;
      }

      default:
        return null;
    }
  }

  /**
   * Apply fixes to YAML
   */
  private applyFixes(yaml: string, fixes: string[]): string {
    let result = yaml;

    for (const fix of fixes) {
      // Parse fix instructions and apply them
      if (fix.startsWith('Replace taskRef')) {
        const match = fix.match(/Replace taskRef "([^"]+)" with "([^"]+)"/);
        if (match) {
          const [, oldRef, newRef] = match;
          result = result.replace(
            new RegExp(`taskRef:\\s*${this.escapeRegex(oldRef)}`, 'g'),
            `taskRef: ${newRef}`
          );
        }
      } else if (fix.startsWith('Replace "{{')) {
        const match = fix.match(/Replace "({{[^"]+}})" with "({{[^"]+}})"/);
        if (match) {
          const [, oldTemplate, newTemplate] = match;
          result = result.replace(oldTemplate, newTemplate);
        }
      } else if (fix.startsWith('Add "')) {
        const match = fix.match(/Add "([^"]+)" to dependsOn for task "([^"]+)"/);
        if (match) {
          const [, depToAdd, taskId] = match;
          result = this.addDependency(result, taskId, depToAdd);
        }
      }
    }

    return result;
  }

  /**
   * Find the closest matching task name
   */
  private findClosestTask(invalidRef: string, tasks: TaskSummary[]): string | null {
    if (tasks.length === 0) return null;

    let bestMatch: string | null = null;
    let bestScore = 0;

    for (const task of tasks) {
      const score = this.similarityScore(invalidRef.toLowerCase(), task.name.toLowerCase());
      if (score > bestScore) {
        bestScore = score;
        bestMatch = task.name;
      }
    }

    // Only return if reasonably similar (> 30% match)
    return bestScore > 0.3 ? bestMatch : tasks[0].name;
  }

  /**
   * Calculate similarity score between two strings (0-1)
   */
  private similarityScore(a: string, b: string): number {
    if (a === b) return 1;
    if (a.length === 0 || b.length === 0) return 0;

    // Simple character-based similarity
    const longer = a.length > b.length ? a : b;
    const shorter = a.length > b.length ? b : a;

    let matches = 0;
    for (let i = 0; i < shorter.length; i++) {
      if (longer.includes(shorter[i])) {
        matches++;
      }
    }

    return matches / longer.length;
  }

  /**
   * Fix common template issues
   */
  private fixTemplate(template: string): string {
    let fixed = template;

    // Fix spacing around braces: {{input.x}} -> {{ input.x }}
    fixed = fixed.replace(/\{\{(\S)/, '{{ $1');
    fixed = fixed.replace(/(\S)\}\}/, '$1 }}');

    // Fix missing dots: {{ inputfield }} -> {{ input.field }}
    if (fixed.includes('input') && !fixed.includes('input.')) {
      fixed = fixed.replace(/input(\w+)/g, 'input.$1');
    }

    return fixed;
  }

  /**
   * Add a dependency to a task in YAML
   */
  private addDependency(yaml: string, taskId: string, depToAdd: string): string {
    const lines = yaml.split('\n');
    const result: string[] = [];
    let inTask = false;
    let taskIndent = 0;
    let foundTask = false;
    let addedDep = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      result.push(line);

      // Check if we're entering the target task
      if (line.match(new RegExp(`id:\\s*${this.escapeRegex(taskId)}`))) {
        foundTask = true;
        inTask = true;
        taskIndent = line.search(/\S/);
      }

      // Check if we're leaving the task
      if (inTask && foundTask && i > 0) {
        const currentIndent = line.search(/\S/);
        if (currentIndent >= 0 && currentIndent <= taskIndent && !line.trim().startsWith('-')) {
          // We've left the task, check if we need to add dependsOn
          if (!addedDep) {
            // Insert dependsOn before this line
            result.splice(result.length - 1, 0, `${' '.repeat(taskIndent + 2)}dependsOn:`);
            result.splice(result.length - 1, 0, `${' '.repeat(taskIndent + 4)}- ${depToAdd}`);
            addedDep = true;
          }
          inTask = false;
        }
      }

      // Check if task already has dependsOn
      if (inTask && foundTask && line.includes('dependsOn:') && !addedDep) {
        // Find where to add the new dependency
        let j = i + 1;
        while (j < lines.length && lines[j].match(/^\s+-\s/)) {
          j++;
        }
        // Add the new dependency after existing ones
        const depIndent = lines[i + 1]?.search(/\S/) ?? taskIndent + 4;
        lines.splice(j, 0, `${' '.repeat(depIndent)}- ${depToAdd}`);
        addedDep = true;
      }
    }

    return result.join('\n');
  }

  /**
   * Escape special regex characters
   */
  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}
