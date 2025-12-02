/**
 * TubeCanvas Tests - TDD
 *
 * Tests for the SVG canvas that renders the London Underground-style tube map.
 * Uses Beck's design principles: only 0°, 45°, and 90° angles.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

import { TubeCanvas, type TubeCanvasProps } from './tube-canvas';

const defaultProps: TubeCanvasProps = {
  width: 800,
  height: 600,
};

describe('TubeCanvas', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders an SVG element', () => {
      render(<TubeCanvas {...defaultProps} />);
      const svg = screen.getByTestId('tube-canvas');
      expect(svg.tagName.toLowerCase()).toBe('svg');
    });

    it('applies the specified dimensions', () => {
      render(<TubeCanvas {...defaultProps} />);
      const svg = screen.getByTestId('tube-canvas');
      expect(svg).toHaveAttribute('width', '800');
      expect(svg).toHaveAttribute('height', '600');
    });

    it('has a dark background for tube map aesthetic', () => {
      render(<TubeCanvas {...defaultProps} />);
      const svg = screen.getByTestId('tube-canvas');
      expect(svg).toHaveStyle({ backgroundColor: expect.stringMatching(/#|rgb/) });
    });

    it('renders children (lines, stations)', () => {
      render(
        <TubeCanvas {...defaultProps}>
          <circle data-testid="test-station" cx={100} cy={100} r={5} />
        </TubeCanvas>
      );
      expect(screen.getByTestId('test-station')).toBeInTheDocument();
    });
  });

  describe('viewBox', () => {
    it('has a viewBox for responsive scaling', () => {
      render(<TubeCanvas {...defaultProps} />);
      const svg = screen.getByTestId('tube-canvas');
      expect(svg).toHaveAttribute('viewBox');
    });
  });

  describe('accessibility', () => {
    it('has an accessible role', () => {
      render(<TubeCanvas {...defaultProps} />);
      const svg = screen.getByTestId('tube-canvas');
      expect(svg).toHaveAttribute('role', 'img');
    });

    it('has an aria-label', () => {
      render(<TubeCanvas {...defaultProps} />);
      const svg = screen.getByTestId('tube-canvas');
      expect(svg).toHaveAttribute('aria-label');
    });
  });

  describe('styling', () => {
    it('applies custom className', () => {
      render(<TubeCanvas {...defaultProps} className="custom-tube" />);
      const svg = screen.getByTestId('tube-canvas');
      expect(svg).toHaveClass('custom-tube');
    });
  });
});
