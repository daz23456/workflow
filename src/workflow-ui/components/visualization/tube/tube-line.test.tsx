/**
 * TubeLine Tests - TDD
 *
 * Tests for the colored tube line that represents a workflow.
 * Lines follow Beck's 0°/45°/90° angle rules.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

import { TubeLine, type TubeLineProps } from './tube-line';

const defaultProps: TubeLineProps = {
  id: 'central',
  name: 'Central Line',
  color: '#DC241F',
  points: [
    { x: 100, y: 300 },
    { x: 200, y: 300 },
    { x: 250, y: 250 },
    { x: 400, y: 250 },
  ],
};

// Wrapper to provide SVG context
const SvgWrapper = ({ children }: { children: React.ReactNode }) => (
  <svg data-testid="svg-wrapper">{children}</svg>
);

describe('TubeLine', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders a path element', () => {
      render(<TubeLine {...defaultProps} />, { wrapper: SvgWrapper });
      expect(screen.getByTestId('tube-line-central')).toBeInTheDocument();
    });

    it('applies the line color', () => {
      render(<TubeLine {...defaultProps} />, { wrapper: SvgWrapper });
      const line = screen.getByTestId('tube-line-central');
      expect(line).toHaveAttribute('stroke', '#DC241F');
    });

    it('has rounded line caps for authentic tube look', () => {
      render(<TubeLine {...defaultProps} />, { wrapper: SvgWrapper });
      const line = screen.getByTestId('tube-line-central');
      expect(line).toHaveAttribute('stroke-linecap', 'round');
    });

    it('has appropriate stroke width', () => {
      render(<TubeLine {...defaultProps} />, { wrapper: SvgWrapper });
      const line = screen.getByTestId('tube-line-central');
      const strokeWidth = parseFloat(line.getAttribute('stroke-width') || '0');
      expect(strokeWidth).toBeGreaterThanOrEqual(6);
    });
  });

  describe('path generation', () => {
    it('generates a valid SVG path', () => {
      render(<TubeLine {...defaultProps} />, { wrapper: SvgWrapper });
      const line = screen.getByTestId('tube-line-central');
      const d = line.getAttribute('d');
      expect(d).toMatch(/^M/); // Starts with Move command
      expect(d).toContain('L'); // Contains Line commands
    });
  });

  describe('interactivity', () => {
    it('calls onClick when line is clicked', () => {
      const onClick = vi.fn();
      render(<TubeLine {...defaultProps} onClick={onClick} />, { wrapper: SvgWrapper });
      fireEvent.click(screen.getByTestId('tube-line-central'));
      expect(onClick).toHaveBeenCalledWith('central');
    });

    it('has pointer cursor for interactivity', () => {
      render(<TubeLine {...defaultProps} />, { wrapper: SvgWrapper });
      const line = screen.getByTestId('tube-line-central');
      // Check cursor style is set (inline style check)
      expect(line.style.cursor).toBe('pointer');
    });
  });
});
