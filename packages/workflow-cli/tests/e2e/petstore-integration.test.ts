/**
 * Petstore Integration E2E Tests
 * Tests full workflow generation from OpenAPI spec
 */

import { describe, it, expect } from 'vitest';
import * as path from 'path';
import { parseOpenApiSpec } from '../../src/openapi-parser.js';
import { generateWorkflowCommand } from '../../src/commands/generate-workflow.js';
import { checkChangesCommand } from '../../src/commands/check-changes.js';
import type { TaskDefinition } from '../../src/workflow-generator/dependency-analyzer.js';
import type { TaskContent } from '../../src/versioning/task-hash-calculator.js';

describe('Petstore E2E Integration', () => {
  const fixturesPath = path.join(__dirname, '../fixtures');
  const petstoreSpecPath = path.join(fixturesPath, 'petstore-openapi.json');

  describe('OpenAPI to Tasks', () => {
    it('should parse Petstore spec and extract endpoints', async () => {
      const result = await parseOpenApiSpec(petstoreSpecPath);

      expect(result.endpoints.length).toBeGreaterThan(0);
      expect(result.endpoints.some(e => e.operationId === 'listPets')).toBe(true);
      expect(result.endpoints.some(e => e.operationId === 'getPet')).toBe(true);
      expect(result.endpoints.some(e => e.operationId === 'getOwner')).toBe(true);
    });
  });

  describe('Workflow Generation', () => {
    it('should generate workflow from Petstore tasks', async () => {
      // Create task definitions that mimic what would be generated from OpenAPI
      const tasks: TaskDefinition[] = [
        {
          name: 'get-pet',
          inputSchema: {
            type: 'object',
            properties: { petId: { type: 'string' } },
            required: ['petId']
          },
          outputSchema: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              ownerId: { type: 'string' }
            }
          }
        },
        {
          name: 'get-owner',
          inputSchema: {
            type: 'object',
            properties: { ownerId: { type: 'string' } },
            required: ['ownerId']
          },
          outputSchema: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              email: { type: 'string' }
            }
          }
        }
      ];

      const result = await generateWorkflowCommand({
        tasks,
        workflowName: 'pet-owner-lookup',
        autoChain: true
      });

      expect(result.success).toBe(true);
      expect(result.workflow).toBeDefined();
      expect(result.chains).toBeDefined();
      expect(result.chains!.length).toBeGreaterThan(0);
    });
  });

  describe('Breaking Change Detection', () => {
    it('should detect breaking changes in Petstore API update', async () => {
      const oldTask: TaskContent = {
        name: 'get-pet',
        httpConfig: {
          method: 'GET',
          url: 'https://petstore.example.com/api/v1/pets/{{petId}}'
        },
        inputSchema: {
          type: 'object',
          properties: { petId: { type: 'string' } },
          required: ['petId']
        },
        outputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            ownerId: { type: 'string' }
          }
        }
      };

      // API v2 removes ownerId from response (breaking!)
      const newTask: TaskContent = {
        ...oldTask,
        outputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' }
            // ownerId removed - breaking change!
          }
        }
      };

      const result = await checkChangesCommand({
        oldTask,
        newTask,
        generateMigration: true
      });

      expect(result.breaking).toBe(true);
      expect(result.exitCode).toBe(1);
      expect(result.suggestedVersion).toBe('get-pet-v2');
      expect(result.migration).toBeDefined();
    });
  });
});
