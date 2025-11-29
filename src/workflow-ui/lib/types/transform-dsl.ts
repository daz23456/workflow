/**
 * Transform DSL Types - TypeScript
 *
 * Mirrors the backend C# models from WorkflowCore/Models/TransformDsl.cs
 * Ensures type-safe transform pipeline definitions in the frontend.
 */

/**
 * Main Transform DSL definition
 */
export interface TransformDslDefinition {
  version: string;
  pipeline: TransformOperation[];
}

/**
 * Base type for all transform operations
 * Discriminated union using "operation" field
 */
export type TransformOperation =
  | SelectOperation
  | FilterOperation
  | MapOperation
  | FlatMapOperation
  | GroupByOperation
  | JoinOperation
  | SortByOperation
  | EnrichOperation
  | AggregateOperation
  | LimitOperation
  | SkipOperation;

/**
 * Select - Extract/project specific fields
 */
export interface SelectOperation {
  operation: 'select';
  fields: Record<string, string>; // fieldName => JSONPath
}

/**
 * Filter - Filter records by condition
 */
export interface FilterOperation {
  operation: 'filter';
  condition: Condition;
}

/**
 * Map - Remap fields to new names
 */
export interface MapOperation {
  operation: 'map';
  mappings: Record<string, string>; // newFieldName => JSONPath
}

/**
 * FlatMap - Flatten nested arrays
 */
export interface FlatMapOperation {
  operation: 'flatMap';
  path: string; // JSONPath to array field
}

/**
 * GroupBy - Group and aggregate data
 */
export interface GroupByOperation {
  operation: 'groupBy';
  key: string; // JSONPath to grouping field
  aggregations: Record<string, Aggregation>; // resultField => aggregation
}

/**
 * Join - Join two datasets
 */
export interface JoinOperation {
  operation: 'join';
  leftKey: string; // JSONPath to left key field
  rightKey: string; // JSONPath to right key field
  rightData: unknown[]; // Right dataset
  joinType: 'inner' | 'left' | 'right' | 'outer';
}

/**
 * SortBy - Sort records
 */
export interface SortByOperation {
  operation: 'sortBy';
  field: string; // JSONPath to sort field
  order: 'asc' | 'desc';
}

/**
 * Enrich - Add computed fields
 */
export interface EnrichOperation {
  operation: 'enrich';
  fields: Record<string, string>; // newField => JSONPath or expression
}

/**
 * Aggregate - Aggregate entire dataset
 */
export interface AggregateOperation {
  operation: 'aggregate';
  aggregations: Record<string, Aggregation>; // resultField => aggregation
}

/**
 * Limit - Take first N records
 */
export interface LimitOperation {
  operation: 'limit';
  count: number;
}

/**
 * Skip - Skip first N records
 */
export interface SkipOperation {
  operation: 'skip';
  count: number;
}

/**
 * Condition for filtering
 */
export interface Condition {
  field: string; // JSONPath to field
  operator: 'eq' | 'ne' | 'gt' | 'lt' | 'gte' | 'lte' | 'contains' | 'startsWith' | 'endsWith';
  value: unknown;
}

/**
 * Aggregation function
 */
export interface Aggregation {
  function: 'sum' | 'avg' | 'min' | 'max' | 'count';
  field: string; // JSONPath to field
}
