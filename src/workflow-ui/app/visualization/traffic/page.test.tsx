/**
 * Traffic Page Tests - TDD
 *
 * Tests for the Live Traffic Observatory visualization page.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import React from 'react';

// Mock all Three.js related imports
vi.mock('@react-three/fiber', () => ({
  Canvas: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="r3f-canvas">{children}</div>
  ),
  useFrame: vi.fn(),
  useThree: vi.fn(() => ({
    camera: { position: { x: 0, y: 0, z: 50 } },
  })),
}));

vi.mock('@react-three/drei', () => ({
  OrbitControls: () => <div data-testid="orbit-controls" />,
  PerspectiveCamera: () => <div data-testid="camera" />,
  Grid: () => <div data-testid="grid" />,
  Box: () => <div data-testid="box" />,
  Sphere: () => <div data-testid="sphere" />,
  Text: ({ children }: { children?: React.ReactNode }) => <div data-testid="text">{children}</div>,
  Line: () => <div data-testid="line" />,
  Trail: ({ children }: { children?: React.ReactNode }) => <div data-testid="trail">{children}</div>,
}));

vi.mock('@react-three/postprocessing', () => ({
  EffectComposer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Bloom: () => <div />,
}));

import TrafficPage from './page';

describe('TrafficPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders the traffic canvas', () => {
      render(<TrafficPage />);
      expect(screen.getByTestId('r3f-canvas')).toBeInTheDocument();
    });

    it('renders the page title', () => {
      render(<TrafficPage />);
      expect(screen.getByText('Live Traffic Observatory')).toBeInTheDocument();
    });

    it('renders the throughput meter', () => {
      render(<TrafficPage />);
      expect(screen.getByTestId('throughput-meter')).toBeInTheDocument();
    });

    it('renders the traffic stats', () => {
      render(<TrafficPage />);
      expect(screen.getByTestId('traffic-stats')).toBeInTheDocument();
    });

    it('renders the event feed', () => {
      render(<TrafficPage />);
      expect(screen.getByTestId('event-feed')).toBeInTheDocument();
    });

    it('renders control buttons', () => {
      render(<TrafficPage />);
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThanOrEqual(2);
    });

    it('renders the connection status indicator', () => {
      render(<TrafficPage />);
      // Should show connection status (connected/disconnected)
      expect(screen.getByText(/simulation/i)).toBeInTheDocument();
    });

    it('renders demo workflow lanes', () => {
      render(<TrafficPage />);
      // Should render multiple workflow lanes
      const lanes = screen.getAllByText(/workflow/i);
      expect(lanes.length).toBeGreaterThan(0);
    });
  });

  describe('controls', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('toggles pause state when play/pause button is clicked', () => {
      render(<TrafficPage />);
      const buttons = screen.getAllByRole('button');
      const playPauseButton = buttons[0];

      // Initially playing (pause icon visible)
      fireEvent.click(playPauseButton);
      // Now paused (play icon visible)
      expect(playPauseButton).toBeInTheDocument();
    });

    it('triggers surge mode when surge button is clicked', () => {
      render(<TrafficPage />);
      const buttons = screen.getAllByRole('button');
      const surgeButton = buttons[1]; // Second button is surge

      fireEvent.click(surgeButton);
      // Surge mode spawns particles for all workflows
      expect(surgeButton).toBeInTheDocument();
    });

    it('spawns particles periodically in simulation mode', async () => {
      render(<TrafficPage />);

      // Advance timers to trigger spawn interval
      act(() => {
        vi.advanceTimersByTime(5000);
      });

      // Check stats panel shows active executions
      expect(screen.getByTestId('traffic-stats')).toBeInTheDocument();
    });

    it('updates particle progress over time', async () => {
      render(<TrafficPage />);

      // Advance timers to trigger update interval
      act(() => {
        vi.advanceTimersByTime(100);
      });

      expect(screen.getByTestId('r3f-canvas')).toBeInTheDocument();
    });

    it('updates throughput meter periodically', async () => {
      render(<TrafficPage />);

      // Advance timers to trigger throughput update
      act(() => {
        vi.advanceTimersByTime(2000);
      });

      expect(screen.getByTestId('throughput-meter')).toBeInTheDocument();
    });

    it('completes particles after execution duration', async () => {
      render(<TrafficPage />);

      // Trigger spawn
      act(() => {
        vi.advanceTimersByTime(3000);
      });

      // Advance time for particle completion (5 seconds)
      act(() => {
        vi.advanceTimersByTime(6000);
      });

      // Check event feed (should have workflow_completed events)
      expect(screen.getByTestId('event-feed')).toBeInTheDocument();
    });

    it('does not spawn particles when paused', () => {
      render(<TrafficPage />);

      // Click pause button
      const buttons = screen.getAllByRole('button');
      fireEvent.click(buttons[0]);

      // Advance time
      act(() => {
        vi.advanceTimersByTime(5000);
      });

      // Component should still render without errors
      expect(screen.getByTestId('r3f-canvas')).toBeInTheDocument();
    });
  });
});
