/**
 * NeuralScene Component Tests
 * TDD: Tests for the base 3D scene component
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

// Mock React Three Fiber and Drei
vi.mock('@react-three/fiber', () => ({
  Canvas: ({ children, ...props }: { children: React.ReactNode }) => (
    <div data-testid="r3f-canvas" {...props}>
      {children}
    </div>
  ),
  useFrame: vi.fn(),
  useThree: vi.fn(() => ({
    camera: { position: { x: 0, y: 0, z: 10 } },
    gl: { domElement: document.createElement('canvas') },
  })),
}));

vi.mock('@react-three/drei', () => ({
  OrbitControls: () => <div data-testid="orbit-controls" />,
  Stars: () => <div data-testid="stars" />,
  Grid: () => <div data-testid="grid" />,
  PerspectiveCamera: ({ children, ...props }: { children?: React.ReactNode }) => (
    <div data-testid="perspective-camera" {...props}>
      {children}
    </div>
  ),
  Environment: () => <div data-testid="environment" />,
}));

vi.mock('@react-three/postprocessing', () => ({
  EffectComposer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="effect-composer">{children}</div>
  ),
  Bloom: () => <div data-testid="bloom" />,
}));

// Mock the visualization store
vi.mock('../../lib/visualization/visualization-store', () => ({
  useVisualizationStore: vi.fn(() => ({
    themePreset: 'sci-fi-cyber',
    cameraPosition: { x: 0, y: 0, z: 10 },
    cameraTarget: { x: 0, y: 0, z: 0 },
  })),
  useThemePreset: vi.fn(() => 'sci-fi-cyber'),
}));

// Mock the theme module
vi.mock('../../lib/visualization/theme', () => ({
  getThemePreset: vi.fn(() => ({
    name: 'sci-fi-cyber',
    background: '#0a0a0f',
    hasStarfield: false,
    hasGrid: true,
    bloomStrength: 1.5,
    bloomRadius: 0.8,
    bloomThreshold: 0.2,
  })),
}));

import { NeuralScene } from './neural-scene';
import { useVisualizationStore } from '../../lib/visualization/visualization-store';
import { getThemePreset } from '../../lib/visualization/theme';

describe('NeuralScene', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render a Canvas component', () => {
      render(<NeuralScene />);
      expect(screen.getByTestId('r3f-canvas')).toBeInTheDocument();
    });

    it('should render orbit controls for camera movement', () => {
      render(<NeuralScene />);
      expect(screen.getByTestId('orbit-controls')).toBeInTheDocument();
    });

    it('should render bloom effect composer', () => {
      render(<NeuralScene />);
      expect(screen.getByTestId('effect-composer')).toBeInTheDocument();
      expect(screen.getByTestId('bloom')).toBeInTheDocument();
    });
  });

  describe('theme integration', () => {
    it('should read theme preset from store', () => {
      render(<NeuralScene />);
      expect(useVisualizationStore).toHaveBeenCalled();
    });

    it('should get theme configuration', () => {
      render(<NeuralScene />);
      // getThemePreset is called with the theme preset string
      expect(getThemePreset).toHaveBeenCalled();
      const calls = (getThemePreset as ReturnType<typeof vi.fn>).mock.calls;
      // At least one call should be with the theme preset
      const hasCorrectCall = calls.some(
        (call) => call[0] === 'sci-fi-cyber' || call[0]?.themePreset === 'sci-fi-cyber'
      );
      expect(hasCorrectCall).toBe(true);
    });

    it('should render grid when theme has grid enabled', () => {
      (getThemePreset as ReturnType<typeof vi.fn>).mockReturnValue({
        name: 'sci-fi-cyber',
        background: '#0a0a0f',
        hasStarfield: false,
        hasGrid: true,
        bloomStrength: 1.5,
        bloomRadius: 0.8,
        bloomThreshold: 0.2,
      });

      render(<NeuralScene />);
      expect(screen.getByTestId('grid')).toBeInTheDocument();
    });

    it('should render stars when theme has starfield enabled', () => {
      (getThemePreset as ReturnType<typeof vi.fn>).mockReturnValue({
        name: 'cosmic-neural',
        background: '#0a0015',
        hasStarfield: true,
        hasGrid: false,
        bloomStrength: 1.8,
        bloomRadius: 0.9,
        bloomThreshold: 0.15,
      });

      render(<NeuralScene />);
      expect(screen.getByTestId('stars')).toBeInTheDocument();
    });
  });

  describe('children', () => {
    it('should render children inside the canvas', () => {
      render(
        <NeuralScene>
          <div data-testid="child-content">Test Child</div>
        </NeuralScene>
      );

      expect(screen.getByTestId('child-content')).toBeInTheDocument();
    });
  });

  describe('props', () => {
    it('should accept custom className', () => {
      render(<NeuralScene className="custom-class" />);
      const canvas = screen.getByTestId('r3f-canvas');
      expect(canvas).toHaveClass('custom-class');
    });
  });
});
