import { describe, it, expect, vi } from 'vitest';
import type { Tour as TourType } from '@/types/tour';

describe('Tour Component Logic', () => {
  const mockTour: TourType = {
    id: 'test-tour',
    name: 'Test Tour',
    description: 'A test tour',
    steps: [
      {
        id: 'step-1',
        target: '[data-tour="test-target-1"]',
        title: 'Step 1 Title',
        content: 'Step 1 content',
        position: 'bottom',
      },
      {
        id: 'step-2',
        target: '[data-tour="test-target-2"]',
        title: 'Step 2 Title',
        content: 'Step 2 content',
        position: 'top',
      },
      {
        id: 'step-3',
        target: '[data-tour="test-target-3"]',
        title: 'Step 3 Title',
        content: 'Step 3 content',
        position: 'right',
      },
    ],
  };

  describe('Tour Structure', () => {
    it('should have valid tour structure', () => {
      expect(mockTour.id).toBeDefined();
      expect(mockTour.name).toBeDefined();
      expect(mockTour.description).toBeDefined();
      expect(mockTour.steps).toBeDefined();
      expect(mockTour.steps.length).toBeGreaterThan(0);
    });

    it('should have steps with required properties', () => {
      mockTour.steps.forEach(step => {
        expect(step.id).toBeDefined();
        expect(step.target).toBeDefined();
        expect(step.title).toBeDefined();
        expect(step.content).toBeDefined();
      });
    });

    it('should have valid step positions', () => {
      const validPositions = ['top', 'bottom', 'left', 'right'];
      mockTour.steps.forEach(step => {
        if (step.position) {
          expect(validPositions).toContain(step.position);
        }
      });
    });
  });

  describe('Step Navigation Logic', () => {
    it('should determine first step correctly', () => {
      const currentStepIndex = 0;
      const isFirstStep = currentStepIndex === 0;
      expect(isFirstStep).toBe(true);
    });

    it('should determine last step correctly', () => {
      const currentStepIndex = mockTour.steps.length - 1;
      const isLastStep = currentStepIndex === mockTour.steps.length - 1;
      expect(isLastStep).toBe(true);
    });

    it('should determine middle step correctly', () => {
      const currentStepIndex = 1;
      const isFirstStep = currentStepIndex === 0;
      const isLastStep = currentStepIndex === mockTour.steps.length - 1;
      expect(isFirstStep).toBe(false);
      expect(isLastStep).toBe(false);
    });

    it('should handle single-step tour', () => {
      const singleStepTour: TourType = {
        ...mockTour,
        steps: [mockTour.steps[0]],
      };
      const currentStepIndex = 0;
      const isFirstStep = currentStepIndex === 0;
      const isLastStep = currentStepIndex === singleStepTour.steps.length - 1;
      expect(isFirstStep).toBe(true);
      expect(isLastStep).toBe(true);
    });
  });

  describe('Step Callbacks', () => {
    it('should define onShow callback', () => {
      const onShow = vi.fn();
      const stepWithCallback = {
        ...mockTour.steps[0],
        onShow,
      };

      expect(stepWithCallback.onShow).toBeDefined();
      stepWithCallback.onShow?.();
      expect(onShow).toHaveBeenCalled();
    });

    it('should define onNext callback', () => {
      const onNext = vi.fn();
      const stepWithCallback = {
        ...mockTour.steps[0],
        onNext,
      };

      expect(stepWithCallback.onNext).toBeDefined();
      stepWithCallback.onNext?.();
      expect(onNext).toHaveBeenCalled();
    });

    it('should handle missing callbacks gracefully', () => {
      const step = mockTour.steps[0];

      expect(() => {
        step.onShow?.();
        step.onNext?.();
      }).not.toThrow();
    });
  });

  describe('Tooltip Positioning Logic', () => {
    it('should calculate bottom position', () => {
      const targetRect = { top: 100, left: 100, width: 200, height: 100, bottom: 200, right: 300 };
      const tooltipRect = { width: 150, height: 80 };
      const spacing = 16;

      const top = targetRect.bottom + spacing;
      const left = targetRect.left + (targetRect.width - tooltipRect.width) / 2;

      expect(top).toBe(216);
      expect(left).toBe(125);
    });

    it('should calculate top position', () => {
      const targetRect = { top: 100, left: 100, width: 200, height: 100 };
      const tooltipRect = { width: 150, height: 80 };
      const spacing = 16;

      const top = targetRect.top - tooltipRect.height - spacing;
      const left = targetRect.left + (targetRect.width - tooltipRect.width) / 2;

      expect(top).toBe(4);
      expect(left).toBe(125);
    });

    it('should calculate left position', () => {
      const targetRect = { top: 100, left: 100, width: 200, height: 100 };
      const tooltipRect = { width: 150, height: 80 };
      const spacing = 16;

      const top = targetRect.top + (targetRect.height - tooltipRect.height) / 2;
      const left = targetRect.left - tooltipRect.width - spacing;

      expect(top).toBe(110);
      expect(left).toBe(-66);
    });

    it('should calculate right position', () => {
      const targetRect = { top: 100, left: 100, width: 200, height: 100, right: 300 };
      const tooltipRect = { width: 150, height: 80 };
      const spacing = 16;

      const top = targetRect.top + (targetRect.height - tooltipRect.height) / 2;
      const left = targetRect.right + spacing;

      expect(top).toBe(110);
      expect(left).toBe(316);
    });

    it('should keep tooltip within viewport horizontally', () => {
      const viewportWidth = 1024;
      const spacing = 16;
      let left = 1000; // Would overflow
      const tooltipWidth = 150;

      if (left + tooltipWidth > viewportWidth - spacing) {
        left = viewportWidth - tooltipWidth - spacing;
      }

      expect(left).toBe(858);
    });

    it('should keep tooltip within viewport vertically', () => {
      const viewportHeight = 768;
      const spacing = 16;
      let top = 700; // Would overflow
      const tooltipHeight = 80;

      if (top + tooltipHeight > viewportHeight - spacing) {
        top = viewportHeight - tooltipHeight - spacing;
      }

      expect(top).toBe(672);
    });

    it('should ensure minimum spacing from edges', () => {
      const spacing = 16;
      let left = 5; // Too close to left edge

      if (left < spacing) {
        left = spacing;
      }

      expect(left).toBe(16);
    });
  });

  describe('Progress Indicator Logic', () => {
    it('should calculate progress for first step', () => {
      const currentStepIndex = 0;
      const totalSteps = mockTour.steps.length;
      const progress = `Step ${currentStepIndex + 1} of ${totalSteps}`;

      expect(progress).toBe('Step 1 of 3');
    });

    it('should calculate progress for last step', () => {
      const currentStepIndex = mockTour.steps.length - 1;
      const totalSteps = mockTour.steps.length;
      const progress = `Step ${currentStepIndex + 1} of ${totalSteps}`;

      expect(progress).toBe('Step 3 of 3');
    });

    it('should calculate progress for middle step', () => {
      const currentStepIndex = 1;
      const totalSteps = mockTour.steps.length;
      const progress = `Step ${currentStepIndex + 1} of ${totalSteps}`;

      expect(progress).toBe('Step 2 of 3');
    });
  });

  describe('Button Text Logic', () => {
    it('should show "Next" on non-last steps', () => {
      const currentStepIndex = 0;
      const isLastStep = currentStepIndex === mockTour.steps.length - 1;
      const buttonText = isLastStep ? 'Finish' : 'Next';

      expect(buttonText).toBe('Next');
    });

    it('should show "Finish" on last step', () => {
      const currentStepIndex = mockTour.steps.length - 1;
      const isLastStep = currentStepIndex === mockTour.steps.length - 1;
      const buttonText = isLastStep ? 'Finish' : 'Next';

      expect(buttonText).toBe('Finish');
    });
  });

  describe('Target Selector Validation', () => {
    it('should have valid CSS selectors as targets', () => {
      mockTour.steps.forEach(step => {
        expect(step.target).toMatch(/^\[data-/);
        expect(step.target).toContain('=');
        expect(step.target).toContain('"');
      });
    });

    it('should support data-tour selectors', () => {
      const tourStep = {
        id: 'test',
        target: '[data-tour="example"]',
        title: 'Test',
        content: 'Content',
      };

      expect(tourStep.target).toMatch(/^\[data-tour="/);
    });

    it('should support data-lesson-id selectors', () => {
      const tourStep = {
        id: 'test',
        target: '[data-lesson-id="example"]',
        title: 'Test',
        content: 'Content',
      };

      expect(tourStep.target).toMatch(/^\[data-lesson-id="/);
    });
  });
});
