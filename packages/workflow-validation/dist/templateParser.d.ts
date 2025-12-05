import { TemplateParseResult } from '@workflow/types';
/**
 * Template parser for workflow expressions
 * Simple regex-based parser for {{...}} template syntax
 */
export declare class TemplateParser {
    private static readonly TEMPLATE_REGEX;
    /**
     * Parse template string and extract expressions
     * @param template Template string (e.g., "{{input.userId}}")
     * @returns TemplateParseResult with extracted expressions or errors
     */
    parse(template: string): TemplateParseResult;
    /**
     * Parse individual expression (e.g., "input.userId" or "tasks.fetch-user.output.data")
     * @param expression Expression string without braces
     * @param raw Original expression with braces
     * @returns Parsed TemplateExpression
     * @throws Error if expression is invalid
     */
    private parseExpression;
}
//# sourceMappingURL=templateParser.d.ts.map