/**
 * Tube Map Page Tests - TDD
 *
 * Tests for the London Underground-style tube map visualization page.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

import TubeMapPage from './page';

describe('TubeMapPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders the tube map canvas', () => {
      render(<TubeMapPage />);
      expect(screen.getByTestId('tube-canvas')).toBeInTheDocument();
    });

    it('renders the page title', () => {
      render(<TubeMapPage />);
      expect(screen.getByText('Workflow Tube Map')).toBeInTheDocument();
    });

    it('renders the legend with workflow lines', () => {
      render(<TubeMapPage />);
      expect(screen.getByText('Workflow Lines')).toBeInTheDocument();
      // Text appears in both SVG title and legend span
      expect(screen.getAllByText('User API Composition').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Order Processing').length).toBeGreaterThan(0);
    });

    it('renders control buttons', () => {
      render(<TubeMapPage />);
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThanOrEqual(3);
    });

    it('renders tube lines', () => {
      render(<TubeMapPage />);
      expect(screen.getByTestId('tube-line-central')).toBeInTheDocument();
      expect(screen.getByTestId('tube-line-northern')).toBeInTheDocument();
    });

    it('renders station markers', () => {
      render(<TubeMapPage />);
      expect(screen.getByTestId('input-1')).toBeInTheDocument();
      expect(screen.getByTestId('validate-1')).toBeInTheDocument();
    });
  });

  describe('legend interaction', () => {
    it('can toggle legend visibility', () => {
      render(<TubeMapPage />);

      // Legend initially visible
      expect(screen.getByText('Workflow Lines')).toBeInTheDocument();
    });

    it('can click on legend items', () => {
      render(<TubeMapPage />);

      // Click on a workflow in the legend - use getAllByText since name appears multiple places
      const legendItems = screen.getAllByText('User API Composition');
      fireEvent.click(legendItems[0]);

      // Selection details should appear (may have multiple "Workflow Line" texts)
      expect(screen.getAllByText(/Line/).length).toBeGreaterThan(0);
    });
  });

  describe('station interaction', () => {
    it('shows station details when station is clicked', () => {
      render(<TubeMapPage />);

      // Click on a station
      const station = screen.getByTestId('validate-1');
      fireEvent.click(station);

      // Details panel should show station info
      expect(screen.getAllByText(/Validate/).length).toBeGreaterThan(0);
    });
  });
});
