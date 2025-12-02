import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SystemMetricsCard } from './system-metrics-card';
import type { SystemMetrics } from '@/lib/api/types';

const mockMetrics: SystemMetrics = {
  totalExecutions: 1500,
  throughput: 4.17,
  p50Ms: 120,
  p95Ms: 450,
  p99Ms: 890,
  errorRate: 2.5,
  timeRange: 'Hour24',
};

describe('SystemMetricsCard', () => {
  it('should render all metric cards when data is available', () => {
    render(<SystemMetricsCard metrics={mockMetrics} isLoading={false} />);

    expect(screen.getByText('Throughput')).toBeInTheDocument();
    expect(screen.getByText('P95 Latency')).toBeInTheDocument();
    expect(screen.getByText('P99 Latency')).toBeInTheDocument();
    expect(screen.getByText('Error Rate')).toBeInTheDocument();
  });

  it('should display correct metric values', () => {
    render(<SystemMetricsCard metrics={mockMetrics} isLoading={false} />);

    expect(screen.getByText('4.2')).toBeInTheDocument(); // throughput
    expect(screen.getByText('450')).toBeInTheDocument(); // P95
    expect(screen.getByText('890')).toBeInTheDocument(); // P99
    expect(screen.getByText('2.5')).toBeInTheDocument(); // error rate
  });

  it('should show loading skeletons when isLoading is true', () => {
    render(<SystemMetricsCard metrics={undefined} isLoading={true} />);

    const loadingElements = screen.getAllByRole('status');
    expect(loadingElements.length).toBeGreaterThan(0);
  });

  it('should show units for metrics', () => {
    render(<SystemMetricsCard metrics={mockMetrics} isLoading={false} />);

    expect(screen.getByText('/hr')).toBeInTheDocument();
    expect(screen.getAllByText('ms').length).toBe(2);
    expect(screen.getByText('%')).toBeInTheDocument();
  });

  it('should apply success color for low error rate', () => {
    const lowErrorMetrics = { ...mockMetrics, errorRate: 0.5 };
    render(<SystemMetricsCard metrics={lowErrorMetrics} isLoading={false} />);

    const errorValue = screen.getByText('0.5');
    expect(errorValue).toHaveClass('text-green-600');
  });

  it('should apply warning color for moderate error rate', () => {
    const moderateErrorMetrics = { ...mockMetrics, errorRate: 3.0 };
    render(<SystemMetricsCard metrics={moderateErrorMetrics} isLoading={false} />);

    const errorValue = screen.getByText('3.0');
    expect(errorValue).toHaveClass('text-yellow-600');
  });

  it('should apply error color for high error rate', () => {
    const highErrorMetrics = { ...mockMetrics, errorRate: 8.0 };
    render(<SystemMetricsCard metrics={highErrorMetrics} isLoading={false} />);

    const errorValue = screen.getByText('8.0');
    expect(errorValue).toHaveClass('text-red-600');
  });

  it('should render with testid for integration testing', () => {
    render(<SystemMetricsCard metrics={mockMetrics} isLoading={false} />);

    expect(screen.getByTestId('system-metrics-card')).toBeInTheDocument();
  });
});
