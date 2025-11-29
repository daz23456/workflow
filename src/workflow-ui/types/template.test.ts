/**
 * Template types utility functions tests
 */

import { describe, it, expect } from 'vitest';
import {
  TemplateCategory,
  TemplateDifficulty,
  extractUniqueTags,
  filterTemplates,
  TemplateCategoryInfo,
  TemplateDifficultyInfo,
} from './template';
import type { TemplateListItem } from './template';

describe('Template utilities', () => {
  describe('extractUniqueTags', () => {
    it('should extract unique tags from templates', () => {
      const templates: TemplateListItem[] = [
        {
          name: 'template1',
          category: TemplateCategory.ApiComposition,
          difficulty: TemplateDifficulty.Beginner,
          description: 'Test',
          tags: ['http', 'parallel'],
          estimatedSetupTime: 5,
          taskCount: 2,
          hasParallelExecution: true,
          namespace: 'default',
        },
        {
          name: 'template2',
          category: TemplateCategory.DataProcessing,
          difficulty: TemplateDifficulty.Intermediate,
          description: 'Test',
          tags: ['etl', 'http'],
          estimatedSetupTime: 10,
          taskCount: 3,
          hasParallelExecution: false,
          namespace: 'default',
        },
      ];

      const tags = extractUniqueTags(templates);

      expect(tags).toEqual(['etl', 'http', 'parallel']);
    });

    it('should return empty array for templates with no tags', () => {
      const templates: TemplateListItem[] = [
        {
          name: 'template1',
          category: TemplateCategory.ApiComposition,
          difficulty: TemplateDifficulty.Beginner,
          description: 'Test',
          tags: [],
          estimatedSetupTime: 5,
          taskCount: 2,
          hasParallelExecution: true,
          namespace: 'default',
        },
      ];

      const tags = extractUniqueTags(templates);

      expect(tags).toEqual([]);
    });

    it('should handle empty templates array', () => {
      const tags = extractUniqueTags([]);

      expect(tags).toEqual([]);
    });
  });

  describe('filterTemplates', () => {
    const templates: TemplateListItem[] = [
      {
        name: 'parallel-api',
        category: TemplateCategory.ApiComposition,
        difficulty: TemplateDifficulty.Beginner,
        description: 'Parallel API fetch',
        tags: ['http', 'parallel', 'api'],
        estimatedSetupTime: 5,
        taskCount: 2,
        hasParallelExecution: true,
        namespace: 'default',
      },
      {
        name: 'etl-pipeline',
        category: TemplateCategory.DataProcessing,
        difficulty: TemplateDifficulty.Intermediate,
        description: 'ETL data processing',
        tags: ['etl', 'data'],
        estimatedSetupTime: 15,
        taskCount: 5,
        hasParallelExecution: false,
        namespace: 'default',
      },
      {
        name: 'websocket-stream',
        category: TemplateCategory.RealTime,
        difficulty: TemplateDifficulty.Advanced,
        description: 'WebSocket streaming',
        tags: ['websocket', 'stream', 'realtime'],
        estimatedSetupTime: 25,
        taskCount: 4,
        hasParallelExecution: true,
        namespace: 'default',
      },
    ];

    it('should filter by category', () => {
      const filtered = filterTemplates(templates, {
        category: TemplateCategory.ApiComposition,
      });

      expect(filtered).toHaveLength(1);
      expect(filtered[0].name).toBe('parallel-api');
    });

    it('should filter by difficulty', () => {
      const filtered = filterTemplates(templates, {
        difficulty: TemplateDifficulty.Beginner,
      });

      expect(filtered).toHaveLength(1);
      expect(filtered[0].name).toBe('parallel-api');
    });

    it('should filter by tags (OR logic)', () => {
      const filtered = filterTemplates(templates, {
        tags: ['websocket', 'parallel'],
      });

      expect(filtered).toHaveLength(2);
      expect(filtered.map((t) => t.name)).toContain('parallel-api');
      expect(filtered.map((t) => t.name)).toContain('websocket-stream');
    });

    it('should filter by search term in name', () => {
      const filtered = filterTemplates(templates, {
        search: 'api',
      });

      expect(filtered).toHaveLength(1);
      expect(filtered[0].name).toBe('parallel-api');
    });

    it('should filter by search term in description', () => {
      const filtered = filterTemplates(templates, {
        search: 'streaming',
      });

      expect(filtered).toHaveLength(1);
      expect(filtered[0].name).toBe('websocket-stream');
    });

    it('should filter by search term in tags', () => {
      const filtered = filterTemplates(templates, {
        search: 'realtime',
      });

      expect(filtered).toHaveLength(1);
      expect(filtered[0].name).toBe('websocket-stream');
    });

    it('should filter by maxEstimatedTime', () => {
      const filtered = filterTemplates(templates, {
        maxEstimatedTime: 10,
      });

      expect(filtered).toHaveLength(1);
      expect(filtered[0].name).toBe('parallel-api');
    });

    it('should filter by parallelOnly', () => {
      const filtered = filterTemplates(templates, {
        parallelOnly: true,
      });

      expect(filtered).toHaveLength(2);
      expect(filtered.map((t) => t.name)).toContain('parallel-api');
      expect(filtered.map((t) => t.name)).toContain('websocket-stream');
    });

    it('should combine multiple filters (AND logic)', () => {
      const filtered = filterTemplates(templates, {
        category: TemplateCategory.RealTime,
        difficulty: TemplateDifficulty.Advanced,
        parallelOnly: true,
      });

      expect(filtered).toHaveLength(1);
      expect(filtered[0].name).toBe('websocket-stream');
    });

    it('should return all templates when no filters applied', () => {
      const filtered = filterTemplates(templates, {});

      expect(filtered).toHaveLength(3);
    });

    it('should return empty array when no templates match', () => {
      const filtered = filterTemplates(templates, {
        category: TemplateCategory.Integrations,
      });

      expect(filtered).toHaveLength(0);
    });

    it('should handle empty search string', () => {
      const filtered = filterTemplates(templates, {
        search: '',
      });

      expect(filtered).toHaveLength(3);
    });

    it('should handle whitespace-only search string', () => {
      const filtered = filterTemplates(templates, {
        search: '   ',
      });

      expect(filtered).toHaveLength(3);
    });

    it('should be case-insensitive for search', () => {
      const filtered = filterTemplates(templates, {
        search: 'PARALLEL',
      });

      expect(filtered).toHaveLength(1);
      expect(filtered[0].name).toBe('parallel-api');
    });
  });

  describe('TemplateCategoryInfo', () => {
    it('should have info for all categories', () => {
      expect(TemplateCategoryInfo[TemplateCategory.ApiComposition]).toBeDefined();
      expect(TemplateCategoryInfo[TemplateCategory.DataProcessing]).toBeDefined();
      expect(TemplateCategoryInfo[TemplateCategory.RealTime]).toBeDefined();
      expect(TemplateCategoryInfo[TemplateCategory.Integrations]).toBeDefined();
    });

    it('should have correct structure', () => {
      const info = TemplateCategoryInfo[TemplateCategory.ApiComposition];
      expect(info).toHaveProperty('value');
      expect(info).toHaveProperty('label');
      expect(info).toHaveProperty('description');
      expect(info).toHaveProperty('icon');
      expect(info).toHaveProperty('color');
    });
  });

  describe('TemplateDifficultyInfo', () => {
    it('should have info for all difficulties', () => {
      expect(TemplateDifficultyInfo[TemplateDifficulty.Beginner]).toBeDefined();
      expect(TemplateDifficultyInfo[TemplateDifficulty.Intermediate]).toBeDefined();
      expect(TemplateDifficultyInfo[TemplateDifficulty.Advanced]).toBeDefined();
    });

    it('should have correct structure', () => {
      const info = TemplateDifficultyInfo[TemplateDifficulty.Beginner];
      expect(info).toHaveProperty('value');
      expect(info).toHaveProperty('label');
      expect(info).toHaveProperty('description');
      expect(info).toHaveProperty('icon');
      expect(info).toHaveProperty('color');
      expect(info).toHaveProperty('estimatedTimeRange');
    });
  });
});
