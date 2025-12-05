import Ajv, { ValidateFunction, ErrorObject } from 'ajv';
import { ValidationResult, ValidationError } from '@workflow/types';

/**
 * Schema-based validator using JSON Schemas
 * Uses Ajv to validate workflow and task resources against their schemas
 */
export class SchemaValidator {
  private ajv: Ajv;
  private validators: Map<string, ValidateFunction> = new Map();

  constructor() {
    this.ajv = new Ajv({
      strict: false,
      allErrors: true,
      verbose: true
    });
  }

  /**
   * Register a JSON Schema for validation
   * @param schemaId Unique identifier for the schema
   * @param schema JSON Schema object
   */
  registerSchema(schemaId: string, schema: any): void {
    this.ajv.addSchema(schema, schemaId);
    const validate = this.ajv.getSchema(schemaId);
    if (validate) {
      this.validators.set(schemaId, validate);
    }
  }

  /**
   * Validate data against a registered schema
   * @param schemaId Schema identifier
   * @param data Data to validate
   * @returns ValidationResult with errors if validation fails
   */
  validate(schemaId: string, data: any): ValidationResult {
    const validate = this.validators.get(schemaId);

    if (!validate) {
      return {
        isValid: false,
        errors: [{
          message: `Schema not found: ${schemaId}`,
          path: ''
        }]
      };
    }

    const isValid = validate(data);

    if (isValid) {
      return {
        isValid: true,
        errors: []
      };
    }

    const errors = this.formatErrors(validate.errors || []);

    return {
      isValid: false,
      errors
    };
  }

  /**
   * Format Ajv errors into ValidationError format
   * @param ajvErrors Array of Ajv error objects
   * @returns Array of ValidationError objects
   */
  private formatErrors(ajvErrors: ErrorObject[]): ValidationError[] {
    return ajvErrors.map(err => {
      let message = err.message || 'Validation failed';
      const path = err.instancePath || '';

      // Add contextual information based on error type
      if (err.keyword === 'required') {
        const missingProp = (err.params as any).missingProperty;
        message = `Missing required property: ${missingProp}`;
      } else if (err.keyword === 'type') {
        const expectedType = (err.params as any).type;
        message = `Invalid type: expected ${expectedType}`;
      } else if (err.keyword === 'enum') {
        const allowedValues = (err.params as any).allowedValues;
        message = `Invalid value: must be one of ${allowedValues.join(', ')}`;
      } else if (err.keyword === 'additionalProperties') {
        const additionalProp = (err.params as any).additionalProperty;
        message = `Additional property not allowed: ${additionalProp}`;
      }

      return {
        message,
        path,
        field: path.split('/').pop()
      };
    });
  }

  /**
   * Load schemas from JSON files
   * @param schemas Map of schema IDs to schema objects
   */
  loadSchemas(schemas: Record<string, any>): void {
    for (const [id, schema] of Object.entries(schemas)) {
      this.registerSchema(id, schema);
    }
  }
}
