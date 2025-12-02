/**
 * TrafficStats Tests - TDD
 *
 * Tests for the aggregated statistics panel showing key metrics.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

import { TrafficStats, type TrafficStatsProps } from './traffic-stats';

const defaultProps: TrafficStatsProps = {
  activeExecutions: 12,
  totalToday: 1547,
  successRate: 98.5,
  avgLatencyMs: 245,
};

describe('TrafficStats', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders the stats container', () => {
      render(<TrafficStats {...defaultProps} />);
      expect(screen.getByTestId('traffic-stats')).toBeInTheDocument();
    });

    it('displays active executions count', () => {
      render(<TrafficStats {...defaultProps} />);
      expect(screen.getByText('12')).toBeInTheDocument();
      expect(screen.getByText(/active/i)).toBeInTheDocument();
    });

    it('displays total executions today', () => {
      render(<TrafficStats {...defaultProps} />);
      expect(screen.getByText('1,547')).toBeInTheDocument();
      expect(screen.getByText(/today/i)).toBeInTheDocument();
    });

    it('displays success rate', () => {
      render(<TrafficStats {...defaultProps} />);
      expect(screen.getByText('98.5%')).toBeInTheDocument();
      expect(screen.getByText(/success/i)).toBeInTheDocument();
    });

    it('displays average latency', () => {
      render(<TrafficStats {...defaultProps} />);
      expect(screen.getByText('245ms')).toBeInTheDocument();
      expect(screen.getByText(/latency/i)).toBeInTheDocument();
    });
  });
});
