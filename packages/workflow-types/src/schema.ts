/**
 * JSON Schema definition for workflow input/output validation
 */
export interface SchemaDefinition {
  type: string;
  properties: Record<string, PropertyDefinition>;
  required?: string[];
  description?: string;
}

/**
 * Property definition within a schema
 */
export interface PropertyDefinition {
  type: string;
  description?: string;
  format?: string;
  properties?: Record<string, PropertyDefinition>;
  items?: PropertyDefinition;
  enum?: string[];
  minimum?: number;
  maximum?: number;
  pattern?: string;
  required?: string[];
}
