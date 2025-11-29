/**
 * Transform YAML Adapter Tests
 */

import { describe, it, expect } from 'vitest';
import { transformToWorkflowTask, transformToInlineYaml } from './transform-yaml-adapter';
import type { TransformDslDefinition } from '../types/transform-dsl';

describe('TransformYAMLAdapter', () => {
  describe('transformToWorkflowTask', () => {
    it('should convert simple transform to WorkflowTask CRD', () => {
      const dsl: TransformDslDefinition = {
        version: '1.0',
        pipeline: [{ operation: 'select', fields: { name: '$.name', age: '$.age' } }],
      };

      const yaml = transformToWorkflowTask(dsl, 'my-transform', 'Transform data');

      expect(yaml).toContain('apiVersion: workflows.example.com/v1');
      expect(yaml).toContain('kind: WorkflowTask');
      expect(yaml).toContain('name: my-transform');
      expect(yaml).toContain('Transform data');
    });

    it('should include all operations in pipeline', () => {
      const dsl: TransformDslDefinition = {
        version: '1.0',
        pipeline: [
          { operation: 'select', fields: { x: '$.x' } },
          { operation: 'filter', condition: { field: '$.age', operator: 'gt', value: 18 } },
        ],
      };

      const yaml = transformToWorkflowTask(dsl, 'multi-op');

      expect(yaml).toContain('select');
      expect(yaml).toContain('filter');
    });

    it('should handle complex pipeline', () => {
      const dsl: TransformDslDefinition = {
        version: '1.0',
        pipeline: [
          {
            operation: 'groupBy',
            key: '$.category',
            aggregations: { total: { function: 'sum', field: '$.amount' } },
          },
          { operation: 'sortBy', field: '$.total', order: 'desc' },
          { operation: 'limit', count: 10 },
        ],
      };

      const yaml = transformToWorkflowTask(dsl, 'top-categories');

      expect(yaml).toContain('groupBy');
      expect(yaml).toContain('sortBy');
      expect(yaml).toContain('limit');
    });

    it('should include metadata fields', () => {
      const dsl: TransformDslDefinition = {
        version: '1.0',
        pipeline: [],
      };

      const yaml = transformToWorkflowTask(dsl, 'test-task', 'Test description', {
        team: 'data',
        env: 'prod',
      });

      expect(yaml).toContain('team: data');
      expect(yaml).toContain('env: prod');
    });

    it('should escape special YAML characters', () => {
      const dsl: TransformDslDefinition = {
        version: '1.0',
        pipeline: [
          {
            operation: 'filter',
            condition: { field: '$.message', operator: 'contains', value: 'test: value' },
          },
        ],
      };

      const yaml = transformToWorkflowTask(dsl, 'escape-test');

      expect(yaml).toContain('"test: value"');
    });
  });

  describe('transformToInlineYaml', () => {
    it('should convert to inline YAML config', () => {
      const dsl: TransformDslDefinition = {
        version: '1.0',
        pipeline: [{ operation: 'select', fields: { id: '$.id' } }],
      };

      const yaml = transformToInlineYaml(dsl);

      expect(yaml).toContain('version: "1.0"');
      expect(yaml).toContain('pipeline:');
      expect(yaml).toContain('operation: select');
    });

    it('should handle empty pipeline', () => {
      const dsl: TransformDslDefinition = {
        version: '1.0',
        pipeline: [],
      };

      const yaml = transformToInlineYaml(dsl);

      expect(yaml).toContain('pipeline: []');
    });

    it('should format nested objects correctly', () => {
      const dsl: TransformDslDefinition = {
        version: '1.0',
        pipeline: [
          {
            operation: 'join',
            leftKey: '$.id',
            rightKey: '$.userId',
            rightData: [],
            joinType: 'inner',
          },
        ],
      };

      const yaml = transformToInlineYaml(dsl);

      expect(yaml).toContain('leftKey:');
      expect(yaml).toContain('rightKey:');
    });

    it('should handle aggregations as Record', () => {
      const dsl: TransformDslDefinition = {
        version: '1.0',
        pipeline: [
          {
            operation: 'aggregate',
            aggregations: {
              totalAmount: { function: 'sum', field: '$.amount' },
              recordCount: { function: 'count', field: '$.id' },
            },
          },
        ],
      };

      const yaml = transformToInlineYaml(dsl);

      expect(yaml).toContain('aggregations:');
      expect(yaml).toContain('totalAmount:');
      expect(yaml).toContain('recordCount:');
    });

    it('should preserve operation order', () => {
      const dsl: TransformDslDefinition = {
        version: '1.0',
        pipeline: [
          { operation: 'filter', condition: { field: '$.x', operator: 'eq', value: 1 } },
          { operation: 'select', fields: { a: '$.a' } },
          { operation: 'limit', count: 5 },
        ],
      };

      const yaml = transformToInlineYaml(dsl);

      const filterIndex = yaml.indexOf('filter');
      const selectIndex = yaml.indexOf('select');
      const limitIndex = yaml.indexOf('limit');

      expect(filterIndex).toBeLessThan(selectIndex);
      expect(selectIndex).toBeLessThan(limitIndex);
    });

    it('should handle all operation types', () => {
      const dsl: TransformDslDefinition = {
        version: '1.0',
        pipeline: [
          { operation: 'select', fields: {} },
          { operation: 'filter', condition: { field: '$.x', operator: 'eq', value: 1 } },
          { operation: 'map', mappings: { newField: '$.x' } },
          { operation: 'flatMap', path: '$.items' },
          { operation: 'groupBy', key: '$.type', aggregations: {} },
          { operation: 'sortBy', field: '$.name', order: 'asc' },
          { operation: 'limit', count: 10 },
          { operation: 'skip', count: 5 },
          { operation: 'join', leftKey: '$.a', rightKey: '$.b', rightData: [], joinType: 'inner' },
          { operation: 'enrich', fields: {} },
          { operation: 'aggregate', aggregations: {} },
        ],
      };

      const yaml = transformToInlineYaml(dsl);

      expect(yaml).toContain('select');
      expect(yaml).toContain('filter');
      expect(yaml).toContain('map');
      expect(yaml).toContain('flatMap');
      expect(yaml).toContain('groupBy');
      expect(yaml).toContain('sortBy');
      expect(yaml).toContain('limit');
      expect(yaml).toContain('skip');
      expect(yaml).toContain('join');
      expect(yaml).toContain('enrich');
      expect(yaml).toContain('aggregate');
    });

    it('should produce valid YAML syntax', () => {
      const dsl: TransformDslDefinition = {
        version: '1.0',
        pipeline: [{ operation: 'select', fields: { test: '$.test' } }],
      };

      const yaml = transformToInlineYaml(dsl);

      // Should not contain common YAML errors
      expect(yaml).not.toContain('[object Object]');
      expect(yaml).not.toContain('undefined');
      expect(yaml).not.toContain('null');
    });

    it('should handle special characters in strings', () => {
      const dsl: TransformDslDefinition = {
        version: '1.0',
        pipeline: [
          {
            operation: 'filter',
            condition: { field: '$.msg', operator: 'contains', value: 'test: "value"' },
          },
        ],
      };

      const yaml = transformToInlineYaml(dsl);

      // Should properly quote strings with special chars
      expect(yaml).toMatch(/value:.*test.*value/);
    });

    it('should handle arrays with objects', () => {
      const dsl: TransformDslDefinition = {
        version: '1.0',
        pipeline: [
          {
            operation: 'enrich',
            fields: {
              metadata: [
                { key: 'author', value: 'John' },
                { key: 'version', value: '1.0' },
              ],
            },
          },
        ],
      };

      const yaml = transformToInlineYaml(dsl);

      expect(yaml).toContain('enrich');
      expect(yaml).toContain('metadata:');
      expect(yaml).toContain('key:');
      expect(yaml).toContain('author');
      expect(yaml).toContain('version');
    });

    it('should handle empty arrays', () => {
      const dsl: TransformDslDefinition = {
        version: '1.0',
        pipeline: [
          {
            operation: 'join',
            leftKey: '$.id',
            rightKey: '$.userId',
            rightData: [],
            joinType: 'inner',
          },
        ],
      };

      const yaml = transformToInlineYaml(dsl);

      expect(yaml).toContain('rightData: []');
    });

    it('should handle arrays with primitive values', () => {
      const dsl: TransformDslDefinition = {
        version: '1.0',
        pipeline: [
          {
            operation: 'filter',
            condition: {
              field: '$.status',
              operator: 'in',
              value: ['active', 'pending', 'completed'],
            },
          },
        ],
      };

      const yaml = transformToInlineYaml(dsl);

      expect(yaml).toContain('value:');
      expect(yaml).toContain('active');
      expect(yaml).toContain('pending');
      expect(yaml).toContain('completed');
    });

    it('should handle null and undefined values', () => {
      const dsl: TransformDslDefinition = {
        version: '1.0',
        pipeline: [
          {
            operation: 'map',
            mappings: {
              nullField: null,
              undefinedField: undefined,
            },
          },
        ],
      };

      const yaml = transformToInlineYaml(dsl);

      expect(yaml).toContain('null');
    });

    it('should handle boolean values', () => {
      const dsl: TransformDslDefinition = {
        version: '1.0',
        pipeline: [
          {
            operation: 'filter',
            condition: {
              field: '$.isActive',
              operator: 'eq',
              value: true,
            },
          },
        ],
      };

      const yaml = transformToInlineYaml(dsl);

      expect(yaml).toContain('true');
    });

    it('should handle number values', () => {
      const dsl: TransformDslDefinition = {
        version: '1.0',
        pipeline: [
          {
            operation: 'filter',
            condition: {
              field: '$.age',
              operator: 'gt',
              value: 18,
            },
          },
        ],
      };

      const yaml = transformToInlineYaml(dsl);

      expect(yaml).toContain('18');
    });

    it('should handle nested objects in operation fields', () => {
      const dsl: TransformDslDefinition = {
        version: '1.0',
        pipeline: [
          {
            operation: 'enrich',
            fields: {
              address: {
                street: '$.street',
                city: '$.city',
                country: '$.country',
              },
            },
          },
        ],
      };

      const yaml = transformToInlineYaml(dsl);

      expect(yaml).toContain('address:');
      expect(yaml).toContain('street:');
      expect(yaml).toContain('city:');
      expect(yaml).toContain('country:');
    });

    it('should handle empty objects', () => {
      const dsl: TransformDslDefinition = {
        version: '1.0',
        pipeline: [
          {
            operation: 'select',
            fields: {},
          },
        ],
      };

      const yaml = transformToInlineYaml(dsl);

      expect(yaml).toContain('fields: {}');
    });

    it('should escape backslashes in strings', () => {
      const dsl: TransformDslDefinition = {
        version: '1.0',
        pipeline: [
          {
            operation: 'filter',
            condition: {
              field: '$.path',
              operator: 'eq',
              value: 'C:\\Users\\test',
            },
          },
        ],
      };

      const yaml = transformToInlineYaml(dsl);

      expect(yaml).toContain('\\\\');
    });

    it('should handle strings with brackets and braces', () => {
      const dsl: TransformDslDefinition = {
        version: '1.0',
        pipeline: [
          {
            operation: 'filter',
            condition: {
              field: '$.data',
              operator: 'eq',
              value: '[test] {value}',
            },
          },
        ],
      };

      const yaml = transformToInlineYaml(dsl);

      expect(yaml).toContain('"[test] {value}"');
    });

    it('should handle strings with hash/comments', () => {
      const dsl: TransformDslDefinition = {
        version: '1.0',
        pipeline: [
          {
            operation: 'filter',
            condition: {
              field: '$.tag',
              operator: 'eq',
              value: '#hashtag',
            },
          },
        ],
      };

      const yaml = transformToInlineYaml(dsl);

      expect(yaml).toContain('"#hashtag"');
    });

    it('should handle multiline strings', () => {
      const dsl: TransformDslDefinition = {
        version: '1.0',
        pipeline: [
          {
            operation: 'map',
            mappings: {
              description: 'Line 1\nLine 2\nLine 3',
            },
          },
        ],
      };

      const yaml = transformToInlineYaml(dsl);

      // Multiline strings are quoted
      expect(yaml).toContain('"Line 1');
      expect(yaml).toContain('Line 3"');
    });
  });
});
