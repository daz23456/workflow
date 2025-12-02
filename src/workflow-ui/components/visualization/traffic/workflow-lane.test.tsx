/**
 * WorkflowLane Tests - TDD
 *
 * Tests for the horizontal swimlane component representing a workflow
 * with task nodes that execution particles flow through.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

// Mock Three.js
vi.mock('@react-three/fiber', () => ({
  useFrame: vi.fn(),
  useThree: vi.fn(() => ({
    camera: { position: { x: 0, y: 0, z: 50 } },
  })),
}));

vi.mock('@react-three/drei', () => ({
  Box: ({ children, onClick, ...props }: { children?: React.ReactNode; onClick?: () => void; 'data-testid'?: string }) => (
    <div data-testid={props['data-testid'] || 'box'} onClick={onClick}>{children}</div>
  ),
  Sphere: ({ children }: { children?: React.ReactNode }) => (
    <div data-testid="sphere">{children}</div>
  ),
  Text: ({ children }: { children?: React.ReactNode }) => <div data-testid="lane-text">{children}</div>,
  Line: () => <div data-testid="lane-line" />,
}));

// Mock group element to be a div that passes through data-testid
vi.mock('react', async () => {
  const actual = await vi.importActual('react');
  return {
    ...actual,
  };
});

// The component uses JSX group elements which render as divs in testing
// We need to ensure they pass through data-testid properly

import { WorkflowLane, type WorkflowLaneProps } from './workflow-lane';

const defaultProps: WorkflowLaneProps = {
  id: 'wf-user-api',
  name: 'User API Workflow',
  color: '#4a9eff',
  yPosition: 0,
  tasks: [
    { id: 'validate', name: 'Validate Input', xPosition: 0 },
    { id: 'fetch-user', name: 'Fetch User', xPosition: 10 },
    { id: 'transform', name: 'Transform Data', xPosition: 20 },
    { id: 'respond', name: 'Send Response', xPosition: 30 },
  ],
};

// SVG wrapper for Three.js components that render to DOM in tests
const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <div data-testid="test-wrapper">{children}</div>
);

describe('WorkflowLane', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders the lane container', () => {
      render(<WorkflowLane {...defaultProps} />, { wrapper: TestWrapper });
      expect(screen.getByTestId('workflow-lane-wf-user-api')).toBeInTheDocument();
    });

    it('renders the workflow name label', () => {
      render(<WorkflowLane {...defaultProps} />, { wrapper: TestWrapper });
      const labels = screen.getAllByTestId('lane-text');
      // First label is the workflow name
      expect(labels[0]).toHaveTextContent('User API Workflow');
    });

    it('renders task nodes for each task', () => {
      render(<WorkflowLane {...defaultProps} />, { wrapper: TestWrapper });
      expect(screen.getByTestId('task-node-validate')).toBeInTheDocument();
      expect(screen.getByTestId('task-node-fetch-user')).toBeInTheDocument();
      expect(screen.getByTestId('task-node-transform')).toBeInTheDocument();
      expect(screen.getByTestId('task-node-respond')).toBeInTheDocument();
    });

    it('renders lane line connecting tasks', () => {
      render(<WorkflowLane {...defaultProps} />, { wrapper: TestWrapper });
      expect(screen.getByTestId('lane-line')).toBeInTheDocument();
    });
  });

  describe('interactivity', () => {
    it('calls onTaskClick when task node is clicked', () => {
      const onTaskClick = vi.fn();
      render(<WorkflowLane {...defaultProps} onTaskClick={onTaskClick} />, { wrapper: TestWrapper });

      fireEvent.click(screen.getByTestId('task-node-validate'));
      expect(onTaskClick).toHaveBeenCalledWith('wf-user-api', 'validate');
    });

    it('calls onLaneClick when lane is clicked', () => {
      const onLaneClick = vi.fn();
      render(<WorkflowLane {...defaultProps} onLaneClick={onLaneClick} />, { wrapper: TestWrapper });

      fireEvent.click(screen.getByTestId('workflow-lane-wf-user-api'));
      expect(onLaneClick).toHaveBeenCalledWith('wf-user-api');
    });
  });
});
