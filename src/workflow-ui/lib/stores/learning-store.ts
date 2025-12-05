/**
 * Learning Store - Zustand store for learning progress with localStorage persistence
 * Stage 9.5: Interactive Documentation & Learning - Day 2
 *
 * Features:
 * - Lesson progress tracking
 * - Achievement unlocking
 * - Tour completion tracking
 * - Gamification mode (off/basic/full)
 * - localStorage persistence
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { GamificationMode, Achievement } from '@/types/learning';

interface LearningState {
  // Hydration state (to prevent SSR/client mismatch)
  _hasHydrated: boolean;

  // Progress tracking
  completedLessons: string[];
  lessonProgress: Record<string, number>;
  achievements: Achievement[];

  // Tour state
  tourDismissed: boolean;
  toursCompleted: string[];

  // Gamification settings
  gamificationMode: GamificationMode;

  // Actions
  completeLesson: (id: string) => void;
  updateProgress: (id: string, progress: number) => void;
  unlockAchievement: (id: string) => void;
  setGamificationMode: (mode: GamificationMode) => void;
  dismissTour: () => void;
  completeTour: (tourId: string) => void;
  reset: () => void;
  setHasHydrated: (state: boolean) => void;
}

const initialState = {
  _hasHydrated: false,
  completedLessons: [] as string[],
  lessonProgress: {} as Record<string, number>,
  achievements: [] as Achievement[],
  tourDismissed: false,
  toursCompleted: [] as string[],
  gamificationMode: 'basic' as GamificationMode,
};

/**
 * Learning store with localStorage persistence
 *
 * Usage:
 * ```tsx
 * const { completedLessons, completeLesson } = useLearningStore();
 *
 * // Complete a lesson
 * completeLesson('hello-world');
 *
 * // Update progress
 * updateProgress('hello-world', 50); // 50% complete
 *
 * // Unlock achievement
 * unlockAchievement('first-workflow');
 * ```
 */
export const useLearningStore = create<LearningState>()(
  persist(
    (set, get) => ({
      ...initialState,

      /**
       * Mark a lesson as completed
       */
      completeLesson: (id: string) => {
        set((state) => {
          if (state.completedLessons.includes(id)) {
            return state; // Already completed
          }

          const newCompletedLessons = [...state.completedLessons, id];
          const newLessonProgress = {
            ...state.lessonProgress,
            [id]: 100,
          };

          // Auto-unlock achievements based on lesson count
          const achievements = [...state.achievements];
          const lessonCount = newCompletedLessons.length;

          // Check if we should unlock achievements
          if (lessonCount === 1 && !achievements.some(a => a.id === 'first-lesson')) {
            achievements.push({
              id: 'first-lesson',
              name: 'First Steps',
              description: 'Completed your first lesson',
              icon: '🎯',
              unlockedAt: new Date(),
              condition: {
                type: 'lesson-completed',
                threshold: 1,
              },
            });
          }

          if (lessonCount === 3 && !achievements.some(a => a.id === 'quick-learner')) {
            achievements.push({
              id: 'quick-learner',
              name: 'Quick Learner',
              description: 'Completed 3 lessons',
              icon: '⚡',
              unlockedAt: new Date(),
              condition: {
                type: 'lesson-completed',
                threshold: 3,
              },
            });
          }

          if (lessonCount === 5 && !achievements.some(a => a.id === 'graduation')) {
            achievements.push({
              id: 'graduation',
              name: 'Graduation',
              description: 'Completed all lessons',
              icon: '🎓',
              unlockedAt: new Date(),
              condition: {
                type: 'lesson-completed',
                threshold: 5,
              },
            });
          }

          return {
            completedLessons: newCompletedLessons,
            lessonProgress: newLessonProgress,
            achievements,
          };
        });
      },

      /**
       * Update lesson progress (0-100)
       */
      updateProgress: (id: string, progress: number) => {
        set((state) => ({
          lessonProgress: {
            ...state.lessonProgress,
            [id]: Math.min(100, Math.max(0, progress)),
          },
        }));
      },

      /**
       * Unlock an achievement
       */
      unlockAchievement: (id: string) => {
        set((state) => {
          if (state.achievements.some(a => a.id === id)) {
            return state; // Already unlocked
          }

          // This is a manual achievement unlock
          // (auto-unlocks happen in completeLesson)
          const newAchievement: Achievement = {
            id,
            name: id,
            description: '',
            icon: '🏆',
            unlockedAt: new Date(),
            condition: {
              type: 'workflow-created',
            },
          };

          return {
            achievements: [...state.achievements, newAchievement],
          };
        });
      },

      /**
       * Set gamification mode (off, basic, full)
       */
      setGamificationMode: (mode: GamificationMode) => {
        set({ gamificationMode: mode });
      },

      /**
       * Dismiss the intro tour
       */
      dismissTour: () => {
        set({ tourDismissed: true });
      },

      /**
       * Mark a tour as completed
       */
      completeTour: (tourId: string) => {
        set((state) => {
          if (state.toursCompleted.includes(tourId)) {
            return state;
          }

          return {
            toursCompleted: [...state.toursCompleted, tourId],
          };
        });
      },

      /**
       * Reset all learning progress (useful for testing)
       */
      reset: () => {
        set({ ...initialState, _hasHydrated: true });
      },

      /**
       * Set hydration state (called after rehydration from localStorage)
       */
      setHasHydrated: (state: boolean) => {
        set({ _hasHydrated: state });
      },
    }),
    {
      name: 'learning-storage', // localStorage key
      version: 1,
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);

/**
 * Helper: Get lesson completion status
 */
export function getLessonCompletion(lessonId: string): boolean {
  return useLearningStore.getState().completedLessons.includes(lessonId);
}

/**
 * Helper: Get lesson progress percentage
 */
export function getLessonProgress(lessonId: string): number {
  return useLearningStore.getState().lessonProgress[lessonId] || 0;
}

/**
 * Helper: Check if gamification is enabled
 */
export function isGamificationEnabled(): boolean {
  const mode = useLearningStore.getState().gamificationMode;
  return mode !== 'off';
}

/**
 * Helper: Check if full gamification is enabled
 */
export function isFullGamification(): boolean {
  return useLearningStore.getState().gamificationMode === 'full';
}
