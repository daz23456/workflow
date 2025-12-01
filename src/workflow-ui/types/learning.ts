/**
 * Types for Stage 9.5: Interactive Documentation & Learning
 */

// Help System Types
export interface HelpTopic {
  id: string;
  title: string;
  content: string;
  examples?: string[];
  links?: Array<{
    text: string;
    url: string;
  }>;
  keywords?: string[];
}

export type HelpTopicId =
  | 'workflow-name'
  | 'task-label'
  | 'task-reference'
  | 'task-description'
  | 'search-tasks'
  | 'category-filter'
  | 'execute-vs-test'
  | 'input-types'
  | 'required-fields'
  | 'parallel-execution'
  | 'task-dependencies'
  | 'template-syntax'
  | 'output-mapping'
  | 'connection-handles'
  | 'validation-errors';

// Lesson Types
export interface Lesson {
  id: string;
  title: string;
  description: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedTime: number; // minutes
  order: number;
  objectives: string[];
  content: {
    introduction: string;
    steps: LessonStep[];
    summary: string;
  };
  yaml: string; // Example workflow YAML
  successCriteria: string[];
}

export interface LessonStep {
  title: string;
  description: string;
  codeExample?: string;
  tips?: string[];
}

// Tour Types
export interface Tour {
  id: string;
  name: string;
  description: string;
  steps: TourStep[];
  triggerCondition?: 'first-visit' | 'manual' | 'feature-discovery';
}

export interface TourStep {
  element: string; // CSS selector
  popover: {
    title: string;
    description: string;
    side?: 'top' | 'bottom' | 'left' | 'right';
    align?: 'start' | 'center' | 'end';
  };
}

// Gamification Types
export type GamificationMode = 'off' | 'basic' | 'full';

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlockedAt?: Date;
  condition: {
    type: 'workflow-created' | 'template-used' | 'lesson-completed' | 'tour-completed' | 'task-count' | 'dependency-count';
    threshold?: number;
    value?: string;
  };
}

export interface LearningProgress {
  completedLessons: string[];
  lessonProgress: Record<string, number>; // lessonId -> % complete (0-100)
  completedTours: string[];
  achievements: Achievement[];
  lastActivityAt: Date;
}

// Store State Types
export interface LearningStore {
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
}
