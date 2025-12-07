/**
 * Result of validation operation
 */
export interface ValidationResult {
    isValid: boolean;
    errors: ValidationError[];
}
/**
 * Validation error with context
 */
export interface ValidationError {
    message: string;
    taskId?: string;
    field?: string;
    path?: string;
    suggestedFix?: string;
}
/**
 * Template expression result from parsing
 */
export interface TemplateParseResult {
    isValid: boolean;
    expressions: TemplateExpression[];
    errors: string[];
}
/**
 * Parsed template expression (e.g., {{input.x}} or {{tasks.y.output.z}})
 */
export interface TemplateExpression {
    raw: string;
    type: 'input' | 'task-output';
    path: string;
    taskId?: string;
}
/**
 * Type compatibility check result
 */
export interface CompatibilityResult {
    isCompatible: boolean;
    errors: string[];
}
//# sourceMappingURL=validation.d.ts.map