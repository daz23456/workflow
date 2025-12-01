import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { TourProvider, useTour } from './tour-provider';
import { useLearningStore } from '@/lib/stores/learning-store';

// Mock the learning store
vi.mock('@/lib/stores/learning-store', () => ({
  useLearningStore: vi.fn(),
}));

// Mock tour definitions
vi.mock('./tour-definitions', () => ({
  getTourById: vi.fn((id) => {
    const tours = {
      'test-tour': {
        id: 'test-tour',
        name: 'Test Tour',
        description: 'A test tour',
        autoStart: false,
        steps: [
          {
            id: 'step-1',
            target: '[data-tour="test-target"]',
            title: 'Test Step',
            content: 'Test content',
          },
        ],
      },
      'auto-start-tour': {
        id: 'auto-start-tour',
        name: 'Auto Start Tour',
        description: 'An auto-start tour',
        autoStart: true,
        steps: [
          {
            id: 'step-1',
            target: '[data-tour="auto-target"]',
            title: 'Auto Step',
            content: 'Auto content',
          },
        ],
      },
    };
    return tours[id as keyof typeof tours];
  }),
  getAutoStartTours: vi.fn(() => [
    {
      id: 'auto-start-tour',
      name: 'Auto Start Tour',
      description: 'An auto-start tour',
      autoStart: true,
      steps: [
        {
          id: 'step-1',
          target: '[data-tour="auto-target"]',
          title: 'Auto Step',
          content: 'Auto content',
        },
      ],
    },
  ]),
}));

// Mock the Tour component to avoid rendering complexities
vi.mock('./tour', () => ({
  Tour: () => null,
}));

describe('TourProvider', () => {
  const mockLearningStore = {
    toursCompleted: [],
    completeTour: vi.fn(),
    tourDismissed: false,
    dismissTour: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (useLearningStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue(mockLearningStore);
    document.body.innerHTML = '<div data-tour="test-target"></div><div data-tour="auto-target"></div>';
  });

  describe('Context Provider', () => {
    it('should provide tour context to children', () => {
      const { result } = renderHook(() => useTour(), {
        wrapper: ({ children }) => <TourProvider>{children}</TourProvider>,
      });

      expect(result.current).toBeDefined();
      expect(result.current.startTour).toBeDefined();
      expect(result.current.stopTour).toBeDefined();
      expect(result.current.isRunning).toBe(false);
      expect(result.current.currentTourId).toBeNull();
    });

    it('should throw error when useTour is used outside TourProvider', () => {
      // Suppress console.error for this test
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        renderHook(() => useTour());
      }).toThrow('useTour must be used within TourProvider');

      consoleSpy.mockRestore();
    });
  });

  describe('Starting Tours', () => {
    it('should start a tour by ID', async () => {
      const { result } = renderHook(() => useTour(), {
        wrapper: ({ children }) => <TourProvider>{children}</TourProvider>,
      });

      act(() => {
        result.current.startTour('test-tour');
      });

      await waitFor(() => {
        expect(result.current.isRunning).toBe(true);
        expect(result.current.currentTourId).toBe('test-tour');
      });
    });

    it('should not start tour with invalid ID', () => {
      const { result } = renderHook(() => useTour(), {
        wrapper: ({ children }) => <TourProvider>{children}</TourProvider>,
      });

      act(() => {
        // @ts-expect-error - testing invalid input
        result.current.startTour('invalid-tour-id');
      });

      expect(result.current.isRunning).toBe(false);
      expect(result.current.currentTourId).toBeNull();
    });
  });

  describe('Stopping Tours', () => {
    it('should stop a running tour', async () => {
      const { result } = renderHook(() => useTour(), {
        wrapper: ({ children }) => <TourProvider>{children}</TourProvider>,
      });

      act(() => {
        result.current.startTour('test-tour');
      });

      await waitFor(() => {
        expect(result.current.isRunning).toBe(true);
      });

      act(() => {
        result.current.stopTour();
      });

      expect(result.current.isRunning).toBe(false);
      expect(result.current.currentTourId).toBeNull();
    });
  });

  describe('Auto-Start Tours', () => {
    it('should not auto-start if tour is dismissed', () => {
      vi.useFakeTimers();
      (useLearningStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        ...mockLearningStore,
        tourDismissed: true,
      });

      const { result } = renderHook(() => useTour(), {
        wrapper: ({ children }) => <TourProvider>{children}</TourProvider>,
      });

      act(() => {
        vi.advanceTimersByTime(600);
      });

      expect(result.current.isRunning).toBe(false);

      vi.useRealTimers();
    });

    it('should not auto-start if tour is already completed', () => {
      vi.useFakeTimers();
      (useLearningStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        ...mockLearningStore,
        toursCompleted: ['auto-start-tour'],
      });

      const { result } = renderHook(() => useTour(), {
        wrapper: ({ children }) => <TourProvider>{children}</TourProvider>,
      });

      act(() => {
        vi.advanceTimersByTime(600);
      });

      expect(result.current.isRunning).toBe(false);

      vi.useRealTimers();
    });
  });

  describe('Tour State Management', () => {
    it('should track running state correctly', async () => {
      const { result } = renderHook(() => useTour(), {
        wrapper: ({ children }) => <TourProvider>{children}</TourProvider>,
      });

      // Initially not running
      expect(result.current.isRunning).toBe(false);
      expect(result.current.currentTourId).toBeNull();

      // Start tour
      act(() => {
        result.current.startTour('test-tour');
      });

      await waitFor(() => {
        expect(result.current.isRunning).toBe(true);
        expect(result.current.currentTourId).toBe('test-tour');
      });

      // Stop tour
      act(() => {
        result.current.stopTour();
      });

      expect(result.current.isRunning).toBe(false);
      expect(result.current.currentTourId).toBeNull();
    });
  });

  describe('Tour ID Tracking', () => {
    it('should track current tour ID', async () => {
      const { result } = renderHook(() => useTour(), {
        wrapper: ({ children }) => <TourProvider>{children}</TourProvider>,
      });

      act(() => {
        result.current.startTour('test-tour');
      });

      await waitFor(() => {
        expect(result.current.currentTourId).toBe('test-tour');
      });
    });

    it('should clear current tour ID when stopped', async () => {
      const { result } = renderHook(() => useTour(), {
        wrapper: ({ children }) => <TourProvider>{children}</TourProvider>,
      });

      act(() => {
        result.current.startTour('test-tour');
      });

      await waitFor(() => {
        expect(result.current.currentTourId).toBe('test-tour');
      });

      act(() => {
        result.current.stopTour();
      });

      expect(result.current.currentTourId).toBeNull();
    });
  });

  describe('Multiple Tour Handling', () => {
    it('should switch between different tours', async () => {
      const { result } = renderHook(() => useTour(), {
        wrapper: ({ children }) => <TourProvider>{children}</TourProvider>,
      });

      // Start first tour
      act(() => {
        result.current.startTour('test-tour');
      });

      await waitFor(() => {
        expect(result.current.currentTourId).toBe('test-tour');
      });

      // Start different tour (should replace current tour)
      act(() => {
        result.current.startTour('auto-start-tour');
      });

      await waitFor(() => {
        expect(result.current.currentTourId).toBe('auto-start-tour');
      });
    });
  });
});
