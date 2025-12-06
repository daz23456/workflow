/**
 * Validate Command
 * Validates workflow YAML files locally
 */
/**
 * A single validation check result
 */
export interface ValidationCheck {
    name: string;
    passed: boolean;
    skipped: boolean;
    message?: string;
    errors?: string[];
}
/**
 * Complete validation result
 */
export interface ValidationResult {
    valid: boolean;
    workflowName: string;
    errors: string[];
    warnings: string[];
    checks: ValidationCheck[];
}
/**
 * Options for validateWorkflow
 */
export interface ValidateOptions {
    tasksPath?: string;
}
/**
 * Validate a workflow YAML file
 */
export declare function validateWorkflow(workflowPath: string, options?: ValidateOptions): Promise<ValidationResult>;
//# sourceMappingURL=validate.d.ts.map