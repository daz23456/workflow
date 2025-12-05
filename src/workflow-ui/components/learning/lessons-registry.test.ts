/**
 * Lessons Registry Tests
 * Stage 9.5: Interactive Documentation & Learning - Day 2
 */

import {
  ALL_LESSONS,
  LESSON_HELLO_WORLD,
  LESSON_TASK_DEPENDENCIES,
  LESSON_PARALLEL_EXECUTION,
  LESSON_TEMPLATE_SYNTAX,
  LESSON_ADVANCED_FEATURES,
  LESSON_CONTROL_FLOW_CONDITIONS,
  LESSON_SWITCH_CASE,
  LESSON_FOR_EACH,
  LESSON_TRANSFORM_DSL,
  LESSON_OPENAPI_IMPORT,
  getLessonById,
  getLessonsByDifficulty,
  getNextLesson,
  getPreviousLesson,
} from './lessons-registry';

describe('Lessons Registry', () => {
  describe('ALL_LESSONS', () => {
    it('should contain 10 lessons', () => {
      expect(ALL_LESSONS).toHaveLength(10);
    });

    it('should contain all defined lessons', () => {
      expect(ALL_LESSONS).toContain(LESSON_HELLO_WORLD);
      expect(ALL_LESSONS).toContain(LESSON_TASK_DEPENDENCIES);
      expect(ALL_LESSONS).toContain(LESSON_PARALLEL_EXECUTION);
      expect(ALL_LESSONS).toContain(LESSON_TEMPLATE_SYNTAX);
      expect(ALL_LESSONS).toContain(LESSON_ADVANCED_FEATURES);
      expect(ALL_LESSONS).toContain(LESSON_CONTROL_FLOW_CONDITIONS);
      expect(ALL_LESSONS).toContain(LESSON_SWITCH_CASE);
      expect(ALL_LESSONS).toContain(LESSON_FOR_EACH);
      expect(ALL_LESSONS).toContain(LESSON_TRANSFORM_DSL);
      expect(ALL_LESSONS).toContain(LESSON_OPENAPI_IMPORT);
    });

    it('should have lessons in correct order', () => {
      expect(ALL_LESSONS[0].id).toBe('hello-world');
      expect(ALL_LESSONS[1].id).toBe('task-dependencies');
      expect(ALL_LESSONS[2].id).toBe('parallel-execution');
      expect(ALL_LESSONS[3].id).toBe('template-syntax');
      expect(ALL_LESSONS[4].id).toBe('advanced-features');
      expect(ALL_LESSONS[5].id).toBe('control-flow-conditions');
      expect(ALL_LESSONS[6].id).toBe('switch-case');
      expect(ALL_LESSONS[7].id).toBe('for-each-loops');
      expect(ALL_LESSONS[8].id).toBe('transform-dsl');
      expect(ALL_LESSONS[9].id).toBe('openapi-import');
    });

    it('should have unique lesson IDs', () => {
      const ids = ALL_LESSONS.map(lesson => lesson.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it('should have sequential order values', () => {
      const orders = ALL_LESSONS.map(lesson => lesson.order);
      expect(orders).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    });
  });

  describe('Individual Lessons', () => {
    describe('LESSON_HELLO_WORLD', () => {
      it('should have correct structure', () => {
        expect(LESSON_HELLO_WORLD.id).toBe('hello-world');
        expect(LESSON_HELLO_WORLD.difficulty).toBe('beginner');
        expect(LESSON_HELLO_WORLD.order).toBe(1);
        expect(LESSON_HELLO_WORLD.objectives).toBeDefined();
        expect(LESSON_HELLO_WORLD.content).toBeDefined();
        expect(LESSON_HELLO_WORLD.yaml).toBeDefined();
        expect(LESSON_HELLO_WORLD.successCriteria).toBeDefined();
      });

      it('should have at least 3 objectives', () => {
        expect(LESSON_HELLO_WORLD.objectives.length).toBeGreaterThanOrEqual(3);
      });

      it('should have at least 3 success criteria', () => {
        expect(LESSON_HELLO_WORLD.successCriteria.length).toBeGreaterThanOrEqual(3);
      });
    });

    describe('LESSON_TASK_DEPENDENCIES', () => {
      it('should have correct structure', () => {
        expect(LESSON_TASK_DEPENDENCIES.id).toBe('task-dependencies');
        expect(LESSON_TASK_DEPENDENCIES.difficulty).toBe('beginner');
        expect(LESSON_TASK_DEPENDENCIES.order).toBe(2);
      });
    });

    describe('LESSON_PARALLEL_EXECUTION', () => {
      it('should have correct structure', () => {
        expect(LESSON_PARALLEL_EXECUTION.id).toBe('parallel-execution');
        expect(LESSON_PARALLEL_EXECUTION.difficulty).toBe('intermediate');
        expect(LESSON_PARALLEL_EXECUTION.order).toBe(3);
      });
    });

    describe('LESSON_TEMPLATE_SYNTAX', () => {
      it('should have correct structure', () => {
        expect(LESSON_TEMPLATE_SYNTAX.id).toBe('template-syntax');
        expect(LESSON_TEMPLATE_SYNTAX.difficulty).toBe('intermediate');
        expect(LESSON_TEMPLATE_SYNTAX.order).toBe(4);
      });
    });

    describe('LESSON_ADVANCED_FEATURES', () => {
      it('should have correct structure', () => {
        expect(LESSON_ADVANCED_FEATURES.id).toBe('advanced-features');
        expect(LESSON_ADVANCED_FEATURES.difficulty).toBe('advanced');
        expect(LESSON_ADVANCED_FEATURES.order).toBe(5);
      });
    });
  });

  describe('getLessonById', () => {
    it('should return lesson by ID', () => {
      const lesson = getLessonById('hello-world');
      expect(lesson).toBeDefined();
      expect(lesson?.id).toBe('hello-world');
    });

    it('should return undefined for non-existent ID', () => {
      const lesson = getLessonById('non-existent');
      expect(lesson).toBeUndefined();
    });

    it('should work for all lesson IDs', () => {
      expect(getLessonById('hello-world')).toBeDefined();
      expect(getLessonById('task-dependencies')).toBeDefined();
      expect(getLessonById('parallel-execution')).toBeDefined();
      expect(getLessonById('template-syntax')).toBeDefined();
      expect(getLessonById('advanced-features')).toBeDefined();
    });
  });

  describe('getLessonsByDifficulty', () => {
    it('should return beginner lessons', () => {
      const lessons = getLessonsByDifficulty('beginner');
      expect(lessons).toHaveLength(2);
      expect(lessons.every(l => l.difficulty === 'beginner')).toBe(true);
    });

    it('should return intermediate lessons', () => {
      const lessons = getLessonsByDifficulty('intermediate');
      expect(lessons).toHaveLength(4); // parallel-execution, template-syntax, control-flow-conditions, switch-case
      expect(lessons.every(l => l.difficulty === 'intermediate')).toBe(true);
    });

    it('should return advanced lessons', () => {
      const lessons = getLessonsByDifficulty('advanced');
      expect(lessons).toHaveLength(4); // advanced-features, for-each-loops, transform-dsl, openapi-import
      expect(lessons.every(l => l.difficulty === 'advanced')).toBe(true);
    });

    it('should maintain order within difficulty levels', () => {
      const beginnerLessons = getLessonsByDifficulty('beginner');
      expect(beginnerLessons[0].order).toBeLessThan(beginnerLessons[1].order);

      const intermediateLessons = getLessonsByDifficulty('intermediate');
      expect(intermediateLessons[0].order).toBeLessThan(intermediateLessons[1].order);
    });
  });

  describe('getNextLesson', () => {
    it('should return next lesson in sequence', () => {
      const nextLesson = getNextLesson('hello-world');
      expect(nextLesson?.id).toBe('task-dependencies');
    });

    it('should return undefined for last lesson', () => {
      const nextLesson = getNextLesson('openapi-import');
      expect(nextLesson).toBeUndefined();
    });

    it('should return undefined for non-existent lesson', () => {
      const nextLesson = getNextLesson('non-existent');
      expect(nextLesson).toBeUndefined();
    });

    it('should work for all lessons except last', () => {
      expect(getNextLesson('hello-world')?.id).toBe('task-dependencies');
      expect(getNextLesson('task-dependencies')?.id).toBe('parallel-execution');
      expect(getNextLesson('parallel-execution')?.id).toBe('template-syntax');
      expect(getNextLesson('template-syntax')?.id).toBe('advanced-features');
    });
  });

  describe('getPreviousLesson', () => {
    it('should return previous lesson in sequence', () => {
      const prevLesson = getPreviousLesson('task-dependencies');
      expect(prevLesson?.id).toBe('hello-world');
    });

    it('should return undefined for first lesson', () => {
      const prevLesson = getPreviousLesson('hello-world');
      expect(prevLesson).toBeUndefined();
    });

    it('should return undefined for non-existent lesson', () => {
      const prevLesson = getPreviousLesson('non-existent');
      expect(prevLesson).toBeUndefined();
    });

    it('should work for all lessons except first', () => {
      expect(getPreviousLesson('task-dependencies')?.id).toBe('hello-world');
      expect(getPreviousLesson('parallel-execution')?.id).toBe('task-dependencies');
      expect(getPreviousLesson('template-syntax')?.id).toBe('parallel-execution');
      expect(getPreviousLesson('advanced-features')?.id).toBe('template-syntax');
    });
  });

  describe('Lesson Content Validation', () => {
    it('all lessons should have non-empty YAML', () => {
      ALL_LESSONS.forEach(lesson => {
        expect(lesson.yaml).toBeTruthy();
        expect(lesson.yaml.length).toBeGreaterThan(0);
      });
    });

    it('all lessons should have introduction', () => {
      ALL_LESSONS.forEach(lesson => {
        expect(lesson.content.introduction).toBeTruthy();
        expect(lesson.content.introduction.length).toBeGreaterThan(0);
      });
    });

    it('all lessons should have summary', () => {
      ALL_LESSONS.forEach(lesson => {
        expect(lesson.content.summary).toBeTruthy();
        expect(lesson.content.summary.length).toBeGreaterThan(0);
      });
    });

    it('all lessons should have at least one step', () => {
      ALL_LESSONS.forEach(lesson => {
        expect(lesson.content.steps.length).toBeGreaterThan(0);
      });
    });

    it('all lesson steps should have title and description', () => {
      ALL_LESSONS.forEach(lesson => {
        lesson.content.steps.forEach(step => {
          expect(step.title).toBeTruthy();
          expect(step.description).toBeTruthy();
        });
      });
    });

    it('all lessons should have estimated time', () => {
      ALL_LESSONS.forEach(lesson => {
        expect(lesson.estimatedTime).toBeGreaterThan(0);
      });
    });
  });
});
