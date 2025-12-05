import { ValidationResult } from '@workflow/types';
/**
 * Schema-based validator using JSON Schemas
 * Uses Ajv to validate workflow and task resources against their schemas
 */
export declare class SchemaValidator {
    private ajv;
    private validators;
    constructor();
    /**
     * Register a JSON Schema for validation
     * @param schemaId Unique identifier for the schema
     * @param schema JSON Schema object
     */
    registerSchema(schemaId: string, schema: any): void;
    /**
     * Validate data against a registered schema
     * @param schemaId Schema identifier
     * @param data Data to validate
     * @returns ValidationResult with errors if validation fails
     */
    validate(schemaId: string, data: any): ValidationResult;
    /**
     * Format Ajv errors into ValidationError format
     * @param ajvErrors Array of Ajv error objects
     * @returns Array of ValidationError objects
     */
    private formatErrors;
    /**
     * Load schemas from JSON files
     * @param schemas Map of schema IDs to schema objects
     */
    loadSchemas(schemas: Record<string, any>): void;
}
//# sourceMappingURL=schemaValidator.d.ts.map