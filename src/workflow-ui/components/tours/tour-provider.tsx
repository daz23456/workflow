'use client';

/**
 * TourProvider - Global Tour State Management
 * Stage 9.5: Interactive Documentation & Learning - Day 3
 *
 * Features:
 * - Manages active tour state globally
 * - Auto-starts tours for first-time users
 * - Persists tour completion via learning store
 * - Provides hooks for triggering tours from any component
 */

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Tour } from './tour';
import { getTourById, getAutoStartTours } from './tour-definitions';
import { useLearningStore } from '@/lib/stores/learning-store';
import type { TourId, Tour as TourType } from '@/types/tour';

interface TourContextValue {
  /** Start a tour by ID */
  startTour: (tourId: TourId) => void;

  /** Stop the current tour */
  stopTour: () => void;

  /** Is a tour currently running? */
  isRunning: boolean;

  /** Current tour ID (if any) */
  currentTourId: TourId | null;
}

const TourContext = createContext<TourContextValue | undefined>(undefined);

interface TourProviderProps {
  children: ReactNode;
}

export function TourProvider({ children }: TourProviderProps) {
  const { toursCompleted, completeTour, tourDismissed, dismissTour, _hasHydrated } = useLearningStore();
  const [activeTour, setActiveTour] = useState<TourType | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  /**
   * Auto-start tours for first-time users
   */
  useEffect(() => {
    // Wait for hydration to complete before auto-starting tours
    if (!_hasHydrated) return;

    // Don't auto-start if tour was dismissed
    if (tourDismissed) return;

    // Find first auto-start tour that hasn't been completed
    const autoStartTours = getAutoStartTours();
    const nextTour = autoStartTours.find(tour => !toursCompleted.includes(tour.id));

    if (nextTour) {
      // Small delay to ensure DOM is ready
      setTimeout(() => {
        setActiveTour(nextTour);
        setCurrentStepIndex(0);
      }, 500);
    }
  }, [toursCompleted, tourDismissed, _hasHydrated]);

  const startTour = (tourId: TourId) => {
    const tour = getTourById(tourId);
    if (tour) {
      setActiveTour(tour);
      setCurrentStepIndex(0);
    }
  };

  const stopTour = () => {
    setActiveTour(null);
    setCurrentStepIndex(0);
  };

  const handleNext = () => {
    if (!activeTour) return;

    if (currentStepIndex < activeTour.steps.length - 1) {
      setCurrentStepIndex(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(prev => prev - 1);
    }
  };

  const handleSkip = () => {
    if (activeTour) {
      // Mark tour as dismissed if it's an auto-start tour
      if (activeTour.autoStart) {
        dismissTour();
      }
    }
    stopTour();
  };

  const handleComplete = () => {
    if (activeTour) {
      completeTour(activeTour.id);
    }
    stopTour();
  };

  const contextValue: TourContextValue = {
    startTour,
    stopTour,
    isRunning: activeTour !== null,
    currentTourId: activeTour?.id || null,
  };

  return (
    <TourContext.Provider value={contextValue}>
      {children}
      {activeTour && (
        <Tour
          tour={activeTour}
          currentStepIndex={currentStepIndex}
          onNext={handleNext}
          onPrevious={handlePrevious}
          onSkip={handleSkip}
          onComplete={handleComplete}
        />
      )}
    </TourContext.Provider>
  );
}

/**
 * Hook to access tour context
 */
export function useTour() {
  const context = useContext(TourContext);
  if (!context) {
    throw new Error('useTour must be used within TourProvider');
  }
  return context;
}
