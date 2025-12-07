/**
 * Error types that can be detected in workflows
 */
export type ErrorType = 'unknown_task_ref' | 'invalid_template' | 'circular_dependency' | 'schema_mismatch' | 'missing_dependency' | 'duplicate_task_id' | 'invalid_yaml' | 'missing_required_field';
/**
 * Generate a fix suggestion for a specific error type
 */
export declare const ERROR_FIXES: Record<ErrorType, (...args: string[]) => string>;
/**
 * Parse error messages to detect error type
 */
export declare function detectErrorType(message: string): ErrorType | null;
/**
 * Generate a suggestion for an error based on its message
 */
export declare function generateSuggestion(message: string, availableTasks?: string[]): string | undefined;
//# sourceMappingURL=error-fixing.d.ts.map