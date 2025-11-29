import { describe, it, expect } from 'vitest';
import { buildFormFields, type FormField, type FormFieldType } from './schema-form-builder';
import type { JSONSchema } from '@/types/workflow';

describe('buildFormFields', () => {
  describe('String Fields', () => {
    it('builds basic string field', () => {
      const schema: JSONSchema = {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'User name',
          },
        },
        required: [],
      };

      const fields = buildFormFields(schema);

      expect(fields).toHaveLength(1);
      expect(fields[0]).toMatchObject({
        name: 'name',
        type: 'string' as FormFieldType,
        label: 'Name',
        description: 'User name',
        required: false,
      });
    });

    it('marks required string fields', () => {
      const schema: JSONSchema = {
        type: 'object',
        properties: {
          email: {
            type: 'string',
          },
        },
        required: ['email'],
      };

      const fields = buildFormFields(schema);

      expect(fields[0].required).toBe(true);
    });

    it('includes pattern validation', () => {
      const schema: JSONSchema = {
        type: 'object',
        properties: {
          email: {
            type: 'string',
            pattern: '^[a-z]+@[a-z]+\\.[a-z]+$',
          },
        },
        required: [],
      };

      const fields = buildFormFields(schema);

      expect(fields[0].validation).toMatchObject({
        pattern: '^[a-z]+@[a-z]+\\.[a-z]+$',
      });
    });

    it('includes minLength and maxLength validation', () => {
      const schema: JSONSchema = {
        type: 'object',
        properties: {
          password: {
            type: 'string',
            minLength: 8,
            maxLength: 128,
          },
        },
        required: [],
      };

      const fields = buildFormFields(schema);

      expect(fields[0].validation).toMatchObject({
        minLength: 8,
        maxLength: 128,
      });
    });
  });

  describe('Number Fields', () => {
    it('builds integer field', () => {
      const schema: JSONSchema = {
        type: 'object',
        properties: {
          age: {
            type: 'integer',
            description: 'User age',
          },
        },
        required: [],
      };

      const fields = buildFormFields(schema);

      expect(fields[0]).toMatchObject({
        name: 'age',
        type: 'number' as FormFieldType,
        label: 'Age',
        description: 'User age',
        required: false,
      });
    });

    it('builds number field', () => {
      const schema: JSONSchema = {
        type: 'object',
        properties: {
          price: {
            type: 'number',
          },
        },
        required: [],
      };

      const fields = buildFormFields(schema);

      expect(fields[0].type).toBe('number');
    });

    it('includes min and max validation', () => {
      const schema: JSONSchema = {
        type: 'object',
        properties: {
          quantity: {
            type: 'integer',
            minimum: 1,
            maximum: 100,
          },
        },
        required: [],
      };

      const fields = buildFormFields(schema);

      expect(fields[0].validation).toMatchObject({
        min: 1,
        max: 100,
      });
    });
  });

  describe('Boolean Fields', () => {
    it('builds boolean field', () => {
      const schema: JSONSchema = {
        type: 'object',
        properties: {
          active: {
            type: 'boolean',
            description: 'Is active',
          },
        },
        required: [],
      };

      const fields = buildFormFields(schema);

      expect(fields[0]).toMatchObject({
        name: 'active',
        type: 'boolean' as FormFieldType,
        label: 'Active',
        description: 'Is active',
        required: false,
      });
    });

    it('provides default value for boolean fields', () => {
      const schema: JSONSchema = {
        type: 'object',
        properties: {
          enabled: {
            type: 'boolean',
          },
        },
        required: [],
      };

      const fields = buildFormFields(schema);

      expect(fields[0].defaultValue).toBe(false);
    });
  });

  describe('Enum Fields', () => {
    it('builds enum field as select', () => {
      const schema: JSONSchema = {
        type: 'object',
        properties: {
          status: {
            type: 'string',
            enum: ['draft', 'published', 'archived'],
            description: 'Content status',
          },
        },
        required: [],
      };

      const fields = buildFormFields(schema);

      expect(fields[0]).toMatchObject({
        name: 'status',
        type: 'select' as FormFieldType,
        label: 'Status',
        description: 'Content status',
        required: false,
        options: ['draft', 'published', 'archived'],
      });
    });

    it('handles number enum values', () => {
      const schema: JSONSchema = {
        type: 'object',
        properties: {
          priority: {
            type: 'integer',
            enum: [1, 2, 3, 4, 5],
          },
        },
        required: [],
      };

      const fields = buildFormFields(schema);

      expect(fields[0]).toMatchObject({
        type: 'select' as FormFieldType,
        options: [1, 2, 3, 4, 5],
      });
    });
  });

  describe('Label Generation', () => {
    it('generates human-readable labels from camelCase', () => {
      const schema: JSONSchema = {
        type: 'object',
        properties: {
          firstName: { type: 'string' },
          lastName: { type: 'string' },
          emailAddress: { type: 'string' },
        },
        required: [],
      };

      const fields = buildFormFields(schema);

      expect(fields[0].label).toBe('First Name');
      expect(fields[1].label).toBe('Last Name');
      expect(fields[2].label).toBe('Email Address');
    });

    it('generates human-readable labels from snake_case', () => {
      const schema: JSONSchema = {
        type: 'object',
        properties: {
          first_name: { type: 'string' },
          last_name: { type: 'string' },
        },
        required: [],
      };

      const fields = buildFormFields(schema);

      expect(fields[0].label).toBe('First Name');
      expect(fields[1].label).toBe('Last Name');
    });

    it('generates human-readable labels from kebab-case', () => {
      const schema: JSONSchema = {
        type: 'object',
        properties: {
          'first-name': { type: 'string' },
          'last-name': { type: 'string' },
        },
        required: [],
      };

      const fields = buildFormFields(schema);

      expect(fields[0].label).toBe('First Name');
      expect(fields[1].label).toBe('Last Name');
    });
  });

  describe('Multiple Fields', () => {
    it('builds multiple fields in order', () => {
      const schema: JSONSchema = {
        type: 'object',
        properties: {
          name: { type: 'string' },
          age: { type: 'integer' },
          active: { type: 'boolean' },
        },
        required: ['name'],
      };

      const fields = buildFormFields(schema);

      expect(fields).toHaveLength(3);
      expect(fields[0].name).toBe('name');
      expect(fields[1].name).toBe('age');
      expect(fields[2].name).toBe('active');
    });
  });

  describe('Edge Cases', () => {
    it('handles empty schema', () => {
      const schema: JSONSchema = {
        type: 'object',
        properties: {},
        required: [],
      };

      const fields = buildFormFields(schema);

      expect(fields).toHaveLength(0);
    });

    it('handles schema without properties', () => {
      const schema: JSONSchema = {
        type: 'object',
        required: [],
      };

      const fields = buildFormFields(schema);

      expect(fields).toHaveLength(0);
    });

    it('handles schema without required array', () => {
      const schema: JSONSchema = {
        type: 'object',
        properties: {
          name: { type: 'string' },
        },
      };

      const fields = buildFormFields(schema);

      expect(fields[0].required).toBe(false);
    });

    it('ignores unsupported property types', () => {
      const schema: JSONSchema = {
        type: 'object',
        properties: {
          name: { type: 'string' },
          data: { type: 'object' }, // Not supported yet
          items: { type: 'array' }, // Not supported yet
        },
        required: [],
      };

      const fields = buildFormFields(schema);

      // Should only include the string field
      expect(fields).toHaveLength(1);
      expect(fields[0].name).toBe('name');
    });
  });

  describe('Default Values', () => {
    it('uses default value from schema', () => {
      const schema: JSONSchema = {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            default: 'John Doe',
          },
          age: {
            type: 'integer',
            default: 30,
          },
        },
        required: [],
      };

      const fields = buildFormFields(schema);

      expect(fields[0].defaultValue).toBe('John Doe');
      expect(fields[1].defaultValue).toBe(30);
    });
  });

  describe('Placeholder Text', () => {
    it('generates placeholder from description', () => {
      const schema: JSONSchema = {
        type: 'object',
        properties: {
          email: {
            type: 'string',
            description: 'Enter your email address',
          },
        },
        required: [],
      };

      const fields = buildFormFields(schema);

      expect(fields[0].placeholder).toBe('Enter your email address');
    });

    it('generates placeholder for enum fields', () => {
      const schema: JSONSchema = {
        type: 'object',
        properties: {
          status: {
            type: 'string',
            enum: ['draft', 'published'],
          },
        },
        required: [],
      };

      const fields = buildFormFields(schema);

      expect(fields[0].placeholder).toBe('Select status');
    });
  });
});
