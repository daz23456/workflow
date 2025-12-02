/**
 * StationMarker Tests - TDD
 *
 * Tests for the station circle that represents a task on the tube map.
 * Stations are white circles with colored outlines.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

import { StationMarker, type StationMarkerProps } from './station-marker';

const defaultProps: StationMarkerProps = {
  id: 'station-validate',
  name: 'Validate Input',
  x: 200,
  y: 300,
  lineColor: '#DC241F',
};

const SvgWrapper = ({ children }: { children: React.ReactNode }) => (
  <svg data-testid="svg-wrapper">{children}</svg>
);

describe('StationMarker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders a circle for the station', () => {
      render(<StationMarker {...defaultProps} />, { wrapper: SvgWrapper });
      expect(screen.getByTestId('station-validate')).toBeInTheDocument();
    });

    it('positions the station at the specified coordinates', () => {
      render(<StationMarker {...defaultProps} />, { wrapper: SvgWrapper });
      const station = screen.getByTestId('station-validate');
      expect(station).toHaveAttribute('cx', '200');
      expect(station).toHaveAttribute('cy', '300');
    });

    it('has white fill (classic tube map style)', () => {
      render(<StationMarker {...defaultProps} />, { wrapper: SvgWrapper });
      const station = screen.getByTestId('station-validate');
      expect(station).toHaveAttribute('fill', 'white');
    });

    it('has line-colored stroke', () => {
      render(<StationMarker {...defaultProps} />, { wrapper: SvgWrapper });
      const station = screen.getByTestId('station-validate');
      expect(station).toHaveAttribute('stroke', '#DC241F');
    });

    it('renders the station name as label', () => {
      const { container } = render(<StationMarker {...defaultProps} />, { wrapper: SvgWrapper });
      // SVG text elements need to be queried differently
      const textElement = container.querySelector('text');
      expect(textElement).toBeInTheDocument();
      expect(textElement?.textContent).toBe('Validate Input');
    });
  });

  describe('interchange stations', () => {
    it('renders larger for interchange (multi-line) stations', () => {
      const { rerender } = render(
        <StationMarker {...defaultProps} isInterchange={false} />,
        { wrapper: SvgWrapper }
      );
      const normalStation = screen.getByTestId('station-validate');
      const normalRadius = parseFloat(normalStation.getAttribute('r') || '0');

      rerender(
        <SvgWrapper>
          <StationMarker {...defaultProps} isInterchange={true} />
        </SvgWrapper>
      );
      const interchangeStation = screen.getByTestId('station-validate');
      const interchangeRadius = parseFloat(interchangeStation.getAttribute('r') || '0');

      expect(interchangeRadius).toBeGreaterThan(normalRadius);
    });
  });

  describe('interactivity', () => {
    it('calls onClick when station is clicked', () => {
      const onClick = vi.fn();
      render(<StationMarker {...defaultProps} onClick={onClick} />, { wrapper: SvgWrapper });
      fireEvent.click(screen.getByTestId('station-validate'));
      expect(onClick).toHaveBeenCalledWith('station-validate');
    });
  });

  describe('terminus stations', () => {
    it('renders with bar for terminus (start/end)', () => {
      render(<StationMarker {...defaultProps} isTerminus={true} />, { wrapper: SvgWrapper });
      // Terminus stations have an additional bar element
      expect(screen.getByTestId('station-validate-terminus')).toBeInTheDocument();
    });
  });
});
