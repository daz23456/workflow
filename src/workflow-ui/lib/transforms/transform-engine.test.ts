/**
 * Transform Engine Tests - Client-Side
 *
 * Tests client-side execution of Transform DSL using lodash and jsonpath-plus.
 * Each operation type must have comprehensive test coverage.
 */

import { describe, it, expect } from 'vitest';
import { TransformEngine } from './transform-engine';
import type {
  TransformDslDefinition,
  SelectOperation,
  FilterOperation,
  MapOperation,
  FlatMapOperation,
  GroupByOperation,
  JoinOperation,
  SortByOperation,
  LimitOperation,
  SkipOperation,
  EnrichOperation,
  AggregateOperation,
} from '../types/transform-dsl';

describe('TransformEngine', () => {
  const engine = new TransformEngine();

  describe('SelectOperation', () => {
    it('should extract selected fields from records', async () => {
      const data = [
        { name: 'Alice', age: 30, city: 'NYC' },
        { name: 'Bob', age: 25, city: 'SF' },
      ];

      const dsl: TransformDslDefinition = {
        version: '1.0',
        pipeline: [
          {
            operation: 'select',
            fields: {
              name: '$.name',
              age: '$.age',
            },
          } as SelectOperation,
        ],
      };

      const result = await engine.execute(dsl, data);

      expect(result).toEqual([
        { name: 'Alice', age: 30 },
        { name: 'Bob', age: 25 },
      ]);
    });

    it('should handle nested field extraction', async () => {
      const data = [{ user: { profile: { name: 'Alice', email: 'alice@example.com' } } }];

      const dsl: TransformDslDefinition = {
        version: '1.0',
        pipeline: [
          {
            operation: 'select',
            fields: {
              name: '$.user.profile.name',
              email: '$.user.profile.email',
            },
          } as SelectOperation,
        ],
      };

      const result = await engine.execute(dsl, data);

      expect(result).toEqual([{ name: 'Alice', email: 'alice@example.com' }]);
    });
  });

  describe('FilterOperation', () => {
    it('should filter records with eq operator', async () => {
      const data = [
        { name: 'Alice', status: 'active' },
        { name: 'Bob', status: 'inactive' },
        { name: 'Charlie', status: 'active' },
      ];

      const dsl: TransformDslDefinition = {
        version: '1.0',
        pipeline: [
          {
            operation: 'filter',
            condition: {
              field: '$.status',
              operator: 'eq',
              value: 'active',
            },
          } as FilterOperation,
        ],
      };

      const result = await engine.execute(dsl, data);

      expect(result).toHaveLength(2);
      expect(result).toEqual([
        { name: 'Alice', status: 'active' },
        { name: 'Charlie', status: 'active' },
      ]);
    });

    it('should filter with gt operator', async () => {
      const data = [
        { name: 'Alice', age: 30 },
        { name: 'Bob', age: 20 },
        { name: 'Charlie', age: 35 },
      ];

      const dsl: TransformDslDefinition = {
        version: '1.0',
        pipeline: [
          {
            operation: 'filter',
            condition: {
              field: '$.age',
              operator: 'gt',
              value: 25,
            },
          } as FilterOperation,
        ],
      };

      const result = await engine.execute(dsl, data);

      expect(result).toHaveLength(2);
      expect((result[0] as any).name).toBe('Alice');
      expect((result[1] as any).name).toBe('Charlie');
    });

    it('should filter with contains operator', async () => {
      const data = [
        { name: 'Alice Johnson', role: 'engineer' },
        { name: 'Bob Smith', role: 'designer' },
      ];

      const dsl: TransformDslDefinition = {
        version: '1.0',
        pipeline: [
          {
            operation: 'filter',
            condition: {
              field: '$.name',
              operator: 'contains',
              value: 'Johnson',
            },
          } as FilterOperation,
        ],
      };

      const result = await engine.execute(dsl, data);

      expect(result).toHaveLength(1);
      expect((result[0] as any).name).toBe('Alice Johnson');
    });
  });

  describe('MapOperation', () => {
    it('should remap fields to new names', async () => {
      const data = [{ firstName: 'Alice', lastName: 'Smith' }];

      const dsl: TransformDslDefinition = {
        version: '1.0',
        pipeline: [
          {
            operation: 'map',
            mappings: {
              name: '$.firstName',
              surname: '$.lastName',
            },
          } as MapOperation,
        ],
      };

      const result = await engine.execute(dsl, data);

      expect(result).toEqual([{ name: 'Alice', surname: 'Smith' }]);
    });
  });

  describe('FlatMapOperation', () => {
    it('should flatten nested arrays', async () => {
      const data = [
        {
          orderId: '1',
          items: [
            { product: 'A', qty: 2 },
            { product: 'B', qty: 1 },
          ],
        },
        {
          orderId: '2',
          items: [{ product: 'C', qty: 3 }],
        },
      ];

      const dsl: TransformDslDefinition = {
        version: '1.0',
        pipeline: [
          {
            operation: 'flatMap',
            path: '$.items',
          } as FlatMapOperation,
        ],
      };

      const result = await engine.execute(dsl, data);

      expect(result).toHaveLength(3);
      expect(result).toEqual([
        { product: 'A', qty: 2 },
        { product: 'B', qty: 1 },
        { product: 'C', qty: 3 },
      ]);
    });
  });

  describe('GroupByOperation', () => {
    it('should group by key and aggregate', async () => {
      const data = [
        { customerId: 'c1', orderTotal: 100 },
        { customerId: 'c2', orderTotal: 200 },
        { customerId: 'c1', orderTotal: 150 },
      ];

      const dsl: TransformDslDefinition = {
        version: '1.0',
        pipeline: [
          {
            operation: 'groupBy',
            key: '$.customerId',
            aggregations: {
              totalSpent: {
                function: 'sum',
                field: '$.orderTotal',
              },
              orderCount: {
                function: 'count',
                field: '$.customerId',
              },
            },
          } as GroupByOperation,
        ],
      };

      const result = await engine.execute(dsl, data);

      expect(result).toHaveLength(2);

      const c1 = result.find((r: any) => r.customerId === 'c1');
      expect(c1).toMatchObject({
        customerId: 'c1',
        totalSpent: 250,
        orderCount: 2,
      });

      const c2 = result.find((r: any) => r.customerId === 'c2');
      expect(c2).toMatchObject({
        customerId: 'c2',
        totalSpent: 200,
        orderCount: 1,
      });
    });

    it('should handle average aggregation', async () => {
      const data = [
        { category: 'A', value: 10 },
        { category: 'A', value: 20 },
        { category: 'B', value: 30 },
      ];

      const dsl: TransformDslDefinition = {
        version: '1.0',
        pipeline: [
          {
            operation: 'groupBy',
            key: '$.category',
            aggregations: {
              avgValue: {
                function: 'avg',
                field: '$.value',
              },
            },
          } as GroupByOperation,
        ],
      };

      const result = await engine.execute(dsl, data);

      const categoryA = result.find((r: any) => r.category === 'A');
      expect((categoryA as any)?.avgValue).toBe(15);
    });
  });

  describe('SortByOperation', () => {
    it('should sort ascending', async () => {
      const data = [
        { name: 'Charlie', age: 30 },
        { name: 'Alice', age: 25 },
        { name: 'Bob', age: 35 },
      ];

      const dsl: TransformDslDefinition = {
        version: '1.0',
        pipeline: [
          {
            operation: 'sortBy',
            field: '$.age',
            order: 'asc',
          } as SortByOperation,
        ],
      };

      const result = await engine.execute(dsl, data);

      expect((result[0] as any).age).toBe(25);
      expect((result[1] as any).age).toBe(30);
      expect((result[2] as any).age).toBe(35);
    });

    it('should sort descending', async () => {
      const data = [
        { name: 'Alice', score: 100 },
        { name: 'Bob', score: 200 },
        { name: 'Charlie', score: 150 },
      ];

      const dsl: TransformDslDefinition = {
        version: '1.0',
        pipeline: [
          {
            operation: 'sortBy',
            field: '$.score',
            order: 'desc',
          } as SortByOperation,
        ],
      };

      const result = await engine.execute(dsl, data);

      expect((result[0] as any).score).toBe(200);
      expect((result[1] as any).score).toBe(150);
      expect((result[2] as any).score).toBe(100);
    });
  });

  describe('LimitOperation', () => {
    it('should limit to N records', async () => {
      const data = [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }, { id: 5 }];

      const dsl: TransformDslDefinition = {
        version: '1.0',
        pipeline: [
          {
            operation: 'limit',
            count: 3,
          } as LimitOperation,
        ],
      };

      const result = await engine.execute(dsl, data);

      expect(result).toHaveLength(3);
      expect(result.map((r: any) => r.id)).toEqual([1, 2, 3]);
    });
  });

  describe('SkipOperation', () => {
    it('should skip first N records', async () => {
      const data = [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }, { id: 5 }];

      const dsl: TransformDslDefinition = {
        version: '1.0',
        pipeline: [
          {
            operation: 'skip',
            count: 2,
          } as SkipOperation,
        ],
      };

      const result = await engine.execute(dsl, data);

      expect(result).toHaveLength(3);
      expect(result.map((r: any) => r.id)).toEqual([3, 4, 5]);
    });
  });

  describe('EnrichOperation', () => {
    it('should add computed fields', async () => {
      const data = [{ firstName: 'Alice', lastName: 'Smith', age: 30 }];

      const dsl: TransformDslDefinition = {
        version: '1.0',
        pipeline: [
          {
            operation: 'enrich',
            fields: {
              name: '$.firstName',
              surname: '$.lastName',
            },
          } as EnrichOperation,
        ],
      };

      const result = await engine.execute(dsl, data);

      expect(result[0]).toMatchObject({
        firstName: 'Alice',
        lastName: 'Smith',
        age: 30,
        name: 'Alice',
        surname: 'Smith',
      });
    });
  });

  describe('AggregateOperation', () => {
    it('should aggregate entire dataset', async () => {
      const data = [{ amount: 100 }, { amount: 200 }, { amount: 150 }];

      const dsl: TransformDslDefinition = {
        version: '1.0',
        pipeline: [
          {
            operation: 'aggregate',
            aggregations: {
              total: {
                function: 'sum',
                field: '$.amount',
              },
              average: {
                function: 'avg',
                field: '$.amount',
              },
              count: {
                function: 'count',
                field: '$.amount',
              },
            },
          } as AggregateOperation,
        ],
      };

      const result = await engine.execute(dsl, data);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        total: 450,
        average: 150,
        count: 3,
      });
    });
  });

  describe('Multi-operation Pipeline', () => {
    it('should execute multiple operations in sequence', async () => {
      const data = [
        { name: 'Alice', age: 30, status: 'active' },
        { name: 'Bob', age: 25, status: 'inactive' },
        { name: 'Charlie', age: 35, status: 'active' },
      ];

      const dsl: TransformDslDefinition = {
        version: '1.0',
        pipeline: [
          {
            operation: 'filter',
            condition: {
              field: '$.status',
              operator: 'eq',
              value: 'active',
            },
          } as FilterOperation,
          {
            operation: 'select',
            fields: {
              name: '$.name',
              age: '$.age',
            },
          } as SelectOperation,
          {
            operation: 'sortBy',
            field: '$.age',
            order: 'asc',
          } as SortByOperation,
        ],
      };

      const result = await engine.execute(dsl, data);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ name: 'Alice', age: 30 });
      expect(result[1]).toEqual({ name: 'Charlie', age: 35 });
    });
  });

  describe('FilterOperation - Additional Operators', () => {
    it('should filter with ne (not equal) operator', async () => {
      const data = [{ status: 'active' }, { status: 'inactive' }, { status: 'pending' }];

      const dsl: TransformDslDefinition = {
        version: '1.0',
        pipeline: [
          {
            operation: 'filter',
            condition: {
              field: '$.status',
              operator: 'ne',
              value: 'inactive',
            },
          } as FilterOperation,
        ],
      };

      const result = await engine.execute(dsl, data);

      expect(result).toHaveLength(2);
      expect(result.map((r: any) => r.status)).toEqual(['active', 'pending']);
    });

    it('should filter with gte operator', async () => {
      const data = [{ score: 50 }, { score: 75 }, { score: 100 }];

      const dsl: TransformDslDefinition = {
        version: '1.0',
        pipeline: [
          {
            operation: 'filter',
            condition: {
              field: '$.score',
              operator: 'gte',
              value: 75,
            },
          } as FilterOperation,
        ],
      };

      const result = await engine.execute(dsl, data);

      expect(result).toHaveLength(2);
      expect(result.map((r: any) => r.score)).toEqual([75, 100]);
    });

    it('should filter with lte operator', async () => {
      const data = [{ price: 10 }, { price: 20 }, { price: 30 }];

      const dsl: TransformDslDefinition = {
        version: '1.0',
        pipeline: [
          {
            operation: 'filter',
            condition: {
              field: '$.price',
              operator: 'lte',
              value: 20,
            },
          } as FilterOperation,
        ],
      };

      const result = await engine.execute(dsl, data);

      expect(result).toHaveLength(2);
      expect(result.map((r: any) => r.price)).toEqual([10, 20]);
    });

    it('should filter with startsWith operator', async () => {
      const data = [
        { email: 'alice@example.com' },
        { email: 'bob@test.com' },
        { email: 'alice.smith@example.com' },
      ];

      const dsl: TransformDslDefinition = {
        version: '1.0',
        pipeline: [
          {
            operation: 'filter',
            condition: {
              field: '$.email',
              operator: 'startsWith',
              value: 'alice',
            },
          } as FilterOperation,
        ],
      };

      const result = await engine.execute(dsl, data);

      expect(result).toHaveLength(2);
    });

    it('should filter with endsWith operator', async () => {
      const data = [
        { filename: 'document.pdf' },
        { filename: 'image.png' },
        { filename: 'report.pdf' },
      ];

      const dsl: TransformDslDefinition = {
        version: '1.0',
        pipeline: [
          {
            operation: 'filter',
            condition: {
              field: '$.filename',
              operator: 'endsWith',
              value: '.pdf',
            },
          } as FilterOperation,
        ],
      };

      const result = await engine.execute(dsl, data);

      expect(result).toHaveLength(2);
      expect(result.map((r: any) => r.filename)).toEqual(['document.pdf', 'report.pdf']);
    });

    it('should filter with lt operator', async () => {
      const data = [{ age: 18 }, { age: 25 }, { age: 30 }];

      const dsl: TransformDslDefinition = {
        version: '1.0',
        pipeline: [
          {
            operation: 'filter',
            condition: {
              field: '$.age',
              operator: 'lt',
              value: 25,
            },
          } as FilterOperation,
        ],
      };

      const result = await engine.execute(dsl, data);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({ age: 18 });
    });
  });

  describe('GroupByOperation - Additional Aggregations', () => {
    it('should handle min aggregation', async () => {
      const data = [
        { category: 'A', value: 10 },
        { category: 'A', value: 5 },
        { category: 'B', value: 20 },
      ];

      const dsl: TransformDslDefinition = {
        version: '1.0',
        pipeline: [
          {
            operation: 'groupBy',
            key: '$.category',
            aggregations: {
              minValue: {
                function: 'min',
                field: '$.value',
              },
            },
          } as GroupByOperation,
        ],
      };

      const result = await engine.execute(dsl, data);

      const categoryA = result.find((r: any) => r.category === 'A');
      expect((categoryA as any)?.minValue).toBe(5);
    });

    it('should handle max aggregation', async () => {
      const data = [
        { category: 'A', value: 10 },
        { category: 'A', value: 25 },
        { category: 'B', value: 15 },
      ];

      const dsl: TransformDslDefinition = {
        version: '1.0',
        pipeline: [
          {
            operation: 'groupBy',
            key: '$.category',
            aggregations: {
              maxValue: {
                function: 'max',
                field: '$.value',
              },
            },
          } as GroupByOperation,
        ],
      };

      const result = await engine.execute(dsl, data);

      const categoryA = result.find((r: any) => r.category === 'A');
      expect((categoryA as any)?.maxValue).toBe(25);
    });

    it('should handle multiple aggregations on same field', async () => {
      const data = [
        { region: 'East', sales: 100 },
        { region: 'East', sales: 200 },
        { region: 'West', sales: 150 },
      ];

      const dsl: TransformDslDefinition = {
        version: '1.0',
        pipeline: [
          {
            operation: 'groupBy',
            key: '$.region',
            aggregations: {
              totalSales: {
                function: 'sum',
                field: '$.sales',
              },
              avgSales: {
                function: 'avg',
                field: '$.sales',
              },
              maxSales: {
                function: 'max',
                field: '$.sales',
              },
              salesCount: {
                function: 'count',
                field: '$.sales',
              },
            },
          } as GroupByOperation,
        ],
      };

      const result = await engine.execute(dsl, data);

      const east = result.find((r: any) => r.region === 'East');
      expect(east).toMatchObject({
        region: 'East',
        totalSales: 300,
        avgSales: 150,
        maxSales: 200,
        salesCount: 2,
      });
    });
  });

  describe('AggregateOperation - Additional Functions', () => {
    it('should handle min aggregation on entire dataset', async () => {
      const data = [{ value: 10 }, { value: 5 }, { value: 20 }];

      const dsl: TransformDslDefinition = {
        version: '1.0',
        pipeline: [
          {
            operation: 'aggregate',
            aggregations: {
              min: {
                function: 'min',
                field: '$.value',
              },
            },
          } as AggregateOperation,
        ],
      };

      const result = await engine.execute(dsl, data);

      expect(result[0]).toMatchObject({ min: 5 });
    });

    it('should handle max aggregation on entire dataset', async () => {
      const data = [{ value: 10 }, { value: 25 }, { value: 15 }];

      const dsl: TransformDslDefinition = {
        version: '1.0',
        pipeline: [
          {
            operation: 'aggregate',
            aggregations: {
              max: {
                function: 'max',
                field: '$.value',
              },
            },
          } as AggregateOperation,
        ],
      };

      const result = await engine.execute(dsl, data);

      expect(result[0]).toMatchObject({ max: 25 });
    });
  });

  describe('JoinOperation - Additional Scenarios', () => {
    it('should handle inner join correctly', async () => {
      const leftData = [
        { userId: '1', name: 'Alice' },
        { userId: '2', name: 'Bob' },
        { userId: '3', name: 'Charlie' },
      ];

      const rightData = [
        { userId: '1', email: 'alice@example.com' },
        { userId: '2', email: 'bob@example.com' },
      ];

      const dsl: TransformDslDefinition = {
        version: '1.0',
        pipeline: [
          {
            operation: 'join',
            leftKey: '$.userId',
            rightKey: '$.userId',
            rightData,
            joinType: 'inner',
          } as unknown as JoinOperation,
        ],
      };

      const result = await engine.execute(dsl, leftData);

      expect(result).toHaveLength(2);
      expect(result).toEqual([
        { userId: '1', name: 'Alice', email: 'alice@example.com' },
        { userId: '2', name: 'Bob', email: 'bob@example.com' },
      ]);
    });

    it('should handle left join with missing right records', async () => {
      const leftData = [
        { id: '1', name: 'Alice' },
        { id: '2', name: 'Bob' },
      ];

      const rightData = [{ id: '1', department: 'Engineering' }];

      const dsl: TransformDslDefinition = {
        version: '1.0',
        pipeline: [
          {
            operation: 'join',
            leftKey: '$.id',
            rightKey: '$.id',
            rightData,
            joinType: 'left',
          } as unknown as JoinOperation,
        ],
      };

      const result = await engine.execute(dsl, leftData);

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({ id: '1', name: 'Alice', department: 'Engineering' });
      expect(result[1]).toMatchObject({ id: '2', name: 'Bob' });
    });
  });

  describe('Complex Multi-Step Pipelines', () => {
    it('should execute filter -> groupBy -> sortBy pipeline', async () => {
      const data = [
        { status: 'completed', customerId: 'c1', amount: 100 },
        { status: 'pending', customerId: 'c1', amount: 50 },
        { status: 'completed', customerId: 'c2', amount: 200 },
        { status: 'completed', customerId: 'c1', amount: 150 },
        { status: 'completed', customerId: 'c3', amount: 75 },
      ];

      const dsl: TransformDslDefinition = {
        version: '1.0',
        pipeline: [
          {
            operation: 'filter',
            condition: {
              field: '$.status',
              operator: 'eq',
              value: 'completed',
            },
          } as FilterOperation,
          {
            operation: 'groupBy',
            key: '$.customerId',
            aggregations: {
              totalAmount: {
                function: 'sum',
                field: '$.amount',
              },
            },
          } as GroupByOperation,
          {
            operation: 'sortBy',
            field: '$.totalAmount',
            order: 'desc',
          } as SortByOperation,
        ],
      };

      const result = await engine.execute(dsl, data);

      expect(result).toHaveLength(3);
      expect((result[0] as any).totalAmount).toBe(250); // c1
      expect((result[1] as any).totalAmount).toBe(200); // c2
      expect((result[2] as any).totalAmount).toBe(75); // c3
    });

    it('should execute select -> map -> enrich pipeline', async () => {
      const data = [{ user: { firstName: 'Alice', lastName: 'Smith' }, age: 30 }];

      const dsl: TransformDslDefinition = {
        version: '1.0',
        pipeline: [
          {
            operation: 'select',
            fields: {
              firstName: '$.user.firstName',
              lastName: '$.user.lastName',
            },
          } as SelectOperation,
          {
            operation: 'enrich',
            fields: {
              displayName: '$.firstName',
            },
          } as EnrichOperation,
        ],
      };

      const result = await engine.execute(dsl, data);

      expect(result[0]).toMatchObject({
        firstName: 'Alice',
        lastName: 'Smith',
        displayName: 'Alice',
      });
    });

    it('should execute flatMap -> select -> limit pipeline', async () => {
      const data = [
        {
          orderId: '1',
          items: [
            { product: 'A', price: 10, qty: 2 },
            { product: 'B', price: 20, qty: 1 },
          ],
        },
        {
          orderId: '2',
          items: [
            { product: 'C', price: 15, qty: 3 },
            { product: 'D', price: 25, qty: 1 },
          ],
        },
      ];

      const dsl: TransformDslDefinition = {
        version: '1.0',
        pipeline: [
          {
            operation: 'flatMap',
            path: '$.items',
          } as FlatMapOperation,
          {
            operation: 'select',
            fields: {
              product: '$.product',
              price: '$.price',
            },
          } as SelectOperation,
          {
            operation: 'limit',
            count: 2,
          } as LimitOperation,
        ],
      };

      const result = await engine.execute(dsl, data);

      expect(result).toHaveLength(2);
      expect(result).toEqual([
        { product: 'A', price: 10 },
        { product: 'B', price: 20 },
      ]);
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing fields in select operation', async () => {
      const data = [
        { name: 'Alice' }, // missing age field
      ];

      const dsl: TransformDslDefinition = {
        version: '1.0',
        pipeline: [
          {
            operation: 'select',
            fields: {
              name: '$.name',
              age: '$.age',
            },
          } as SelectOperation,
        ],
      };

      const result = await engine.execute(dsl, data);

      expect(result[0] as any).toHaveProperty('name', 'Alice');
      expect(result[0] as any).toHaveProperty('age');
    });

    it('should handle null values in aggregations', async () => {
      const data = [{ value: 10 }, { value: null }, { value: 20 }];

      const dsl: TransformDslDefinition = {
        version: '1.0',
        pipeline: [
          {
            operation: 'aggregate',
            aggregations: {
              sum: {
                function: 'sum',
                field: '$.value',
              },
            },
          } as AggregateOperation,
        ],
      };

      const result = await engine.execute(dsl, data);

      expect((result[0] as any).sum).toBeGreaterThan(0);
    });

    it('should handle empty groups in groupBy', async () => {
      const data: unknown[] = [];

      const dsl: TransformDslDefinition = {
        version: '1.0',
        pipeline: [
          {
            operation: 'groupBy',
            key: '$.category',
            aggregations: {
              count: {
                function: 'count',
                field: '$.id',
              },
            },
          } as GroupByOperation,
        ],
      };

      const result = await engine.execute(dsl, data);

      expect(result).toEqual([]);
    });

    it('should handle limit greater than dataset size', async () => {
      const data = [{ id: 1 }, { id: 2 }];

      const dsl: TransformDslDefinition = {
        version: '1.0',
        pipeline: [
          {
            operation: 'limit',
            count: 100,
          } as LimitOperation,
        ],
      };

      const result = await engine.execute(dsl, data);

      expect(result).toHaveLength(2);
    });

    it('should handle skip greater than dataset size', async () => {
      const data = [{ id: 1 }, { id: 2 }];

      const dsl: TransformDslDefinition = {
        version: '1.0',
        pipeline: [
          {
            operation: 'skip',
            count: 100,
          } as SkipOperation,
        ],
      };

      const result = await engine.execute(dsl, data);

      expect(result).toEqual([]);
    });
  });

  describe('SortByOperation - Additional Scenarios', () => {
    it('should handle sorting string fields alphabetically', async () => {
      const data = [{ name: 'Charlie' }, { name: 'Alice' }, { name: 'Bob' }];

      const dsl: TransformDslDefinition = {
        version: '1.0',
        pipeline: [
          {
            operation: 'sortBy',
            field: '$.name',
            order: 'asc',
          } as SortByOperation,
        ],
      };

      const result = await engine.execute(dsl, data);

      expect(result.map((r: any) => r.name)).toEqual(['Alice', 'Bob', 'Charlie']);
    });
  });

  describe('Error Handling', () => {
    it('should handle empty data gracefully', async () => {
      const dsl: TransformDslDefinition = {
        version: '1.0',
        pipeline: [
          {
            operation: 'select',
            fields: { name: '$.name' },
          } as SelectOperation,
        ],
      };

      const result = await engine.execute(dsl, []);

      expect(result).toEqual([]);
    });

    it('should throw on unsupported operation type', async () => {
      const dsl: TransformDslDefinition = {
        version: '1.0',
        pipeline: [
          // @ts-expect-error - Testing invalid operation
          { operation: 'unsupported' },
        ],
      };

      await expect(engine.execute(dsl, [])).rejects.toThrow();
    });

    it('should handle empty pipeline gracefully', async () => {
      const data = [{ id: 1 }, { id: 2 }];

      const dsl: TransformDslDefinition = {
        version: '1.0',
        pipeline: [],
      };

      const result = await engine.execute(dsl, data);

      expect(result).toEqual(data);
    });
  });
});
