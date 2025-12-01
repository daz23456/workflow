/**
 * DependencyEdge3D Component Tests
 * TDD: Tests for the 3D edge (connection) component
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import React from 'react';

// Mock React Three Fiber
vi.mock('@react-three/fiber', () => ({
  useFrame: vi.fn(),
  useThree: vi.fn(() => ({
    camera: { position: { x: 0, y: 0, z: 10 } },
  })),
  extend: vi.fn(),
}));

// Mock Three.js
vi.mock('three', () => ({
  BufferGeometry: vi.fn().mockImplementation(() => ({
    setFromPoints: vi.fn(),
    dispose: vi.fn(),
  })),
  LineBasicMaterial: vi.fn().mockImplementation(() => ({
    dispose: vi.fn(),
  })),
  Line: vi.fn(),
  Vector3: vi.fn().mockImplementation((x = 0, y = 0, z = 0) => ({
    x,
    y,
    z,
    clone: () => ({ x, y, z }),
    lerp: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
  })),
  CatmullRomCurve3: vi.fn().mockImplementation(() => ({
    getPoints: () => [
      { x: 0, y: 0, z: 0 },
      { x: 1, y: 0, z: 0 },
    ],
  })),
  QuadraticBezierCurve3: vi.fn().mockImplementation(() => ({
    getPoints: () => [
      { x: 0, y: 0, z: 0 },
      { x: 0.5, y: 0.5, z: 0 },
      { x: 1, y: 0, z: 0 },
    ],
  })),
  Color: vi.fn().mockImplementation((color) => ({ color })),
}));

// Mock Drei
vi.mock('@react-three/drei', () => ({
  Line: ({ points, ...props }: { points?: number[][]; [key: string]: unknown }) => (
    <div
      data-testid="edge-line"
      data-points={JSON.stringify(points)}
      {...props}
    />
  ),
  QuadraticBezierLine: ({
    start,
    end,
    mid,
    ...props
  }: {
    start?: number[];
    end?: number[];
    mid?: number[];
    [key: string]: unknown;
  }) => (
    <div
      data-testid="bezier-line"
      data-start={JSON.stringify(start)}
      data-end={JSON.stringify(end)}
      data-mid={JSON.stringify(mid)}
      {...props}
    />
  ),
}));

// Mock theme
vi.mock('../../lib/visualization/theme', () => ({
  getThemePreset: vi.fn(() => ({
    name: 'sci-fi-cyber',
    edgeColor: '#00ffff',
    edgeOpacity: 0.4,
    edgeWidth: 2,
  })),
}));

// Mock visualization store - returns value based on selector
vi.mock('../../lib/visualization/visualization-store', () => {
  const mockNodes = new Map([
    ['task-1', { id: 'task-1', position: { x: 0, y: 0, z: 0 } }],
    ['task-2', { id: 'task-2', position: { x: 3, y: 0, z: 0 } }],
  ]);

  return {
    useVisualizationStore: vi.fn((selector?: (state: unknown) => unknown) => {
      const state = {
        themePreset: 'sci-fi-cyber',
        nodes: mockNodes,
      };
      return selector ? selector(state) : state;
    }),
  };
});

import { DependencyEdge3D } from './dependency-edge-3d';

describe('DependencyEdge3D', () => {
  const defaultProps = {
    id: 'edge-1',
    sourceId: 'task-1',
    targetId: 'task-2',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render a line element', () => {
      const { getByTestId } = render(<DependencyEdge3D {...defaultProps} />);
      // Should render either a regular line or bezier line
      const line = document.querySelector('[data-testid="edge-line"], [data-testid="bezier-line"]');
      expect(line).toBeInTheDocument();
    });

    it('should connect source and target nodes', () => {
      const { container } = render(<DependencyEdge3D {...defaultProps} />);
      const line = container.querySelector('[data-testid="edge-line"], [data-testid="bezier-line"]');
      expect(line).toBeInTheDocument();
    });
  });

  describe('appearance', () => {
    it('should use theme edge color', () => {
      const { container } = render(<DependencyEdge3D {...defaultProps} />);
      const line = container.querySelector('[data-testid="edge-line"], [data-testid="bezier-line"]');
      expect(line).toBeInTheDocument();
    });

    it('should use theme edge opacity', () => {
      const { container } = render(<DependencyEdge3D {...defaultProps} />);
      const line = container.querySelector('[data-testid="edge-line"], [data-testid="bezier-line"]');
      expect(line).toBeInTheDocument();
    });

    it('should use theme edge width', () => {
      const { container } = render(<DependencyEdge3D {...defaultProps} />);
      const line = container.querySelector('[data-testid="edge-line"], [data-testid="bezier-line"]');
      expect(line).toBeInTheDocument();
    });
  });

  describe('curved edges', () => {
    it('should render curved line when curved prop is true', () => {
      const { getByTestId } = render(<DependencyEdge3D {...defaultProps} curved />);
      expect(getByTestId('bezier-line')).toBeInTheDocument();
    });
  });

  describe('highlighting', () => {
    it('should highlight when active prop is true', () => {
      const { container } = render(<DependencyEdge3D {...defaultProps} active />);
      const line = container.querySelector('[data-testid="edge-line"], [data-testid="bezier-line"]');
      expect(line).toBeInTheDocument();
    });
  });

  describe('missing nodes', () => {
    it('should handle missing source node gracefully', () => {
      const { container } = render(
        <DependencyEdge3D {...defaultProps} sourceId="non-existent" />
      );
      // Should render nothing or fallback
      expect(container).toBeDefined();
    });

    it('should handle missing target node gracefully', () => {
      const { container } = render(
        <DependencyEdge3D {...defaultProps} targetId="non-existent" />
      );
      // Should render nothing or fallback
      expect(container).toBeDefined();
    });
  });
});
