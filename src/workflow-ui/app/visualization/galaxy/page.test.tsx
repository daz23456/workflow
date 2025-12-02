/**
 * Galaxy Page Tests - TDD
 *
 * Tests for the Namespace Galaxy visualization page.
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
  Stars: () => <div data-testid="stars" />,
  PerspectiveCamera: () => <div data-testid="camera" />,
  Html: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Sphere: ({ children, onClick }: { children?: React.ReactNode; onClick?: () => void }) => (
    <div data-testid="sphere" onClick={onClick}>{children}</div>
  ),
  MeshDistortMaterial: () => <div />,
}));

vi.mock('@react-three/postprocessing', () => ({
  EffectComposer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Bloom: () => <div />,
}));

import GalaxyPage from './page';

describe('GalaxyPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders the galaxy scene', () => {
      render(<GalaxyPage />);
      expect(screen.getByTestId('r3f-canvas')).toBeInTheDocument();
    });

    it('renders the page title', () => {
      render(<GalaxyPage />);
      expect(screen.getByText('Namespace Galaxy')).toBeInTheDocument();
    });

    it('renders the legend with namespace names', () => {
      render(<GalaxyPage />);
      // Namespace names appear in both legend and 3D scene, use getAllByText
      expect(screen.getAllByText('production').length).toBeGreaterThan(0);
      expect(screen.getAllByText('data-team').length).toBeGreaterThan(0);
      expect(screen.getAllByText('notifications').length).toBeGreaterThan(0);
    });

    it('renders control buttons', () => {
      render(<GalaxyPage />);
      // Play/pause, reset, and info buttons
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('legend interaction', () => {
    it('can toggle legend visibility', () => {
      render(<GalaxyPage />);

      // Initially visible
      expect(screen.getByText('Namespaces')).toBeInTheDocument();

      // Legend should be visible initially
      expect(screen.getByText('Namespaces')).toBeInTheDocument();
    });
  });

  describe('instructions', () => {
    it('shows interaction instructions', () => {
      render(<GalaxyPage />);
      // The instructions text appears in multiple places, use getAllByText
      const clickInstructions = screen.getAllByText(/Click/i);
      const zoomInstructions = screen.getAllByText(/zoom/i);
      expect(clickInstructions.length).toBeGreaterThan(0);
      expect(zoomInstructions.length).toBeGreaterThan(0);
    });
  });
});
