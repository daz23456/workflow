import { describe, it, expect } from 'vitest';
import {
  PLAYGROUND_INTRO_TOUR,
  WORKFLOW_INTRO_TOUR,
  TASK_DETAILS_INTRO_TOUR,
  getTourById,
  getAutoStartTours,
} from './tour-definitions';

describe('Tour Definitions', () => {
  describe('PLAYGROUND_INTRO_TOUR', () => {
    it('should have correct id and name', () => {
      expect(PLAYGROUND_INTRO_TOUR.id).toBe('playground-intro');
      expect(PLAYGROUND_INTRO_TOUR.name).toBe('Welcome to the Playground!');
    });

    it('should have autoStart enabled', () => {
      expect(PLAYGROUND_INTRO_TOUR.autoStart).toBe(true);
    });

    it('should have 5 steps', () => {
      expect(PLAYGROUND_INTRO_TOUR.steps).toHaveLength(5);
    });

    it('should have unique step ids', () => {
      const stepIds = PLAYGROUND_INTRO_TOUR.steps.map(step => step.id);
      const uniqueIds = new Set(stepIds);
      expect(uniqueIds.size).toBe(stepIds.length);
    });

    it('should have valid target selectors', () => {
      PLAYGROUND_INTRO_TOUR.steps.forEach(step => {
        expect(step.target).toBeTruthy();
        // Target selectors can be either [data-tour=...] or [data-lesson-id=...]
        expect(step.target).toMatch(/^\[data-(tour|lesson-id)=/);
      });
    });

    it('should have titles and content for all steps', () => {
      PLAYGROUND_INTRO_TOUR.steps.forEach(step => {
        expect(step.title).toBeTruthy();
        expect(step.content).toBeTruthy();
        expect(step.title.length).toBeGreaterThan(0);
        expect(step.content.length).toBeGreaterThan(0);
      });
    });
  });

  describe('WORKFLOW_INTRO_TOUR', () => {
    it('should have correct id and name', () => {
      expect(WORKFLOW_INTRO_TOUR.id).toBe('workflow-intro');
      expect(WORKFLOW_INTRO_TOUR.name).toBe('Workflows Overview');
    });

    it('should have autoStart enabled', () => {
      expect(WORKFLOW_INTRO_TOUR.autoStart).toBe(true);
    });

    it('should have 3 steps', () => {
      expect(WORKFLOW_INTRO_TOUR.steps).toHaveLength(3);
    });

    it('should have unique step ids', () => {
      const stepIds = WORKFLOW_INTRO_TOUR.steps.map(step => step.id);
      const uniqueIds = new Set(stepIds);
      expect(uniqueIds.size).toBe(stepIds.length);
    });

    it('should have valid target selectors', () => {
      WORKFLOW_INTRO_TOUR.steps.forEach(step => {
        expect(step.target).toBeTruthy();
        // Target selectors can be either [data-tour=...] or [data-lesson-id=...]
        expect(step.target).toMatch(/^\[data-(tour|lesson-id)=/);
      });
    });
  });

  describe('TASK_DETAILS_INTRO_TOUR', () => {
    it('should have correct id and name', () => {
      expect(TASK_DETAILS_INTRO_TOUR.id).toBe('task-details-intro');
      expect(TASK_DETAILS_INTRO_TOUR.name).toBe('Task Analytics');
    });

    it('should NOT have autoStart enabled', () => {
      expect(TASK_DETAILS_INTRO_TOUR.autoStart).toBe(false);
    });

    it('should have 3 steps', () => {
      expect(TASK_DETAILS_INTRO_TOUR.steps).toHaveLength(3);
    });

    it('should have unique step ids', () => {
      const stepIds = TASK_DETAILS_INTRO_TOUR.steps.map(step => step.id);
      const uniqueIds = new Set(stepIds);
      expect(uniqueIds.size).toBe(stepIds.length);
    });
  });

  describe('getTourById', () => {
    it('should return playground tour by id', () => {
      const tour = getTourById('playground-intro');
      expect(tour).toBeDefined();
      expect(tour?.id).toBe('playground-intro');
    });

    it('should return workflow tour by id', () => {
      const tour = getTourById('workflow-intro');
      expect(tour).toBeDefined();
      expect(tour?.id).toBe('workflow-intro');
    });

    it('should return task details tour by id', () => {
      const tour = getTourById('task-details-intro');
      expect(tour).toBeDefined();
      expect(tour?.id).toBe('task-details-intro');
    });

    it('should return undefined for invalid tour id', () => {
      // @ts-expect-error - testing invalid input
      const tour = getTourById('invalid-tour-id');
      expect(tour).toBeUndefined();
    });
  });

  describe('getAutoStartTours', () => {
    it('should return only tours with autoStart enabled', () => {
      const autoStartTours = getAutoStartTours();
      expect(autoStartTours).toHaveLength(2);
      autoStartTours.forEach(tour => {
        expect(tour.autoStart).toBe(true);
      });
    });

    it('should include playground tour', () => {
      const autoStartTours = getAutoStartTours();
      const playgroundTour = autoStartTours.find(t => t.id === 'playground-intro');
      expect(playgroundTour).toBeDefined();
    });

    it('should include workflow tour', () => {
      const autoStartTours = getAutoStartTours();
      const workflowTour = autoStartTours.find(t => t.id === 'workflow-intro');
      expect(workflowTour).toBeDefined();
    });

    it('should NOT include task details tour', () => {
      const autoStartTours = getAutoStartTours();
      const taskDetailsTour = autoStartTours.find(t => t.id === 'task-details-intro');
      expect(taskDetailsTour).toBeUndefined();
    });
  });

  describe('Tour step positions', () => {
    it('should have valid positions when specified', () => {
      const validPositions = ['top', 'bottom', 'left', 'right'];

      [...PLAYGROUND_INTRO_TOUR.steps, ...WORKFLOW_INTRO_TOUR.steps, ...TASK_DETAILS_INTRO_TOUR.steps].forEach(step => {
        if (step.position) {
          expect(validPositions).toContain(step.position);
        }
      });
    });
  });

  describe('All tours', () => {
    it('should have unique tour IDs', () => {
      const tourIds = [
        PLAYGROUND_INTRO_TOUR.id,
        WORKFLOW_INTRO_TOUR.id,
        TASK_DETAILS_INTRO_TOUR.id,
      ];
      const uniqueIds = new Set(tourIds);
      expect(uniqueIds.size).toBe(tourIds.length);
    });

    it('should have at least 11 total steps across all tours', () => {
      const totalSteps =
        PLAYGROUND_INTRO_TOUR.steps.length +
        WORKFLOW_INTRO_TOUR.steps.length +
        TASK_DETAILS_INTRO_TOUR.steps.length;
      expect(totalSteps).toBeGreaterThanOrEqual(11);
    });
  });
});
