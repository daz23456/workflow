/**
 * Tour Definitions
 * Stage 9.5: Interactive Documentation & Learning - Day 3
 *
 * Pre-defined guided tours for different parts of the application
 */

import type { Tour } from '@/types/tour';

/**
 * Playground Introduction Tour
 * First-time user tour for the Interactive Playground
 */
export const PLAYGROUND_INTRO_TOUR: Tour = {
  id: 'playground-intro',
  name: 'Welcome to the Playground!',
  description: 'Learn how to use the interactive lessons',
  autoStart: true,
  steps: [
    {
      id: 'welcome',
      target: '[data-tour="playground-header"]',
      title: 'Welcome to the Interactive Playground! 🎓',
      content: 'This is your personal learning space where you can master workflow orchestration through hands-on lessons.',
      position: 'bottom',
    },
    {
      id: 'progress-stats',
      target: '[data-tour="completion-stats"]',
      title: 'Track Your Progress',
      content: 'See how many lessons you\'ve completed and watch your progress grow!',
      position: 'left',
    },
    {
      id: 'difficulty-filters',
      target: '[data-tour="difficulty-filters"]',
      title: 'Filter by Difficulty',
      content: 'Start with Beginner lessons, then progress to Intermediate and Advanced as you learn.',
      position: 'bottom',
    },
    {
      id: 'lesson-grid',
      target: '[data-tour="lessons-grid"]',
      title: 'Choose Your Lesson',
      content: 'Each lesson includes step-by-step instructions, live code editing, and success criteria to guide you.',
      position: 'top',
    },
    {
      id: 'first-lesson',
      target: '[data-lesson-id="hello-world"]',
      title: 'Start Here!',
      content: 'Click on "Hello World" to begin your journey. It\'s a great introduction to workflow orchestration.',
      position: 'right',
    },
  ],
};

/**
 * Workflow Introduction Tour
 * First-time user tour for the Workflows page
 */
export const WORKFLOW_INTRO_TOUR: Tour = {
  id: 'workflow-intro',
  name: 'Workflows Overview',
  description: 'Learn about workflow management',
  autoStart: true,
  steps: [
    {
      id: 'workflow-list',
      target: '[data-tour="workflow-list"]',
      title: 'Your Workflows',
      content: 'This is where all your workflows live. Each workflow is a collection of tasks executed in a specific order.',
      position: 'bottom',
    },
    {
      id: 'workflow-search',
      target: '[data-tour="workflow-search"]',
      title: 'Quick Search',
      content: 'Find workflows quickly by name or filter by status.',
      position: 'bottom',
    },
    {
      id: 'workflow-card',
      target: '[data-tour="workflow-card"]:first-child',
      title: 'Workflow Details',
      content: 'Click any workflow to see its execution graph, history, and performance metrics.',
      position: 'right',
    },
  ],
};

/**
 * Task Details Tour
 * Tour for the Task Details page
 */
export const TASK_DETAILS_INTRO_TOUR: Tour = {
  id: 'task-details-intro',
  name: 'Task Analytics',
  description: 'Understand task performance',
  autoStart: false, // Don't auto-start, user must trigger manually
  steps: [
    {
      id: 'task-stats',
      target: '[data-tour="task-stats"]',
      title: 'Task Statistics',
      content: 'See how often this task is used, success rates, and average execution time.',
      position: 'bottom',
    },
    {
      id: 'execution-history',
      target: '[data-tour="execution-history"]',
      title: 'Execution History',
      content: 'Review past executions, identify failures, and spot patterns.',
      position: 'top',
    },
    {
      id: 'duration-trends',
      target: '[data-tour="duration-trends"]',
      title: 'Performance Trends',
      content: 'Track how execution time changes over time to catch performance regressions.',
      position: 'top',
    },
  ],
};

/**
 * Get all available tours
 */
export const ALL_TOURS: Tour[] = [
  PLAYGROUND_INTRO_TOUR,
  WORKFLOW_INTRO_TOUR,
  TASK_DETAILS_INTRO_TOUR,
];

/**
 * Get tour by ID
 */
export function getTourById(id: string): Tour | undefined {
  return ALL_TOURS.find(tour => tour.id === id);
}

/**
 * Get tours that should auto-start
 */
export function getAutoStartTours(): Tour[] {
  return ALL_TOURS.filter(tour => tour.autoStart === true);
}
