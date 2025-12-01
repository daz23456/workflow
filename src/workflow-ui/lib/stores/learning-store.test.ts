/**
 * Learning Store Tests
 * Stage 9.5: Interactive Documentation & Learning - Day 2
 */

import { renderHook, act } from '@testing-library/react';
import { useLearningStore, getLessonCompletion, getLessonProgress, isGamificationEnabled, isFullGamification } from './learning-store';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('useLearningStore', () => {
  beforeEach(() => {
    // Reset store before each test
    const { result } = renderHook(() => useLearningStore());
    act(() => {
      result.current.reset();
    });
    localStorageMock.clear();
  });

  describe('completeLesson', () => {
    it('should mark a lesson as completed', () => {
      const { result } = renderHook(() => useLearningStore());

      act(() => {
        result.current.completeLesson('hello-world');
      });

      expect(result.current.completedLessons).toContain('hello-world');
      expect(result.current.lessonProgress['hello-world']).toBe(100);
    });

    it('should not duplicate completed lessons', () => {
      const { result } = renderHook(() => useLearningStore());

      act(() => {
        result.current.completeLesson('hello-world');
        result.current.completeLesson('hello-world');
      });

      expect(result.current.completedLessons).toEqual(['hello-world']);
    });

    it('should unlock "First Steps" achievement after first lesson', () => {
      const { result } = renderHook(() => useLearningStore());

      act(() => {
        result.current.completeLesson('hello-world');
      });

      const firstStepsAchievement = result.current.achievements.find(a => a.id === 'first-lesson');
      expect(firstStepsAchievement).toBeDefined();
      expect(firstStepsAchievement?.name).toBe('First Steps');
      expect(firstStepsAchievement?.icon).toBe('🎯');
    });

    it('should unlock "Quick Learner" achievement after 3 lessons', () => {
      const { result } = renderHook(() => useLearningStore());

      act(() => {
        result.current.completeLesson('lesson-1');
        result.current.completeLesson('lesson-2');
        result.current.completeLesson('lesson-3');
      });

      const quickLearnerAchievement = result.current.achievements.find(a => a.id === 'quick-learner');
      expect(quickLearnerAchievement).toBeDefined();
      expect(quickLearnerAchievement?.name).toBe('Quick Learner');
      expect(quickLearnerAchievement?.icon).toBe('⚡');
    });

    it('should unlock "Graduation" achievement after 5 lessons', () => {
      const { result } = renderHook(() => useLearningStore());

      act(() => {
        result.current.completeLesson('lesson-1');
        result.current.completeLesson('lesson-2');
        result.current.completeLesson('lesson-3');
        result.current.completeLesson('lesson-4');
        result.current.completeLesson('lesson-5');
      });

      const graduationAchievement = result.current.achievements.find(a => a.id === 'graduation');
      expect(graduationAchievement).toBeDefined();
      expect(graduationAchievement?.name).toBe('Graduation');
      expect(graduationAchievement?.icon).toBe('🎓');
    });

    it('should not duplicate achievements', () => {
      const { result } = renderHook(() => useLearningStore());

      act(() => {
        result.current.completeLesson('lesson-1');
        result.current.completeLesson('lesson-2'); // Shouldn't unlock first-lesson again
      });

      const firstLessonAchievements = result.current.achievements.filter(a => a.id === 'first-lesson');
      expect(firstLessonAchievements).toHaveLength(1);
    });
  });

  describe('updateProgress', () => {
    it('should update lesson progress', () => {
      const { result } = renderHook(() => useLearningStore());

      act(() => {
        result.current.updateProgress('hello-world', 50);
      });

      expect(result.current.lessonProgress['hello-world']).toBe(50);
    });

    it('should clamp progress to 0-100 range', () => {
      const { result } = renderHook(() => useLearningStore());

      act(() => {
        result.current.updateProgress('lesson-1', -10);
        result.current.updateProgress('lesson-2', 150);
      });

      expect(result.current.lessonProgress['lesson-1']).toBe(0);
      expect(result.current.lessonProgress['lesson-2']).toBe(100);
    });
  });

  describe('unlockAchievement', () => {
    it('should unlock a custom achievement', () => {
      const { result } = renderHook(() => useLearningStore());

      act(() => {
        result.current.unlockAchievement('custom-achievement');
      });

      const achievement = result.current.achievements.find(a => a.id === 'custom-achievement');
      expect(achievement).toBeDefined();
    });

    it('should not duplicate manually unlocked achievements', () => {
      const { result } = renderHook(() => useLearningStore());

      act(() => {
        result.current.unlockAchievement('custom-achievement');
        result.current.unlockAchievement('custom-achievement');
      });

      const achievements = result.current.achievements.filter(a => a.id === 'custom-achievement');
      expect(achievements).toHaveLength(1);
    });
  });

  describe('setGamificationMode', () => {
    it('should set gamification mode', () => {
      const { result } = renderHook(() => useLearningStore());

      act(() => {
        result.current.setGamificationMode('full');
      });

      expect(result.current.gamificationMode).toBe('full');
    });

    it('should support all gamification modes', () => {
      const { result } = renderHook(() => useLearningStore());

      act(() => {
        result.current.setGamificationMode('off');
      });
      expect(result.current.gamificationMode).toBe('off');

      act(() => {
        result.current.setGamificationMode('basic');
      });
      expect(result.current.gamificationMode).toBe('basic');

      act(() => {
        result.current.setGamificationMode('full');
      });
      expect(result.current.gamificationMode).toBe('full');
    });
  });

  describe('dismissTour', () => {
    it('should dismiss the tour', () => {
      const { result } = renderHook(() => useLearningStore());

      act(() => {
        result.current.dismissTour();
      });

      expect(result.current.tourDismissed).toBe(true);
    });
  });

  describe('completeTour', () => {
    it('should mark a tour as completed', () => {
      const { result } = renderHook(() => useLearningStore());

      act(() => {
        result.current.completeTour('intro-tour');
      });

      expect(result.current.toursCompleted).toContain('intro-tour');
    });

    it('should not duplicate completed tours', () => {
      const { result } = renderHook(() => useLearningStore());

      act(() => {
        result.current.completeTour('intro-tour');
        result.current.completeTour('intro-tour');
      });

      expect(result.current.toursCompleted).toEqual(['intro-tour']);
    });
  });

  describe('reset', () => {
    it('should reset all state to initial values', () => {
      const { result } = renderHook(() => useLearningStore());

      act(() => {
        result.current.completeLesson('lesson-1');
        result.current.setGamificationMode('full');
        result.current.dismissTour();
        result.current.completeTour('intro-tour');
      });

      act(() => {
        result.current.reset();
      });

      expect(result.current.completedLessons).toEqual([]);
      expect(result.current.lessonProgress).toEqual({});
      expect(result.current.achievements).toEqual([]);
      expect(result.current.tourDismissed).toBe(false);
      expect(result.current.toursCompleted).toEqual([]);
      expect(result.current.gamificationMode).toBe('basic');
    });
  });
});

describe('Helper Functions', () => {
  beforeEach(() => {
    const { result } = renderHook(() => useLearningStore());
    act(() => {
      result.current.reset();
    });
  });

  describe('getLessonCompletion', () => {
    it('should return true for completed lessons', () => {
      const { result } = renderHook(() => useLearningStore());

      act(() => {
        result.current.completeLesson('hello-world');
      });

      expect(getLessonCompletion('hello-world')).toBe(true);
    });

    it('should return false for incomplete lessons', () => {
      expect(getLessonCompletion('hello-world')).toBe(false);
    });
  });

  describe('getLessonProgress', () => {
    it('should return progress for a lesson', () => {
      const { result } = renderHook(() => useLearningStore());

      act(() => {
        result.current.updateProgress('hello-world', 75);
      });

      expect(getLessonProgress('hello-world')).toBe(75);
    });

    it('should return 0 for lessons with no progress', () => {
      expect(getLessonProgress('hello-world')).toBe(0);
    });
  });

  describe('isGamificationEnabled', () => {
    it('should return true when gamification is basic or full', () => {
      const { result } = renderHook(() => useLearningStore());

      act(() => {
        result.current.setGamificationMode('basic');
      });
      expect(isGamificationEnabled()).toBe(true);

      act(() => {
        result.current.setGamificationMode('full');
      });
      expect(isGamificationEnabled()).toBe(true);
    });

    it('should return false when gamification is off', () => {
      const { result } = renderHook(() => useLearningStore());

      act(() => {
        result.current.setGamificationMode('off');
      });

      expect(isGamificationEnabled()).toBe(false);
    });
  });

  describe('isFullGamification', () => {
    it('should return true only when gamification is full', () => {
      const { result } = renderHook(() => useLearningStore());

      act(() => {
        result.current.setGamificationMode('full');
      });

      expect(isFullGamification()).toBe(true);
    });

    it('should return false for basic or off modes', () => {
      const { result } = renderHook(() => useLearningStore());

      act(() => {
        result.current.setGamificationMode('basic');
      });
      expect(isFullGamification()).toBe(false);

      act(() => {
        result.current.setGamificationMode('off');
      });
      expect(isFullGamification()).toBe(false);
    });
  });
});
