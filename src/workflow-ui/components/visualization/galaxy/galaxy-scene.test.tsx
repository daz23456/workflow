/**
 * GalaxyScene Tests - TDD
 *
 * Tests for the 3D galaxy scene that displays workflows as a cosmic visualization
 * with namespaces as clusters, workflows as planets, and tasks as moons.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

// Mock react-three/fiber and drei since they don't work in jsdom
vi.mock('@react-three/fiber', () => ({
  Canvas: ({ children, ...props }: { children: React.ReactNode }) => (
    <div data-testid="r3f-canvas" {...props}>
      {children}
    </div>
  ),
  useFrame: vi.fn(),
  useThree: vi.fn(() => ({
    camera: { position: { x: 0, y: 0, z: 50 } },
    gl: { domElement: document.createElement('canvas') },
  })),
}));

vi.mock('@react-three/drei', () => ({
  OrbitControls: () => <div data-testid="orbit-controls" />,
  Stars: ({ count }: { count?: number }) => (
    <div data-testid="stars" data-count={count || 10000} />
  ),
  PerspectiveCamera: ({ children, ...props }: { children?: React.ReactNode }) => (
    <div data-testid="perspective-camera" {...props}>
      {children}
    </div>
  ),
  Html: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Billboard: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Text: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@react-three/postprocessing', () => ({
  EffectComposer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="effect-composer">{children}</div>
  ),
  Bloom: () => <div data-testid="bloom-effect" />,
}));

// Import after mocks
import { GalaxyScene } from './galaxy-scene';

describe('GalaxyScene', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders the 3D canvas', () => {
      render(<GalaxyScene />);
      expect(screen.getByTestId('r3f-canvas')).toBeInTheDocument();
    });

    it('renders with deep space star field', () => {
      render(<GalaxyScene />);
      expect(screen.getByTestId('stars')).toBeInTheDocument();
    });

    it('renders with camera controls', () => {
      render(<GalaxyScene />);
      expect(screen.getByTestId('orbit-controls')).toBeInTheDocument();
    });

    it('renders with bloom post-processing effects', () => {
      render(<GalaxyScene />);
      expect(screen.getByTestId('bloom-effect')).toBeInTheDocument();
    });

    it('renders children components', () => {
      render(
        <GalaxyScene>
          <div data-testid="child-component">Test Child</div>
        </GalaxyScene>
      );
      expect(screen.getByTestId('child-component')).toBeInTheDocument();
    });
  });

  describe('deep space theme', () => {
    it('renders with increased star count for galaxy effect', () => {
      render(<GalaxyScene />);
      const stars = screen.getByTestId('stars');
      const count = parseInt(stars.getAttribute('data-count') || '0', 10);
      expect(count).toBeGreaterThanOrEqual(5000);
    });

    it('applies custom className when provided', () => {
      const { container } = render(<GalaxyScene className="custom-galaxy" />);
      expect(container.firstChild).toHaveClass('custom-galaxy');
    });
  });

  describe('accessibility', () => {
    it('has accessible role for the visualization', () => {
      render(<GalaxyScene />);
      expect(screen.getByRole('img')).toBeInTheDocument();
    });

    it('has aria-label describing the visualization', () => {
      render(<GalaxyScene />);
      const element = screen.getByRole('img');
      expect(element).toHaveAttribute('aria-label');
      expect(element.getAttribute('aria-label')).toContain('Galaxy');
    });
  });
});
