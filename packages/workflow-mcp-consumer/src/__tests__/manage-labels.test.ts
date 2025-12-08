import { describe, it, expect, vi } from 'vitest';
import { manageLabels } from '../tools/manage-labels.js';
import type { ConsumerGatewayClient } from '../services/consumer-gateway-client.js';
import type { ManageLabelsResult } from '../types.js';

// Mock successful result
const mockSuccessResult: ManageLabelsResult = {
  success: true,
  changes: [
    {
      entityName: 'order-workflow',
      tagsAdded: ['v2'],
      tagsRemoved: [],
      categoriesAdded: [],
      categoriesRemoved: []
    }
  ],
  summary: {
    entitiesModified: 1,
    tagsAdded: 1,
    tagsRemoved: 0,
    categoriesAdded: 0,
    categoriesRemoved: 0
  },
  dryRun: false
};

// Mock gateway client factory
const createMockClient = (workflowResult?: ManageLabelsResult, taskResult?: ManageLabelsResult): ConsumerGatewayClient => ({
  listWorkflows: vi.fn(),
  getWorkflow: vi.fn(),
  getWorkflowStats: vi.fn(),
  validateInput: vi.fn(),
  executeWorkflow: vi.fn(),
  getLabels: vi.fn(),
  listTasks: vi.fn(),
  getWorkflowsByTags: vi.fn(),
  getTasksByTags: vi.fn(),
  bulkUpdateWorkflowLabels: vi.fn().mockResolvedValue(workflowResult ?? mockSuccessResult),
  bulkUpdateTaskLabels: vi.fn().mockResolvedValue(taskResult ?? mockSuccessResult)
});

describe('manageLabels', () => {
  describe('adds tags to workflows', () => {
    it('should add tags to workflows successfully', async () => {
      const client = createMockClient();
      const result = await manageLabels(client, {
        entityType: 'workflow',
        entityNames: ['order-workflow'],
        addTags: ['v2', 'production']
      });

      expect(result.success).toBe(true);
      expect(client.bulkUpdateWorkflowLabels).toHaveBeenCalledWith({
        entityNames: ['order-workflow'],
        addTags: ['v2', 'production'],
        removeTags: undefined,
        addCategories: undefined,
        removeCategories: undefined,
        dryRun: undefined
      });
    });
  });

  describe('removes tags from workflows', () => {
    it('should remove tags from workflows successfully', async () => {
      const mockResult: ManageLabelsResult = {
        success: true,
        changes: [{ entityName: 'wf1', tagsAdded: [], tagsRemoved: ['deprecated'], categoriesAdded: [], categoriesRemoved: [] }],
        summary: { entitiesModified: 1, tagsAdded: 0, tagsRemoved: 1, categoriesAdded: 0, categoriesRemoved: 0 },
        dryRun: false
      };

      const client = createMockClient(mockResult);
      const result = await manageLabels(client, {
        entityType: 'workflow',
        entityNames: ['wf1'],
        removeTags: ['deprecated']
      });

      expect(result.success).toBe(true);
      expect(result.summary.tagsRemoved).toBe(1);
    });
  });

  describe('manages task labels', () => {
    it('should add/remove labels on tasks', async () => {
      const mockResult: ManageLabelsResult = {
        success: true,
        changes: [{ entityName: 'get-order', tagsAdded: ['http'], tagsRemoved: [], categoriesAdded: ['api'], categoriesRemoved: [] }],
        summary: { entitiesModified: 1, tagsAdded: 1, tagsRemoved: 0, categoriesAdded: 1, categoriesRemoved: 0 },
        dryRun: false
      };

      const client = createMockClient(undefined, mockResult);
      const result = await manageLabels(client, {
        entityType: 'task',
        entityNames: ['get-order'],
        addTags: ['http'],
        addCategories: ['api']
      });

      expect(result.success).toBe(true);
      expect(client.bulkUpdateTaskLabels).toHaveBeenCalled();
      expect(client.bulkUpdateWorkflowLabels).not.toHaveBeenCalled();
    });
  });

  describe('dry run mode', () => {
    it('should support dry run mode', async () => {
      const mockResult: ManageLabelsResult = {
        success: true,
        changes: [{ entityName: 'wf1', tagsAdded: ['v2'], tagsRemoved: [], categoriesAdded: [], categoriesRemoved: [] }],
        summary: { entitiesModified: 1, tagsAdded: 1, tagsRemoved: 0, categoriesAdded: 0, categoriesRemoved: 0 },
        dryRun: true
      };

      const client = createMockClient(mockResult);
      const result = await manageLabels(client, {
        entityType: 'workflow',
        entityNames: ['wf1'],
        addTags: ['v2'],
        dryRun: true
      });

      expect(result.dryRun).toBe(true);
      expect(client.bulkUpdateWorkflowLabels).toHaveBeenCalledWith(
        expect.objectContaining({ dryRun: true })
      );
    });
  });

  describe('validation', () => {
    it('should fail when entityNames is empty', async () => {
      const client = createMockClient();
      const result = await manageLabels(client, {
        entityType: 'workflow',
        entityNames: [],
        addTags: ['v2']
      });

      expect(result.success).toBe(false);
      expect(result.summary.entitiesModified).toBe(0);
      expect(client.bulkUpdateWorkflowLabels).not.toHaveBeenCalled();
    });

    it('should fail when no label operations are specified', async () => {
      const client = createMockClient();
      const result = await manageLabels(client, {
        entityType: 'workflow',
        entityNames: ['wf1']
      });

      expect(result.success).toBe(false);
      expect(client.bulkUpdateWorkflowLabels).not.toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should propagate errors from gateway client', async () => {
      const client = createMockClient();
      client.bulkUpdateWorkflowLabels = vi.fn().mockRejectedValue(new Error('API error'));

      await expect(manageLabels(client, {
        entityType: 'workflow',
        entityNames: ['wf1'],
        addTags: ['v2']
      })).rejects.toThrow('API error');
    });
  });
});
