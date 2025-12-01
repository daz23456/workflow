/**
 * GalaxyScene Tests - TDD RED Phase
 *
 * Tests for the 3D galaxy scene that displays workflows as a cosmic visualization
 * with namespaces as clusters, workflows as planets, and tasks as moons.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock react-three/fiber and drei since they don't work in jsdom
jest.mock('@react-three/fiber', () => ({
  Canvas: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="r3f-canvas">{children}</div>
  ),
  useFrame: jest.fn(),
  useThree: () => ({
    camera: { position: { set: jest.fn() } },
    gl: { domElement: document.createElement('canvas') },
  }),
}));

jest.mock('@react-three/drei', () => ({
  OrbitControls: () => <div data-testid="orbit-controls" />,
  Stars: ({ count }: { count?: number }) => (
    <div data-testid="stars" data-count={count} />
  ),
  PerspectiveCamera: () => <div data-testid="perspective-camera" />,
  Html: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Billboard: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Text: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock('@react-three/postprocessing', () => ({
  EffectComposer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="effect-composer">{children}</div>
  ),
  Bloom: () => <div data-testid="bloom-effect" />,
}));

// Import after mocks
import { GalaxyScene } from './galaxy-scene';

describe('GalaxyScene', () => {
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
    it('has accessible name for the visualization', () => {
      render(<GalaxyScene />);
      const canvas = screen.getByTestId('r3f-canvas');
      expect(canvas.closest('[role="img"]') || canvas.closest('[aria-label]')).toBeTruthy();
    });
  });
});
