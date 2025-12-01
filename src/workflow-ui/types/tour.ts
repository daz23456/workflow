/**
 * Tour Types
 * Stage 9.5: Interactive Documentation & Learning - Day 3
 */

export type TourId = 'playground-intro' | 'workflow-intro' | 'task-details-intro';

export type TooltipPosition = 'top' | 'bottom' | 'left' | 'right';

export interface TourStep {
  /** Unique identifier for this step */
  id: string;

  /** Element selector to highlight (e.g., '[data-tour="lesson-grid"]') */
  target: string;

  /** Title shown in the tooltip */
  title: string;

  /** Description/content of the tooltip */
  content: string;

  /** Preferred position of the tooltip relative to target */
  position?: TooltipPosition;

  /** Optional action to perform when this step is shown */
  onShow?: () => void;

  /** Optional action to perform when moving to next step */
  onNext?: () => void;
}

export interface Tour {
  /** Unique identifier for this tour */
  id: TourId;

  /** Display name of the tour */
  name: string;

  /** Brief description */
  description: string;

  /** Steps in this tour */
  steps: TourStep[];

  /** Should this tour auto-start for first-time users? */
  autoStart?: boolean;
}

export interface TourState {
  /** Currently active tour ID */
  activeTourId: TourId | null;

  /** Current step index (0-based) */
  currentStepIndex: number;

  /** Is tour currently running? */
  isRunning: boolean;
}
