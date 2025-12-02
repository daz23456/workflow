/**
 * WorkflowPlanet Tests - TDD
 *
 * Tests for the planet that represents a workflow orbiting around a namespace cluster.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

vi.mock('@react-three/fiber', () => ({
  useFrame: vi.fn(),
}));

vi.mock('@react-three/drei', () => ({
  Html: ({ children, ...props }: { children: React.ReactNode }) => (
    <div data-testid="html-overlay" {...props}>{children}</div>
  ),
  Sphere: ({ children, args, ...props }: { children?: React.ReactNode; args?: number[] }) => (
    <div data-testid="planet-sphere" data-radius={args?.[0]} {...props}>{children}</div>
  ),
}));

import { WorkflowPlanet, type WorkflowPlanetProps } from './workflow-planet';

const defaultProps: WorkflowPlanetProps = {
  id: 'wf-user-api',
  name: 'user-api-composition',
  orbitRadius: 5,
  orbitSpeed: 0.5,
  color: '#4ecdc4',
  taskCount: 6,
};

describe('WorkflowPlanet', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders a sphere for the planet', () => {
      render(<WorkflowPlanet {...defaultProps} />);
      expect(screen.getByTestId('planet-sphere')).toBeInTheDocument();
    });

    it('renders the workflow name as a label', () => {
      render(<WorkflowPlanet {...defaultProps} />);
      expect(screen.getByText('user-api-composition')).toBeInTheDocument();
    });

    it('renders with the provided color', () => {
      render(<WorkflowPlanet {...defaultProps} />);
      const sphere = screen.getByTestId('planet-sphere');
      expect(sphere).toBeInTheDocument();
    });
  });

  describe('sizing', () => {
    it('has a size based on task count', () => {
      const { rerender } = render(
        <WorkflowPlanet {...defaultProps} taskCount={2} />
      );
      const planet1 = screen.getByTestId('planet-sphere');
      const radius1 = parseFloat(planet1.getAttribute('data-radius') || '0');

      rerender(<WorkflowPlanet {...defaultProps} taskCount={10} />);
      const planet2 = screen.getByTestId('planet-sphere');
      const radius2 = parseFloat(planet2.getAttribute('data-radius') || '0');

      expect(radius2).toBeGreaterThan(radius1);
    });
  });

  describe('interactivity', () => {
    it('calls onClick when planet is clicked', () => {
      const onClick = vi.fn();
      render(<WorkflowPlanet {...defaultProps} onClick={onClick} />);
      screen.getByTestId('planet-sphere').click();
      expect(onClick).toHaveBeenCalledWith('wf-user-api');
    });
  });

  describe('children', () => {
    it('renders task moons as children', () => {
      render(
        <WorkflowPlanet {...defaultProps}>
          <div data-testid="task-moon">Moon 1</div>
        </WorkflowPlanet>
      );
      expect(screen.getByTestId('task-moon')).toBeInTheDocument();
    });
  });
});
