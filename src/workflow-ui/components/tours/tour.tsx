'use client';

/**
 * Tour Component - Interactive Guided Tours
 * Stage 9.5: Interactive Documentation & Learning - Day 3
 *
 * Features:
 * - Tooltip positioning relative to target elements
 * - Step navigation (Previous/Next/Skip)
 * - Backdrop/overlay for highlighting
 * - Keyboard navigation (Esc to exit, Arrow keys to navigate)
 * - Responsive positioning
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import type { Tour as TourType, TooltipPosition } from '@/types/tour';

interface TourProps {
  tour: TourType;
  currentStepIndex: number;
  onNext: () => void;
  onPrevious: () => void;
  onSkip: () => void;
  onComplete: () => void;
}

interface CalculatedTooltipPosition {
  top: number;
  left: number;
  position: TooltipPosition;
}

export function Tour({
  tour,
  currentStepIndex,
  onNext,
  onPrevious,
  onSkip,
  onComplete,
}: TourProps) {
  const [tooltipPosition, setTooltipPosition] = useState<CalculatedTooltipPosition | null>(null);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const currentStep = tour.steps[currentStepIndex];
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === tour.steps.length - 1;

  /**
   * Calculate tooltip position relative to target element
   */
  const calculatePosition = useCallback((target: Element, tooltip: HTMLElement | null) => {
    if (!tooltip) return null;

    const targetRect = target.getBoundingClientRect();
    const tooltipRect = tooltip.getBoundingClientRect();
    const preferredPosition = currentStep.position || 'bottom';

    const spacing = 16; // Gap between tooltip and target
    let top = 0;
    let left = 0;
    let finalPosition: TooltipPosition = preferredPosition;

    switch (preferredPosition) {
      case 'top':
        top = targetRect.top - tooltipRect.height - spacing;
        left = targetRect.left + (targetRect.width - tooltipRect.width) / 2;
        break;
      case 'bottom':
        top = targetRect.bottom + spacing;
        left = targetRect.left + (targetRect.width - tooltipRect.width) / 2;
        break;
      case 'left':
        top = targetRect.top + (targetRect.height - tooltipRect.height) / 2;
        left = targetRect.left - tooltipRect.width - spacing;
        break;
      case 'right':
        top = targetRect.top + (targetRect.height - tooltipRect.height) / 2;
        left = targetRect.right + spacing;
        break;
    }

    // Ensure tooltip stays within viewport
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    if (left < spacing) {
      left = spacing;
    } else if (left + tooltipRect.width > viewportWidth - spacing) {
      left = viewportWidth - tooltipRect.width - spacing;
    }

    if (top < spacing) {
      top = spacing;
    } else if (top + tooltipRect.height > viewportHeight - spacing) {
      top = viewportHeight - tooltipRect.height - spacing;
    }

    return { top, left, position: finalPosition };
  }, [currentStep.position]);

  /**
   * Update tooltip position when step changes or window resizes
   */
  useEffect(() => {
    const updatePosition = () => {
      const targetElement = document.querySelector(currentStep.target);
      if (!targetElement) {
        console.warn(`Tour target not found: ${currentStep.target}`);
        return;
      }

      const rect = targetElement.getBoundingClientRect();
      setTargetRect(rect);

      const position = calculatePosition(targetElement, tooltipRef.current);
      if (position) {
        setTooltipPosition(position);
      }
    };

    // Scroll target into view only once on step change (not on scroll events)
    const scrollToTarget = () => {
      const targetElement = document.querySelector(currentStep.target);
      if (targetElement) {
        targetElement.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
          inline: 'center',
        });
      }
    };

    // Initial scroll and position
    setTimeout(() => {
      scrollToTarget();
      // Update position after scroll animation completes
      setTimeout(updatePosition, 300);
    }, 100);

    // Update position on resize and scroll (without re-scrolling)
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);

    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [currentStep, calculatePosition]);

  /**
   * Call step callbacks
   */
  useEffect(() => {
    currentStep.onShow?.();
  }, [currentStep]);

  /**
   * Keyboard navigation
   */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          onSkip();
          break;
        case 'ArrowRight':
          if (!isLastStep) onNext();
          break;
        case 'ArrowLeft':
          if (!isFirstStep) onPrevious();
          break;
        case 'Enter':
          if (isLastStep) {
            onComplete();
          } else {
            onNext();
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFirstStep, isLastStep, onNext, onPrevious, onSkip, onComplete]);

  const handleNext = () => {
    currentStep.onNext?.();
    if (isLastStep) {
      onComplete();
    } else {
      onNext();
    }
  };

  if (!tooltipPosition || !targetRect) {
    return null;
  }

  return (
    <>
      {/* Backdrop overlay */}
      <div
        className="fixed inset-0 bg-black/50 z-40"
        data-testid="tour-backdrop"
        onClick={onSkip}
      />

      {/* Highlight cutout for target element */}
      <div
        className="fixed border-4 border-blue-500 rounded-lg z-40 pointer-events-none"
        style={{
          top: targetRect.top - 4,
          left: targetRect.left - 4,
          width: targetRect.width + 8,
          height: targetRect.height + 8,
        }}
        data-testid="tour-highlight"
      />

      {/* Tooltip */}
      <div
        ref={tooltipRef}
        className="fixed z-50 bg-white rounded-lg shadow-2xl p-6 max-w-md"
        style={{
          top: tooltipPosition.top,
          left: tooltipPosition.left,
        }}
        data-testid="tour-tooltip"
        role="dialog"
        aria-labelledby="tour-title"
        aria-describedby="tour-content"
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <h3 id="tour-title" className="text-lg font-semibold text-gray-900 pr-8">
            {currentStep.title}
          </h3>
          <button
            onClick={onSkip}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Skip tour"
            data-testid="tour-skip-button"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <p id="tour-content" className="text-gray-600 mb-4">
          {currentStep.content}
        </p>

        {/* Footer */}
        <div className="flex items-center justify-between">
          {/* Progress indicator */}
          <div className="text-sm text-gray-500" data-testid="tour-progress">
            Step {currentStepIndex + 1} of {tour.steps.length}
          </div>

          {/* Navigation buttons */}
          <div className="flex gap-2">
            {!isFirstStep && (
              <button
                onClick={onPrevious}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors flex items-center gap-1"
                data-testid="tour-previous-button"
              >
                <ChevronLeft className="w-4 h-4" />
                Previous
              </button>
            )}

            <button
              onClick={handleNext}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-500 rounded-md hover:bg-blue-600 transition-colors flex items-center gap-1"
              data-testid="tour-next-button"
            >
              {isLastStep ? 'Finish' : 'Next'}
              {!isLastStep && <ChevronRight className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
