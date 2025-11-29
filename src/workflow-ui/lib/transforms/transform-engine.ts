/**
 * Transform Engine - Client-Side
 *
 * Executes Transform DSL pipeline client-side using lodash and jsonpath-plus.
 * Mirrors the backend TransformExecutor logic for consistency.
 *
 * Performance: Optimized for datasets < 5K records.
 * For larger datasets, use server-side execution via API.
 */

import { JSONPath } from 'jsonpath-plus';
import _ from 'lodash';
import type {
  TransformDslDefinition,
  TransformOperation,
  SelectOperation,
  FilterOperation,
  MapOperation,
  FlatMapOperation,
  GroupByOperation,
  JoinOperation,
  SortByOperation,
  EnrichOperation,
  AggregateOperation,
  LimitOperation,
  SkipOperation,
  Condition,
  Aggregation,
} from '../types/transform-dsl';

/**
 * Client-side Transform DSL execution engine
 */
export class TransformEngine {
  /**
   * Execute a Transform DSL pipeline against data
   *
   * @param dsl - The Transform DSL definition
   * @param data - Input data array
   * @returns Transformed data array
   */
  async execute(dsl: TransformDslDefinition, data: unknown[]): Promise<unknown[]> {
    let currentData = data;

    for (const operation of dsl.pipeline) {
      currentData = await this.executeOperation(operation, currentData);
    }

    return currentData;
  }

  /**
   * Execute a single transform operation
   *
   * @param operation - The operation to execute
   * @param data - Input data
   * @returns Transformed data
   */
  private async executeOperation(
    operation: TransformOperation,
    data: unknown[]
  ): Promise<unknown[]> {
    switch (operation.operation) {
      case 'select':
        return this.executeSelect(operation, data);
      case 'filter':
        return this.executeFilter(operation, data);
      case 'map':
        return this.executeMap(operation, data);
      case 'flatMap':
        return this.executeFlatMap(operation, data);
      case 'groupBy':
        return this.executeGroupBy(operation, data);
      case 'join':
        return this.executeJoin(operation, data);
      case 'sortBy':
        return this.executeSortBy(operation, data);
      case 'enrich':
        return this.executeEnrich(operation, data);
      case 'aggregate':
        return this.executeAggregate(operation, data);
      case 'limit':
        return this.executeLimit(operation, data);
      case 'skip':
        return this.executeSkip(operation, data);
      default:
        throw new Error(`Unsupported operation: ${(operation as TransformOperation).operation}`);
    }
  }

  /**
   * Select - Extract/project specific fields
   */
  private executeSelect(operation: SelectOperation, data: unknown[]): unknown[] {
    return data.map((item) => {
      const result: Record<string, unknown> = {};

      for (const [fieldName, jsonPath] of Object.entries(operation.fields)) {
        const value = JSONPath({ path: jsonPath, json: item as any, wrap: false });
        result[fieldName] = value;
      }

      return result;
    });
  }

  /**
   * Filter - Filter records by condition
   */
  private executeFilter(operation: FilterOperation, data: unknown[]): unknown[] {
    return data.filter((item) => {
      return this.evaluateCondition(operation.condition, item);
    });
  }

  /**
   * Evaluate a filter condition
   */
  private evaluateCondition(condition: Condition, item: unknown): boolean {
    const fieldValue = JSONPath({ path: condition.field, json: item as any, wrap: false });

    switch (condition.operator) {
      case 'eq':
        return fieldValue === condition.value;
      case 'ne':
        return fieldValue !== condition.value;
      case 'gt':
        return Number(fieldValue) > Number(condition.value);
      case 'lt':
        return Number(fieldValue) < Number(condition.value);
      case 'gte':
        return Number(fieldValue) >= Number(condition.value);
      case 'lte':
        return Number(fieldValue) <= Number(condition.value);
      case 'contains':
        return String(fieldValue).includes(String(condition.value));
      case 'startsWith':
        return String(fieldValue).startsWith(String(condition.value));
      case 'endsWith':
        return String(fieldValue).endsWith(String(condition.value));
      default:
        return false;
    }
  }

  /**
   * Map - Remap fields to new names
   */
  private executeMap(operation: MapOperation, data: unknown[]): unknown[] {
    return data.map((item) => {
      const result: Record<string, unknown> = {};

      for (const [newFieldName, jsonPath] of Object.entries(operation.mappings)) {
        const value = JSONPath({ path: jsonPath, json: item as any, wrap: false });
        result[newFieldName] = value;
      }

      return result;
    });
  }

  /**
   * FlatMap - Flatten nested arrays
   */
  private executeFlatMap(operation: FlatMapOperation, data: unknown[]): unknown[] {
    const results: unknown[] = [];

    for (const item of data) {
      const arrayValue = JSONPath({ path: operation.path, json: item as any, wrap: false });

      if (Array.isArray(arrayValue)) {
        results.push(...arrayValue);
      }
    }

    return results;
  }

  /**
   * GroupBy - Group and aggregate data
   */
  private executeGroupBy(operation: GroupByOperation, data: unknown[]): unknown[] {
    // Group by key
    const grouped = _.groupBy(data, (item) => {
      return JSONPath({ path: operation.key, json: item as any, wrap: false });
    });

    // Aggregate each group
    const results: unknown[] = [];

    for (const [groupKey, groupItems] of Object.entries(grouped)) {
      const result: Record<string, unknown> = {
        [this.extractFieldName(operation.key)]: groupKey,
      };

      for (const [resultField, aggregation] of Object.entries(operation.aggregations)) {
        result[resultField] = this.executeAggregation(aggregation, groupItems);
      }

      results.push(result);
    }

    return results;
  }

  /**
   * Execute aggregation function
   */
  private executeAggregation(aggregation: Aggregation, items: unknown[]): number {
    const values = items.map((item) => {
      const value = JSONPath({ path: aggregation.field, json: item as any, wrap: false });
      return Number(value) || 0;
    });

    switch (aggregation.function) {
      case 'sum':
        return _.sum(values);
      case 'avg':
        return values.length > 0 ? _.mean(values) : 0;
      case 'min':
        return values.length > 0 ? _.min(values)! : 0;
      case 'max':
        return values.length > 0 ? _.max(values)! : 0;
      case 'count':
        return items.length;
      default:
        return 0;
    }
  }

  /**
   * Extract field name from JSONPath (e.g., "$.customerId" => "customerId")
   */
  private extractFieldName(jsonPath: string): string {
    const parts = jsonPath.split('.');
    return parts[parts.length - 1];
  }

  /**
   * Join - Join two datasets
   */
  private executeJoin(operation: JoinOperation, data: unknown[]): unknown[] {
    const results: unknown[] = [];

    // Build lookup map for right data
    const rightLookup = new Map<string, unknown>();
    for (const rightItem of operation.rightData) {
      const rightKey = String(
        JSONPath({ path: operation.rightKey, json: rightItem as any, wrap: false })
      );
      rightLookup.set(rightKey, rightItem);
    }

    // Join logic
    for (const leftItem of data) {
      const leftKey = String(
        JSONPath({ path: operation.leftKey, json: leftItem as any, wrap: false })
      );
      const rightItem = rightLookup.get(leftKey);

      if (rightItem) {
        // Inner/Left join: merge objects
        results.push({ ...(leftItem as object), ...(rightItem as object) });
      } else if (operation.joinType === 'left') {
        // Left join: keep left item
        results.push(leftItem);
      }
    }

    return results;
  }

  /**
   * SortBy - Sort records
   */
  private executeSortBy(operation: SortByOperation, data: unknown[]): unknown[] {
    const sorted = _.orderBy(
      data,
      [(item) => JSONPath({ path: operation.field, json: item as any, wrap: false })],
      [operation.order]
    );

    return sorted;
  }

  /**
   * Enrich - Add computed fields
   */
  private executeEnrich(operation: EnrichOperation, data: unknown[]): unknown[] {
    return data.map((item) => {
      const enrichedFields: Record<string, unknown> = {};

      for (const [newFieldName, jsonPath] of Object.entries(operation.fields)) {
        const value = JSONPath({ path: jsonPath, json: item as any, wrap: false });
        enrichedFields[newFieldName] = value;
      }

      return { ...(item as object), ...enrichedFields };
    });
  }

  /**
   * Aggregate - Aggregate entire dataset
   */
  private executeAggregate(operation: AggregateOperation, data: unknown[]): unknown[] {
    const result: Record<string, unknown> = {};

    for (const [resultField, aggregation] of Object.entries(operation.aggregations)) {
      result[resultField] = this.executeAggregation(aggregation, data);
    }

    return [result];
  }

  /**
   * Limit - Take first N records
   */
  private executeLimit(operation: LimitOperation, data: unknown[]): unknown[] {
    return data.slice(0, operation.count);
  }

  /**
   * Skip - Skip first N records
   */
  private executeSkip(operation: SkipOperation, data: unknown[]): unknown[] {
    return data.slice(operation.count);
  }
}
