/**
 * Training Store - Zustand store for spec-driven development training
 * Tracks exercise completion, metrics, and certificate eligibility
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface ExerciseMetrics {
  startTime?: string;
  endTime?: string;
  // Workflow
  primaryLanguage?: string;
  usedAI?: boolean;
  workflowStyle?: string;
  // Time
  totalMinutes?: number;
  // Context
  reExplanations?: number;
  lostContext?: boolean;
  hadToCorrect?: boolean;
  // Quality
  hasTests?: boolean;
  testCoverage?: number;
  testsFirst?: boolean;
  gatesPassed?: boolean;
  stageCompleted?: boolean;
  proofFileExists?: boolean;
  // Satisfaction
  confidence?: number;
  productionReady?: boolean;
  // Context Recovery (Exercise 3)
  contextRecoveryMinutes?: number;
  contextRecoverySeconds?: number;
}

export interface TrainingState {
  // Exercise completion
  completedExercises: string[];
  exerciseMetrics: Record<string, ExerciseMetrics>;
  currentExercise: string | null;

  // Certificate
  certificateIssued: boolean;
  certificateDate?: string;
  certificateName?: string;
  certificateId?: string;

  // Quarterly objective
  realProjectStarted: boolean;
  realProjectName?: string;
  findingsShared: boolean;

  // Actions
  startExercise: (id: string) => void;
  completeExercise: (id: string, metrics: ExerciseMetrics) => void;
  updateMetrics: (id: string, metrics: Partial<ExerciseMetrics>) => void;
  issueCertificate: (name: string) => void;
  startRealProject: (name: string) => void;
  markFindingsShared: () => void;
  reset: () => void;
}

const initialState = {
  completedExercises: [] as string[],
  exerciseMetrics: {} as Record<string, ExerciseMetrics>,
  currentExercise: null as string | null,
  certificateIssued: false,
  certificateDate: undefined,
  certificateName: undefined,
  certificateId: undefined,
  realProjectStarted: false,
  realProjectName: undefined,
  findingsShared: false,
};

function generateCertificateId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `SDD-${timestamp}-${random}`.toUpperCase();
}

export const useTrainingStore = create<TrainingState>()(
  persist(
    (set) => ({
      ...initialState,

      startExercise: (id: string) => {
        set((state) => ({
          currentExercise: id,
          exerciseMetrics: {
            ...state.exerciseMetrics,
            [id]: {
              ...state.exerciseMetrics[id],
              startTime: new Date().toISOString(),
            },
          },
        }));
      },

      completeExercise: (id: string, metrics: ExerciseMetrics) => {
        set((state) => {
          if (state.completedExercises.includes(id)) {
            return {
              exerciseMetrics: {
                ...state.exerciseMetrics,
                [id]: { ...state.exerciseMetrics[id], ...metrics },
              },
            };
          }

          return {
            completedExercises: [...state.completedExercises, id],
            currentExercise: null,
            exerciseMetrics: {
              ...state.exerciseMetrics,
              [id]: {
                ...state.exerciseMetrics[id],
                ...metrics,
                endTime: new Date().toISOString(),
              },
            },
          };
        });
      },

      updateMetrics: (id: string, metrics: Partial<ExerciseMetrics>) => {
        set((state) => ({
          exerciseMetrics: {
            ...state.exerciseMetrics,
            [id]: { ...state.exerciseMetrics[id], ...metrics },
          },
        }));
      },

      issueCertificate: (name: string) => {
        set({
          certificateIssued: true,
          certificateDate: new Date().toISOString(),
          certificateName: name,
          certificateId: generateCertificateId(),
        });
      },

      startRealProject: (name: string) => {
        set({
          realProjectStarted: true,
          realProjectName: name,
        });
      },

      markFindingsShared: () => {
        set({ findingsShared: true });
      },

      reset: () => {
        set(initialState);
      },
    }),
    {
      name: 'sdd-training-storage',
      version: 1,
    }
  )
);

// Helper to check if all exercises are complete
export function areAllExercisesComplete(): boolean {
  const state = useTrainingStore.getState();
  return (
    state.completedExercises.includes('baseline') &&
    state.completedExercises.includes('spec-driven') &&
    state.completedExercises.includes('context-recovery')
  );
}

// Helper to check quarterly objective completion
export function getQuarterlyProgress(): {
  training: boolean;
  realProject: boolean;
  documented: boolean;
  shared: boolean;
  percentage: number;
} {
  const state = useTrainingStore.getState();
  const training = areAllExercisesComplete();
  const realProject = state.realProjectStarted;
  const documented = Object.keys(state.exerciseMetrics).length >= 3;
  const shared = state.findingsShared;

  const completed = [training, realProject, documented, shared].filter(Boolean).length;

  return {
    training,
    realProject,
    documented,
    shared,
    percentage: (completed / 4) * 100,
  };
}
