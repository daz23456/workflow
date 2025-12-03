import type { JSONSchema, PropertyDefinition } from '@/types/workflow';

export type FormFieldType = 'string' | 'number' | 'boolean' | 'select';

export interface FormFieldValidation {
  pattern?: string;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
}

export interface FormField {
  name: string;
  type: FormFieldType;
  label: string;
  description?: string;
  required: boolean;
  validation?: FormFieldValidation;
  options?: Array<string | number | boolean>;
  defaultValue?: unknown;
  placeholder?: string;
}

/**
 * Builds form field configurations from a JSON Schema definition.
 *
 * Converts JSON Schema property definitions into React Hook Form-compatible
 * field configurations with validation rules, labels, and metadata.
 *
 * @param schema - JSON Schema definition for the form
 * @returns Array of form field configurations
 *
 * @example
 * ```typescript
 * const schema = {
 *   type: 'object',
 *   properties: {
 *     email: {
 *       type: 'string',
 *       pattern: '^[a-z]+@[a-z]+\\.com$',
 *       description: 'User email address'
 *     },
 *     age: {
 *       type: 'integer',
 *       minimum: 18,
 *       maximum: 100
 *     }
 *   },
 *   required: ['email']
 * };
 *
 * const fields = buildFormFields(schema);
 * // [
 * //   {
 * //     name: 'email',
 * //     type: 'string',
 * //     label: 'Email',
 * //     required: true,
 * //     validation: { pattern: '^[a-z]+@[a-z]+\\.com$' },
 * //     ...
 * //   },
 * //   { name: 'age', type: 'number', label: 'Age', ... }
 * // ]
 * ```
 */
export function buildFormFields(schema: JSONSchema | null | undefined): FormField[] {
  if (!schema || !schema.properties) {
    return [];
  }

  const requiredFields = new Set(schema.required || []);
  const fields: FormField[] = [];

  for (const [propertyName, propertyDef] of Object.entries(schema.properties)) {
    const field = buildFormField(propertyName, propertyDef, requiredFields.has(propertyName));

    // Skip unsupported types (object, array)
    if (field) {
      fields.push(field);
    }
  }

  return fields;
}

/**
 * Builds a single form field from a property definition.
 */
function buildFormField(
  propertyName: string,
  propertyDef: PropertyDefinition,
  isRequired: boolean
): FormField | null {
  // Determine field type
  const fieldType = getFieldType(propertyDef);

  // Skip unsupported types
  if (!fieldType) {
    return null;
  }

  // Build base field
  const field: FormField = {
    name: propertyName,
    type: fieldType,
    label: generateLabel(propertyName),
    required: isRequired,
  };

  // Add description
  if (propertyDef.description) {
    field.description = propertyDef.description;
  }

  // Add validation rules
  const validation = extractValidation(propertyDef);
  if (validation && Object.keys(validation).length > 0) {
    field.validation = validation;
  }

  // Add options for select fields
  if (fieldType === 'select' && propertyDef.enum) {
    field.options = propertyDef.enum;
  }

  // Add default value
  if ('default' in propertyDef) {
    field.defaultValue = propertyDef.default;
  } else if (fieldType === 'boolean') {
    field.defaultValue = false;
  }

  // Add placeholder
  field.placeholder = generatePlaceholder(propertyName, propertyDef, fieldType);

  return field;
}

/**
 * Maps JSON Schema type to form field type.
 */
function getFieldType(propertyDef: PropertyDefinition): FormFieldType | null {
  // Enum becomes a select field
  if (propertyDef.enum && propertyDef.enum.length > 0) {
    return 'select';
  }

  // Map schema types to form types
  switch (propertyDef.type) {
    case 'string':
      return 'string';
    case 'integer':
    case 'number':
      return 'number';
    case 'boolean':
      return 'boolean';
    case 'object':
    case 'array':
      // Not supported yet
      return null;
    default:
      return null;
  }
}

/**
 * Extracts validation rules from property definition.
 */
function extractValidation(propertyDef: PropertyDefinition): FormFieldValidation {
  const validation: FormFieldValidation = {};

  // String validations
  if (propertyDef.pattern) {
    validation.pattern = propertyDef.pattern;
  }
  if (propertyDef.minLength !== undefined) {
    validation.minLength = propertyDef.minLength;
  }
  if (propertyDef.maxLength !== undefined) {
    validation.maxLength = propertyDef.maxLength;
  }

  // Number validations
  if (propertyDef.minimum !== undefined) {
    validation.min = propertyDef.minimum;
  }
  if (propertyDef.maximum !== undefined) {
    validation.max = propertyDef.maximum;
  }

  return validation;
}

/**
 * Generates a human-readable label from a property name.
 *
 * Handles camelCase, snake_case, and kebab-case.
 *
 * @example
 * generateLabel('firstName') // 'First Name'
 * generateLabel('first_name') // 'First Name'
 * generateLabel('first-name') // 'First Name'
 */
function generateLabel(propertyName: string): string {
  // Replace separators with spaces
  let label = propertyName
    .replace(/([a-z])([A-Z])/g, '$1 $2') // camelCase
    .replace(/[_-]/g, ' '); // snake_case and kebab-case

  // Capitalize first letter of each word
  label = label
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  return label;
}

/**
 * Generates placeholder text for a form field.
 */
function generatePlaceholder(
  propertyName: string,
  propertyDef: PropertyDefinition,
  fieldType: FormFieldType
): string {
  // Use description as placeholder if available
  if (propertyDef.description) {
    return propertyDef.description;
  }

  // Generate default placeholder based on field type
  if (fieldType === 'select') {
    return `Select ${generateLabel(propertyName).toLowerCase()}`;
  }

  return `Enter ${generateLabel(propertyName).toLowerCase()}`;
}
