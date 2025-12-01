/**
 * Tests for help-content-registry
 * Stage 9.5: Interactive Documentation & Learning
 */

import { HELP_TOPICS, getHelpTopic, searchHelpTopics } from '../help-content-registry';

describe('Help Content Registry', () => {
  describe('HELP_TOPICS Data Integrity', () => {
    it('should have all topics with unique IDs', () => {
      const topics = Object.values(HELP_TOPICS);
      const ids = topics.map(topic => topic.id);
      const uniqueIds = new Set(ids);

      expect(uniqueIds.size).toBe(ids.length);
    });

    it('should have all topics with required fields', () => {
      const topics = Object.values(HELP_TOPICS);

      topics.forEach(topic => {
        expect(topic.id).toBeDefined();
        expect(topic.id).toBeTruthy();
        expect(typeof topic.id).toBe('string');

        expect(topic.title).toBeDefined();
        expect(topic.title).toBeTruthy();
        expect(typeof topic.title).toBe('string');

        expect(topic.content).toBeDefined();
        expect(topic.content).toBeTruthy();
        expect(typeof topic.content).toBe('string');
      });
    });

    it('should have at least 45 help topics', () => {
      const topics = Object.values(HELP_TOPICS);
      expect(topics.length).toBeGreaterThanOrEqual(45);
    });

    it('should have topics with examples as arrays when provided', () => {
      const topics = Object.values(HELP_TOPICS);

      topics.forEach(topic => {
        if (topic.examples) {
          expect(Array.isArray(topic.examples)).toBe(true);
          topic.examples.forEach(example => {
            expect(typeof example).toBe('string');
          });
        }
      });
    });

    it('should have topics with links as arrays when provided', () => {
      const topics = Object.values(HELP_TOPICS);

      topics.forEach(topic => {
        if (topic.links) {
          expect(Array.isArray(topic.links)).toBe(true);
          topic.links.forEach(link => {
            expect(link.text).toBeDefined();
            expect(typeof link.text).toBe('string');
            expect(link.url).toBeDefined();
            expect(typeof link.url).toBe('string');
          });
        }
      });
    });

    it('should have topics with keywords as arrays when provided', () => {
      const topics = Object.values(HELP_TOPICS);

      topics.forEach(topic => {
        if (topic.keywords) {
          expect(Array.isArray(topic.keywords)).toBe(true);
          topic.keywords.forEach(keyword => {
            expect(typeof keyword).toBe('string');
          });
        }
      });
    });
  });

  describe('Core Topic Availability', () => {
    it('should have WORKFLOW_NAME topic', () => {
      expect(HELP_TOPICS.WORKFLOW_NAME).toBeDefined();
      expect(HELP_TOPICS.WORKFLOW_NAME.id).toBe('workflow-name');
    });

    it('should have TASK_LABEL topic', () => {
      expect(HELP_TOPICS.TASK_LABEL).toBeDefined();
      expect(HELP_TOPICS.TASK_LABEL.id).toBe('task-label');
    });

    it('should have TASK_REFERENCE topic', () => {
      expect(HELP_TOPICS.TASK_REFERENCE).toBeDefined();
      expect(HELP_TOPICS.TASK_REFERENCE.id).toBe('task-reference');
    });

    it('should have TASK_DESCRIPTION topic', () => {
      expect(HELP_TOPICS.TASK_DESCRIPTION).toBeDefined();
      expect(HELP_TOPICS.TASK_DESCRIPTION.id).toBe('task-description');
    });

    it('should have SEARCH_TASKS topic', () => {
      expect(HELP_TOPICS.SEARCH_TASKS).toBeDefined();
      expect(HELP_TOPICS.SEARCH_TASKS.id).toBe('search-tasks');
    });

    it('should have CATEGORY_FILTER topic', () => {
      expect(HELP_TOPICS.CATEGORY_FILTER).toBeDefined();
      expect(HELP_TOPICS.CATEGORY_FILTER.id).toBe('category-filter');
    });

    it('should have TEMPLATE_SYNTAX topic', () => {
      expect(HELP_TOPICS.TEMPLATE_SYNTAX).toBeDefined();
      expect(HELP_TOPICS.TEMPLATE_SYNTAX.id).toBe('template-syntax');
    });

    it('should have PARALLEL_EXECUTION topic', () => {
      expect(HELP_TOPICS.PARALLEL_EXECUTION).toBeDefined();
      expect(HELP_TOPICS.PARALLEL_EXECUTION.id).toBe('parallel-execution');
    });

    it('should have OUTPUT_MAPPING topic', () => {
      expect(HELP_TOPICS.OUTPUT_MAPPING).toBeDefined();
      expect(HELP_TOPICS.OUTPUT_MAPPING.id).toBe('output-mapping');
    });
  });

  describe('getHelpTopic()', () => {
    it('should return topic when ID exists', () => {
      const topic = getHelpTopic('workflow-name');

      expect(topic).toBeDefined();
      expect(topic?.id).toBe('workflow-name');
      expect(topic?.title).toBe('Workflow Name');
    });

    it('should return undefined when ID does not exist', () => {
      const topic = getHelpTopic('non-existent-id');

      expect(topic).toBeUndefined();
    });

    it('should return correct topic for task-label', () => {
      const topic = getHelpTopic('task-label');

      expect(topic).toBeDefined();
      expect(topic?.id).toBe('task-label');
      expect(topic?.title).toBe('Task Label');
    });

    it('should return correct topic for template-syntax', () => {
      const topic = getHelpTopic('template-syntax');

      expect(topic).toBeDefined();
      expect(topic?.id).toBe('template-syntax');
      expect(topic?.title).toBe('Template Syntax');
    });
  });

  describe('searchHelpTopics()', () => {
    it('should return all topics when query is empty', () => {
      const results = searchHelpTopics('');

      expect(results.length).toBe(Object.values(HELP_TOPICS).length);
    });

    it('should return topics matching title (case-insensitive)', () => {
      const results = searchHelpTopics('workflow');

      expect(results.length).toBeGreaterThan(0);
      results.forEach(topic => {
        const matchesTitle = topic.title.toLowerCase().includes('workflow');
        const matchesContent = topic.content.toLowerCase().includes('workflow');
        const matchesKeywords = topic.keywords?.some(k => k.toLowerCase().includes('workflow'));

        expect(matchesTitle || matchesContent || matchesKeywords).toBe(true);
      });
    });

    it('should return topics matching content (case-insensitive)', () => {
      const results = searchHelpTopics('template');

      expect(results.length).toBeGreaterThan(0);
      results.forEach(topic => {
        const matchesTitle = topic.title.toLowerCase().includes('template');
        const matchesContent = topic.content.toLowerCase().includes('template');
        const matchesKeywords = topic.keywords?.some(k => k.toLowerCase().includes('template'));

        expect(matchesTitle || matchesContent || matchesKeywords).toBe(true);
      });
    });

    it('should return topics matching keywords', () => {
      const results = searchHelpTopics('validation');

      expect(results.length).toBeGreaterThan(0);
      results.forEach(topic => {
        const matchesTitle = topic.title.toLowerCase().includes('validation');
        const matchesContent = topic.content.toLowerCase().includes('validation');
        const matchesKeywords = topic.keywords?.some(k => k.toLowerCase().includes('validation'));

        expect(matchesTitle || matchesContent || matchesKeywords).toBe(true);
      });
    });

    it('should return empty array when no matches found', () => {
      const results = searchHelpTopics('xyzabc123nonexistent');

      expect(results).toEqual([]);
    });

    it('should be case-insensitive', () => {
      const resultsLower = searchHelpTopics('task');
      const resultsUpper = searchHelpTopics('TASK');
      const resultsMixed = searchHelpTopics('TaSk');

      expect(resultsLower.length).toBeGreaterThan(0);
      expect(resultsLower.length).toBe(resultsUpper.length);
      expect(resultsLower.length).toBe(resultsMixed.length);
    });

    it('should handle partial matches', () => {
      const results = searchHelpTopics('para'); // should match "parallel"

      const hasParallelExecution = results.some(topic => topic.id === 'parallel-execution');
      expect(hasParallelExecution).toBe(true);
    });
  });

  describe('Topic Content Quality', () => {
    it('should have topics with meaningful content (> 20 chars)', () => {
      const topics = Object.values(HELP_TOPICS);

      topics.forEach(topic => {
        expect(topic.content.length).toBeGreaterThan(20);
      });
    });

    it('should have topics with concise titles (< 50 chars)', () => {
      const topics = Object.values(HELP_TOPICS);

      topics.forEach(topic => {
        expect(topic.title.length).toBeLessThan(50);
      });
    });

    it('should have TEMPLATE_SYNTAX topic with examples', () => {
      const topic = HELP_TOPICS.TEMPLATE_SYNTAX;

      expect(topic.examples).toBeDefined();
      expect(topic.examples!.length).toBeGreaterThan(0);
    });

    it('should have WORKFLOW_INPUT_REFERENCE topic with examples', () => {
      const topic = HELP_TOPICS.WORKFLOW_INPUT_REFERENCE;

      expect(topic.examples).toBeDefined();
      expect(topic.examples!.length).toBeGreaterThan(0);
    });

    it('should have TASK_OUTPUT_REFERENCE topic with examples', () => {
      const topic = HELP_TOPICS.TASK_OUTPUT_REFERENCE;

      expect(topic.examples).toBeDefined();
      expect(topic.examples!.length).toBeGreaterThan(0);
    });
  });
});
