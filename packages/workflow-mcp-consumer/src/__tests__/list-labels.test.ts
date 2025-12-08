import { describe, it, expect, vi } from 'vitest';
import { listLabels } from '../tools/list-labels.js';
import type { ConsumerGatewayClient } from '../services/consumer-gateway-client.js';
import type { LabelListResponse } from '../types.js';

// Mock gateway client factory
const createMockClient = (labelsResponse: LabelListResponse): ConsumerGatewayClient => ({
  listWorkflows: vi.fn(),
  getWorkflow: vi.fn(),
  getWorkflowStats: vi.fn(),
  validateInput: vi.fn(),
  executeWorkflow: vi.fn(),
  getLabels: vi.fn().mockResolvedValue(labelsResponse),
  listTasks: vi.fn(),
  getWorkflowsByTags: vi.fn(),
  getTasksByTags: vi.fn(),
  bulkUpdateWorkflowLabels: vi.fn(),
  bulkUpdateTaskLabels: vi.fn()
});

describe('listLabels', () => {
  describe('returns all labels', () => {
    it('should return all tags and categories with counts', async () => {
      const mockLabels: LabelListResponse = {
        tags: [
          { name: 'production', count: 10 },
          { name: 'v2', count: 5 },
          { name: 'deprecated', count: 2 }
        ],
        categories: [
          { name: 'orders', count: 8 },
          { name: 'payments', count: 6 },
          { name: 'users', count: 4 }
        ]
      };

      const client = createMockClient(mockLabels);
      const result = await listLabels(client, {});

      expect(result.totalTags).toBe(3);
      expect(result.totalCategories).toBe(3);
      expect(result.tags).toHaveLength(3);
      expect(result.categories).toHaveLength(3);
    });

    it('should return empty arrays when no labels exist', async () => {
      const mockLabels: LabelListResponse = {
        tags: [],
        categories: []
      };

      const client = createMockClient(mockLabels);
      const result = await listLabels(client, {});

      expect(result.totalTags).toBe(0);
      expect(result.totalCategories).toBe(0);
      expect(result.tags).toEqual([]);
      expect(result.categories).toEqual([]);
    });
  });

  describe('sorting', () => {
    it('should sort by usage count by default (descending)', async () => {
      const mockLabels: LabelListResponse = {
        tags: [
          { name: 'low', count: 2 },
          { name: 'high', count: 10 },
          { name: 'medium', count: 5 }
        ],
        categories: [
          { name: 'alpha', count: 1 },
          { name: 'gamma', count: 3 },
          { name: 'beta', count: 2 }
        ]
      };

      const client = createMockClient(mockLabels);
      const result = await listLabels(client, {});

      // Should be sorted by count descending
      expect(result.tags[0].name).toBe('high');
      expect(result.tags[1].name).toBe('medium');
      expect(result.tags[2].name).toBe('low');

      expect(result.categories[0].name).toBe('gamma');
      expect(result.categories[1].name).toBe('beta');
      expect(result.categories[2].name).toBe('alpha');
    });

    it('should sort by name when sortBy is "name"', async () => {
      const mockLabels: LabelListResponse = {
        tags: [
          { name: 'zebra', count: 10 },
          { name: 'alpha', count: 5 },
          { name: 'mango', count: 2 }
        ],
        categories: [
          { name: 'charlie', count: 8 },
          { name: 'alpha', count: 6 },
          { name: 'bravo', count: 4 }
        ]
      };

      const client = createMockClient(mockLabels);
      const result = await listLabels(client, { sortBy: 'name' });

      // Should be sorted alphabetically
      expect(result.tags[0].name).toBe('alpha');
      expect(result.tags[1].name).toBe('mango');
      expect(result.tags[2].name).toBe('zebra');

      expect(result.categories[0].name).toBe('alpha');
      expect(result.categories[1].name).toBe('bravo');
      expect(result.categories[2].name).toBe('charlie');
    });

    it('should sort by usage when sortBy is "usage"', async () => {
      const mockLabels: LabelListResponse = {
        tags: [
          { name: 'a', count: 1 },
          { name: 'b', count: 100 },
          { name: 'c', count: 50 }
        ],
        categories: []
      };

      const client = createMockClient(mockLabels);
      const result = await listLabels(client, { sortBy: 'usage' });

      expect(result.tags[0].count).toBe(100);
      expect(result.tags[1].count).toBe(50);
      expect(result.tags[2].count).toBe(1);
    });
  });

  describe('error handling', () => {
    it('should propagate errors from gateway client', async () => {
      const client = createMockClient({ tags: [], categories: [] });
      client.getLabels = vi.fn().mockRejectedValue(new Error('Network error'));

      await expect(listLabels(client, {})).rejects.toThrow('Network error');
    });
  });

  describe('handles missing data gracefully', () => {
    it('should handle undefined tags or categories', async () => {
      const mockLabels = {
        tags: undefined as unknown as [],
        categories: undefined as unknown as []
      };

      const client = createMockClient(mockLabels as LabelListResponse);
      const result = await listLabels(client, {});

      expect(result.tags).toEqual([]);
      expect(result.categories).toEqual([]);
      expect(result.totalTags).toBe(0);
      expect(result.totalCategories).toBe(0);
    });
  });
});
