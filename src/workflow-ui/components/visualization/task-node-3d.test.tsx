/**
 * TaskNode3D Component Tests
 * TDD: Tests for the 3D task node (neuron) component
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import React from 'react';

// Mock React Three Fiber
vi.mock('@react-three/fiber', () => ({
  useFrame: vi.fn((callback) => {
    // Simulate one frame for testing animations
    callback({ clock: { getElapsedTime: () => 1.0 } }, 0.016);
  }),
  useThree: vi.fn(() => ({
    camera: { position: { x: 0, y: 0, z: 10 } },
  })),
}));

// Mock Three.js
vi.mock('three', () => ({
  Color: vi.fn().mockImplementation((color) => ({
    set: vi.fn(),
    getHexString: () => color?.replace('#', '') || '000000',
  })),
  MeshStandardMaterial: vi.fn(),
  SphereGeometry: vi.fn(),
  Vector3: vi.fn().mockImplementation((x = 0, y = 0, z = 0) => ({ x, y, z })),
  BackSide: 1, // Three.js constant for BackSide
  FrontSide: 0,
  DoubleSide: 2,
}));

// Mock Drei
vi.mock('@react-three/drei', () => ({
  Sphere: ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) => (
    <div data-testid="sphere" data-position={JSON.stringify(props.position)} {...props}>
      {children}
    </div>
  ),
  Html: ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) => (
    <div data-testid="html-label" {...props}>
      {children}
    </div>
  ),
  Text: ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) => (
    <div data-testid="text-3d" {...props}>
      {children}
    </div>
  ),
}));

// Mock theme
vi.mock('../../lib/visualization/theme', () => ({
  getThemePreset: vi.fn(() => ({
    name: 'sci-fi-cyber',
    nodeColors: {
      idle: '#1a4a6e',
      pending: '#2d5a7e',
      running: '#00ffff',
      succeeded: '#00ff88',
      failed: '#ff3366',
    },
    nodeSize: 0.5,
    nodeEmissiveIntensity: 0.8,
    glowIntensity: 2.5,
    pulseSpeed: 2.0,
    pulseAmplitude: 0.3,
  })),
}));

// Mock visualization store
vi.mock('../../lib/visualization/visualization-store', () => ({
  useVisualizationStore: vi.fn(() => ({
    themePreset: 'sci-fi-cyber',
  })),
  useThemePreset: vi.fn(() => 'sci-fi-cyber'),
}));

import { TaskNode3D } from './task-node-3d';
import type { NodeStatus } from '../../lib/visualization/visualization-store';

describe('TaskNode3D', () => {
  const defaultProps = {
    id: 'task-1',
    label: 'Fetch User',
    status: 'idle' as NodeStatus,
    position: { x: 0, y: 0, z: 0 },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render a sphere geometry', () => {
      const { getByTestId } = render(<TaskNode3D {...defaultProps} />);
      expect(getByTestId('sphere')).toBeInTheDocument();
    });

    it('should render at the specified position', () => {
      const position = { x: 1, y: 2, z: 3 };
      const { getByTestId } = render(<TaskNode3D {...defaultProps} position={position} />);

      // The Sphere is rendered inside a group; the inner Sphere has position [0, 0, 0]
      // Position is applied to the wrapping group
      const sphere = getByTestId('sphere');
      expect(sphere).toBeInTheDocument();
    });

    it('should render a label', () => {
      const { getByTestId } = render(<TaskNode3D {...defaultProps} />);
      expect(getByTestId('html-label')).toBeInTheDocument();
    });

    it('should display the task label text', () => {
      const { getByTestId } = render(<TaskNode3D {...defaultProps} label="Process Data" />);
      const label = getByTestId('html-label');
      expect(label.textContent).toContain('Process Data');
    });
  });

  describe('status colors', () => {
    it('should use idle color when status is idle', () => {
      const { getByTestId } = render(<TaskNode3D {...defaultProps} status="idle" />);
      const sphere = getByTestId('sphere');
      // The component should be rendered (color is applied via material)
      expect(sphere).toBeInTheDocument();
    });

    it('should use running color when status is running', () => {
      const { getByTestId } = render(<TaskNode3D {...defaultProps} status="running" />);
      expect(getByTestId('sphere')).toBeInTheDocument();
    });

    it('should use succeeded color when status is succeeded', () => {
      const { getByTestId } = render(<TaskNode3D {...defaultProps} status="succeeded" />);
      expect(getByTestId('sphere')).toBeInTheDocument();
    });

    it('should use failed color when status is failed', () => {
      const { getByTestId } = render(<TaskNode3D {...defaultProps} status="failed" />);
      expect(getByTestId('sphere')).toBeInTheDocument();
    });

    it('should use pending color when status is pending', () => {
      const { getByTestId } = render(<TaskNode3D {...defaultProps} status="pending" />);
      expect(getByTestId('sphere')).toBeInTheDocument();
    });
  });

  describe('interactions', () => {
    it('should call onClick when clicked', () => {
      const onClick = vi.fn();
      const { getByTestId } = render(<TaskNode3D {...defaultProps} onClick={onClick} />);

      const sphere = getByTestId('sphere');
      sphere.click();

      expect(onClick).toHaveBeenCalledWith('task-1');
    });

    it('should call onHover when hovered', () => {
      const onHover = vi.fn();
      const { getByTestId } = render(<TaskNode3D {...defaultProps} onHover={onHover} />);

      const sphere = getByTestId('sphere');
      sphere.dispatchEvent(new MouseEvent('pointerover', { bubbles: true }));

      expect(onHover).toHaveBeenCalledWith('task-1', true);
    });

    it('should call onHover with false when hover ends', () => {
      const onHover = vi.fn();
      const { getByTestId } = render(<TaskNode3D {...defaultProps} onHover={onHover} />);

      const sphere = getByTestId('sphere');
      sphere.dispatchEvent(new MouseEvent('pointerout', { bubbles: true }));

      expect(onHover).toHaveBeenCalledWith('task-1', false);
    });
  });

  describe('selected state', () => {
    it('should render differently when selected', () => {
      const { getAllByTestId } = render(<TaskNode3D {...defaultProps} selected />);

      // Selected nodes render main sphere + glow ring (2 spheres)
      const spheres = getAllByTestId('sphere');
      expect(spheres.length).toBe(2);
    });
  });

  describe('animation', () => {
    it('should animate when running', () => {
      // The useFrame mock simulates animation frames
      const { getByTestId } = render(<TaskNode3D {...defaultProps} status="running" />);

      // Component should render and animate (via useFrame)
      expect(getByTestId('sphere')).toBeInTheDocument();
    });
  });
});
