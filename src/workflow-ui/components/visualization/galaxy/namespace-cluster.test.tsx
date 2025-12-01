/**
 * NamespaceCluster Tests - TDD
 *
 * Tests for the glowing sphere that represents a namespace in the galaxy view.
 * Each cluster contains workflow "planets" that orbit around it.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

// Mock Three.js components
vi.mock('@react-three/fiber', () => ({
  useFrame: vi.fn(),
  useThree: vi.fn(() => ({
    camera: { position: { x: 0, y: 0, z: 50 } },
  })),
}));

vi.mock('@react-three/drei', () => ({
  Html: ({ children, ...props }: { children: React.ReactNode }) => (
    <div data-testid="html-overlay" {...props}>
      {children}
    </div>
  ),
  Billboard: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="billboard">{children}</div>
  ),
  Sphere: ({ children, args, ...props }: { children?: React.ReactNode; args?: number[] }) => (
    <div
      data-testid="sphere"
      data-radius={args?.[0]}
      {...props}
    >
      {children}
    </div>
  ),
  MeshDistortMaterial: (props: Record<string, unknown>) => (
    <div data-testid="distort-material" data-color={props.color as string} />
  ),
}));

import { NamespaceCluster, type NamespaceClusterProps } from './namespace-cluster';

const defaultProps: NamespaceClusterProps = {
  id: 'ns-production',
  name: 'production',
  position: [0, 0, 0],
  color: '#ff6b6b',
  workflowCount: 5,
};

describe('NamespaceCluster', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders a sphere for the cluster', () => {
      render(<NamespaceCluster {...defaultProps} />);
      expect(screen.getByTestId('sphere')).toBeInTheDocument();
    });

    it('renders the namespace name as a label', () => {
      render(<NamespaceCluster {...defaultProps} />);
      expect(screen.getByText('production')).toBeInTheDocument();
    });

    it('applies the provided color to the material', () => {
      render(<NamespaceCluster {...defaultProps} />);
      const material = screen.getByTestId('distort-material');
      expect(material).toHaveAttribute('data-color', '#ff6b6b');
    });
  });

  describe('sizing', () => {
    it('scales size based on workflow count', () => {
      const { rerender } = render(
        <NamespaceCluster {...defaultProps} workflowCount={1} />
      );
      const sphere1 = screen.getByTestId('sphere');
      const radius1 = parseFloat(sphere1.getAttribute('data-radius') || '0');

      rerender(<NamespaceCluster {...defaultProps} workflowCount={10} />);
      const sphere2 = screen.getByTestId('sphere');
      const radius2 = parseFloat(sphere2.getAttribute('data-radius') || '0');

      expect(radius2).toBeGreaterThan(radius1);
    });

    it('has minimum size even with zero workflows', () => {
      render(<NamespaceCluster {...defaultProps} workflowCount={0} />);
      const sphere = screen.getByTestId('sphere');
      const radius = parseFloat(sphere.getAttribute('data-radius') || '0');
      expect(radius).toBeGreaterThan(0);
    });
  });

  describe('interactivity', () => {
    it('calls onClick when cluster is clicked', () => {
      const onClick = vi.fn();
      render(<NamespaceCluster {...defaultProps} onClick={onClick} />);
      const sphere = screen.getByTestId('sphere');
      sphere.click();
      expect(onClick).toHaveBeenCalledWith('ns-production');
    });

    it('shows hover state with onPointerOver', () => {
      const onHover = vi.fn();
      render(<NamespaceCluster {...defaultProps} onHover={onHover} />);
      const sphere = screen.getByTestId('sphere');
      sphere.dispatchEvent(new MouseEvent('pointerover', { bubbles: true }));
      expect(onHover).toHaveBeenCalledWith('ns-production', true);
    });
  });

  describe('children', () => {
    it('renders children (workflow planets)', () => {
      render(
        <NamespaceCluster {...defaultProps}>
          <div data-testid="workflow-planet">Planet 1</div>
        </NamespaceCluster>
      );
      expect(screen.getByTestId('workflow-planet')).toBeInTheDocument();
    });
  });
});
