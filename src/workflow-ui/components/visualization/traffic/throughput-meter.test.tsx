/**
 * ThroughputMeter Tests - TDD
 *
 * Tests for the real-time requests/second gauge display.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

import { ThroughputMeter, type ThroughputMeterProps } from './throughput-meter';

const defaultProps: ThroughputMeterProps = {
  currentRate: 45.5,
  maxRate: 100,
};

describe('ThroughputMeter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders the meter container', () => {
      render(<ThroughputMeter {...defaultProps} />);
      expect(screen.getByTestId('throughput-meter')).toBeInTheDocument();
    });

    it('displays the current rate value', () => {
      render(<ThroughputMeter {...defaultProps} />);
      expect(screen.getByText('45.5')).toBeInTheDocument();
    });

    it('displays the requests/sec label', () => {
      render(<ThroughputMeter {...defaultProps} />);
      expect(screen.getByText(/req\/s/i)).toBeInTheDocument();
    });

    it('renders the gauge arc', () => {
      render(<ThroughputMeter {...defaultProps} />);
      expect(screen.getByTestId('gauge-arc')).toBeInTheDocument();
    });

    it('applies color based on load level', () => {
      const { rerender } = render(<ThroughputMeter currentRate={20} maxRate={100} />);
      // Low load - should be green
      expect(screen.getByTestId('throughput-meter')).toBeInTheDocument();

      rerender(<ThroughputMeter currentRate={80} maxRate={100} />);
      // High load - different color
      expect(screen.getByTestId('throughput-meter')).toBeInTheDocument();
    });
  });
});
