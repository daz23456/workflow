/**
 * Schema Validation Tests
 *
 * Ensures that JSON Schemas accurately represent C# models
 * and that generated TypeScript types are compatible with actual workflow YAMLs
 */

import { readFileSync } from 'fs';
import { parse as parseYaml } from 'yaml';
import Ajv from 'ajv';

const ajv = new Ajv({ strict: false });

// Load common definitions schema so references work
const commonDefsSchema = JSON.parse(readFileSync('schemas/common-definitions.schema.json', 'utf-8'));
ajv.addSchema(commonDefsSchema);

describe('Schema Validation', () => {
  describe('Workflow Schema', () => {
    const schema = JSON.parse(readFileSync('schemas/workflow.schema.json', 'utf-8'));
    const validate = ajv.compile(schema);

    it('should validate user-activity-analysis.yaml', () => {
      const yaml = readFileSync('demo/workflows/workflow-user-activity-analysis.yaml', 'utf-8');
      const workflow = parseYaml(yaml);

      const valid = validate(workflow);
      if (!valid) {
        console.error('Validation errors:', validate.errors);
      }
      expect(valid).toBe(true);
    });

    it('should validate ecommerce-analytics.yaml', () => {
      const yaml = readFileSync('demo/workflows/workflow-ecommerce-analytics.yaml', 'utf-8');
      const workflow = parseYaml(yaml);

      const valid = validate(workflow);
      if (!valid) {
        console.error('Validation errors:', validate.errors);
      }
      expect(valid).toBe(true);
    });

    it('should reject workflow with missing required fields', () => {
      const invalid = {
        apiVersion: 'workflow.example.com/v1',
        kind: 'Workflow',
        // Missing metadata and spec
      };

      const valid = validate(invalid);
      expect(valid).toBe(false);
      expect(validate.errors).toContainEqual(
        expect.objectContaining({
          instancePath: '',
          message: expect.stringContaining('required')
        })
      );
    });

    it('should reject workflow with invalid apiVersion', () => {
      const invalid = {
        apiVersion: 'wrong/v1',
        kind: 'Workflow',
        metadata: { name: 'test', namespace: 'default' },
        spec: { input: {}, tasks: [] }
      };

      const valid = validate(invalid);
      expect(valid).toBe(false);
    });
  });

  describe('WorkflowTask Schema', () => {
    const schema = JSON.parse(readFileSync('schemas/workflow-task.schema.json', 'utf-8'));
    const validate = ajv.compile(schema);

    it('should validate task-fetch-user.yaml', () => {
      const yaml = readFileSync('demo/tasks/task-fetch-user.yaml', 'utf-8');
      const task = parseYaml(yaml);

      const valid = validate(task);
      if (!valid) {
        console.error('Validation errors:', validate.errors);
      }
      expect(valid).toBe(true);
    });

    it('should validate transform task', () => {
      const yaml = readFileSync('demo/tasks/task-transform-filter-completed-todos.yaml', 'utf-8');
      const task = parseYaml(yaml);

      const valid = validate(task);
      if (!valid) {
        console.error('Validation errors:', validate.errors);
      }
      expect(valid).toBe(true);
    });

    it('should reject task with invalid type', () => {
      const invalid = {
        apiVersion: 'workflow.example.com/v1',
        kind: 'WorkflowTask',
        metadata: { name: 'test', namespace: 'default' },
        spec: {
          type: 'invalid-type', // Not in enum
          http: { method: 'GET', url: 'https://api.example.com' }
        }
      };

      const valid = validate(invalid);
      expect(valid).toBe(false);
    });
  });

  describe('C# Model Compatibility', () => {
    it('should have matching field names between schema and C# WorkflowResource', () => {
      const schema = JSON.parse(readFileSync('schemas/workflow.schema.json', 'utf-8'));
      const csharpFields = ['apiVersion', 'kind', 'metadata', 'spec', 'status'];
      const schemaFields = Object.keys(schema.properties);

      csharpFields.forEach(field => {
        expect(schemaFields).toContain(field);
      });
    });

    it('should have matching field names for WorkflowSpec', () => {
      const schema = JSON.parse(readFileSync('schemas/workflow.schema.json', 'utf-8'));
      const specSchema = schema.definitions.WorkflowSpec;
      const csharpFields = ['input', 'tasks', 'output'];
      const schemaFields = Object.keys(specSchema.properties);

      csharpFields.forEach(field => {
        expect(schemaFields).toContain(field);
      });
    });

    it('should have matching field names for WorkflowTaskStep', () => {
      const schema = JSON.parse(readFileSync('schemas/workflow.schema.json', 'utf-8'));
      const taskStepSchema = schema.definitions.WorkflowTaskStep;
      const csharpFields = ['id', 'taskRef', 'input', 'dependsOn', 'condition'];
      const schemaFields = Object.keys(taskStepSchema.properties);

      csharpFields.forEach(field => {
        expect(schemaFields).toContain(field);
      });
    });
  });

  describe('TypeScript Type Compatibility', () => {
    it('should compile TypeScript code using generated types', async () => {
      // This test verifies that generated types work with actual data
      type Workflow = import('../packages/workflow-types/src/generated/workflow').Workflow;

      const workflow: Workflow = {
        apiVersion: 'workflow.example.com/v1',
        kind: 'Workflow',
        metadata: {
          name: 'test-workflow',
          namespace: 'default'
        },
        spec: {
          input: {
            userId: {
              type: 'integer',
              required: true,
              description: 'User ID'
            }
          },
          tasks: [{
            id: 'fetch-user',
            taskRef: 'task-fetch-user',
            input: {
              userId: '{{input.userId}}'
            }
          }],
          output: {
            user: '{{tasks.fetch-user.output.data}}'
          }
        }
      };

      expect(workflow.kind).toBe('Workflow');
      expect(workflow.spec.tasks).toHaveLength(1);
    });
  });
});
