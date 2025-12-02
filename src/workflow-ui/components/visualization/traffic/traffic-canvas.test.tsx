/**
 * TrafficCanvas Tests - TDD
 *
 * Tests for the 3D canvas component that displays workflow traffic
 * with flowing execution particles.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
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
  Environment: () => <div data-testid="environment" />,
  Grid: () => <div data-testid="grid" />,
}));

vi.mock('@react-three/postprocessing', () => ({
  EffectComposer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Bloom: () => <div />,
}));

import { TrafficCanvas, type TrafficCanvasProps } from './traffic-canvas';

const defaultProps: TrafficCanvasProps = {
  className: 'test-class',
};

describe('TrafficCanvas', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders the 3D canvas container', () => {
      render(<TrafficCanvas {...defaultProps} />);
      expect(screen.getByTestId('r3f-canvas')).toBeInTheDocument();
    });

    it('renders with dark theme background', () => {
      render(<TrafficCanvas {...defaultProps} />);
      const container = screen.getByRole('img', { name: /traffic visualization/i });
      expect(container).toHaveClass('bg-[#0a1628]');
    });

    it('applies custom className', () => {
      render(<TrafficCanvas className="custom-class" />);
      const container = screen.getByRole('img', { name: /traffic visualization/i });
      expect(container).toHaveClass('custom-class');
    });

    it('renders camera controls', () => {
      render(<TrafficCanvas {...defaultProps} />);
      expect(screen.getByTestId('orbit-controls')).toBeInTheDocument();
    });

    it('renders perspective camera', () => {
      render(<TrafficCanvas {...defaultProps} />);
      expect(screen.getByTestId('camera')).toBeInTheDocument();
    });
  });

  describe('children', () => {
    it('renders children inside the canvas', () => {
      render(
        <TrafficCanvas {...defaultProps}>
          <div data-testid="child-component">Child</div>
        </TrafficCanvas>
      );
      expect(screen.getByTestId('child-component')).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('has appropriate aria-label', () => {
      render(<TrafficCanvas {...defaultProps} />);
      expect(screen.getByRole('img', { name: /traffic visualization/i })).toBeInTheDocument();
    });

    it('renders grid for visual reference', () => {
      render(<TrafficCanvas {...defaultProps} />);
      expect(screen.getByTestId('grid')).toBeInTheDocument();
    });
  });
});
