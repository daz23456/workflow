import { TemplateParseResult, TemplateExpression } from '@workflow/types';

/**
 * Template parser for workflow expressions
 * Simple regex-based parser for {{...}} template syntax
 */
export class TemplateParser {
  private static readonly TEMPLATE_REGEX = /\{\{([^}]+)\}\}/g;

  /**
   * Parse template string and extract expressions
   * @param template Template string (e.g., "{{input.userId}}")
   * @returns TemplateParseResult with extracted expressions or errors
   */
  parse(template: string): TemplateParseResult {
    const expressions: TemplateExpression[] = [];
    const errors: string[] = [];

    // Check for incomplete template syntax
    if (template.includes('{{') && !template.includes('}}')) {
      errors.push('Invalid template syntax: Missing closing braces');
      return {
        isValid: false,
        expressions,
        errors
      };
    }

    // Extract all template expressions
    const matches = template.matchAll(TemplateParser.TEMPLATE_REGEX);

    for (const match of matches) {
      const expression = match[1].trim();

      try {
        const parsed = this.parseExpression(expression, match[0]);
        expressions.push(parsed);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        errors.push(`Invalid template syntax: ${message}`);
      }
    }

    return {
      isValid: errors.length === 0,
      expressions,
      errors
    };
  }

  /**
   * Parse individual expression (e.g., "input.userId" or "tasks.fetch-user.output.data")
   * @param expression Expression string without braces
   * @param raw Original expression with braces
   * @returns Parsed TemplateExpression
   * @throws Error if expression is invalid
   */
  private parseExpression(expression: string, raw: string): TemplateExpression {
    const parts = expression.split('.');

    if (parts.length < 2) {
      throw new Error(`Invalid expression: ${expression}`);
    }

    // Input reference: {{input.fieldName}}
    if (parts[0] === 'input') {
      return {
        raw,
        type: 'input',
        path: parts.slice(1).join('.')
      };
    }

    // Task output reference: {{tasks.taskId.output.fieldName}}
    if (parts[0] === 'tasks' && parts.length >= 3 && parts[2] === 'output') {
      return {
        raw,
        type: 'task-output',
        taskId: parts[1],
        path: parts.length > 3 ? parts.slice(3).join('.') : ''
      };
    }

    throw new Error(`Unknown expression type: ${expression}`);
  }
}
