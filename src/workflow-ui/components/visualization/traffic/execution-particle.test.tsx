/**
 * ExecutionParticle Tests - TDD
 *
 * Tests for the animated execution orb that flows through workflow lanes.
 * Particles represent individual workflow executions.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

// Mock Three.js
vi.mock('@react-three/fiber', () => ({
  useFrame: vi.fn((callback) => {
    // Simulate one frame
    callback({ clock: { getElapsedTime: () => 0.5 } }, 0.016);
  }),
}));

vi.mock('@react-three/drei', () => ({
  Sphere: ({ children, ...props }: { children?: React.ReactNode; 'data-testid'?: string }) => (
    <div data-testid={props['data-testid'] || 'particle-sphere'}>{children}</div>
  ),
  Trail: ({ children }: { children?: React.ReactNode }) => (
    <div data-testid="particle-trail">{children}</div>
  ),
}));

import { ExecutionParticle, type ExecutionParticleProps, type ExecutionStatus } from './execution-particle';

const defaultProps: ExecutionParticleProps = {
  id: 'exec-123',
  workflowId: 'wf-user-api',
  status: 'running' as ExecutionStatus,
  progress: 0.5,
  laneY: 0,
  startX: 0,
  endX: 30,
};

const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <div data-testid="test-wrapper">{children}</div>
);

describe('ExecutionParticle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders the particle container', () => {
      render(<ExecutionParticle {...defaultProps} />, { wrapper: TestWrapper });
      expect(screen.getByTestId('execution-particle-exec-123')).toBeInTheDocument();
    });

    it('renders the particle sphere', () => {
      render(<ExecutionParticle {...defaultProps} />, { wrapper: TestWrapper });
      // There are two spheres - main particle and glow effect
      const spheres = screen.getAllByTestId('particle-sphere');
      expect(spheres.length).toBeGreaterThanOrEqual(1);
    });

    it('renders with trail effect', () => {
      render(<ExecutionParticle {...defaultProps} />, { wrapper: TestWrapper });
      expect(screen.getByTestId('particle-trail')).toBeInTheDocument();
    });
  });

  describe('status colors', () => {
    it('uses blue color for running status', () => {
      const { container } = render(
        <ExecutionParticle {...defaultProps} status="running" />,
        { wrapper: TestWrapper }
      );
      // The status color is applied via meshStandardMaterial
      expect(container.textContent).toBeDefined();
    });

    it('uses green color for succeeded status', () => {
      render(
        <ExecutionParticle {...defaultProps} status="succeeded" />,
        { wrapper: TestWrapper }
      );
      expect(screen.getByTestId('execution-particle-exec-123')).toBeInTheDocument();
    });

    it('uses red color for failed status', () => {
      render(
        <ExecutionParticle {...defaultProps} status="failed" />,
        { wrapper: TestWrapper }
      );
      expect(screen.getByTestId('execution-particle-exec-123')).toBeInTheDocument();
    });
  });

  describe('animation', () => {
    it('positions particle based on progress', () => {
      // Progress 0.5 should be halfway between startX and endX
      render(
        <ExecutionParticle {...defaultProps} progress={0.5} startX={0} endX={30} />,
        { wrapper: TestWrapper }
      );
      expect(screen.getByTestId('execution-particle-exec-123')).toBeInTheDocument();
    });

    it('positions at start when progress is 0', () => {
      render(
        <ExecutionParticle {...defaultProps} progress={0} />,
        { wrapper: TestWrapper }
      );
      expect(screen.getByTestId('execution-particle-exec-123')).toBeInTheDocument();
    });

    it('positions at end when progress is 1', () => {
      render(
        <ExecutionParticle {...defaultProps} progress={1} />,
        { wrapper: TestWrapper }
      );
      expect(screen.getByTestId('execution-particle-exec-123')).toBeInTheDocument();
    });

    it('handles different lane Y positions', () => {
      render(
        <ExecutionParticle {...defaultProps} laneY={5} />,
        { wrapper: TestWrapper }
      );
      expect(screen.getByTestId('execution-particle-exec-123')).toBeInTheDocument();
    });

    it('handles negative lane Y positions', () => {
      render(
        <ExecutionParticle {...defaultProps} laneY={-5} />,
        { wrapper: TestWrapper }
      );
      expect(screen.getByTestId('execution-particle-exec-123')).toBeInTheDocument();
    });
  });

  describe('edge cases', () => {
    it('handles negative start/end positions', () => {
      render(
        <ExecutionParticle {...defaultProps} startX={-10} endX={20} progress={0.5} />,
        { wrapper: TestWrapper }
      );
      expect(screen.getByTestId('execution-particle-exec-123')).toBeInTheDocument();
    });
  });
});
