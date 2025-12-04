import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LatencyChart } from './latency-chart';
import type { WorkflowHistoryPoint } from '@/lib/api/types';

const mockData: WorkflowHistoryPoint[] = [
  { timestamp: '2024-01-01T00:00:00Z', avgDurationMs: 100, p95Ms: 200, errorRate: 1, count: 50 },
  { timestamp: '2024-01-02T00:00:00Z', avgDurationMs: 150, p95Ms: 300, errorRate: 2, count: 60 },
  { timestamp: '2024-01-03T00:00:00Z', avgDurationMs: 120, p95Ms: 250, errorRate: 1.5, count: 55 },
];

describe('LatencyChart', () => {
  it('should render chart title', () => {
    render(<LatencyChart data={mockData} isLoading={false} />);

    expect(screen.getByText('Latency Over Time')).toBeInTheDocument();
  });

  it('should render custom title when provided', () => {
    render(<LatencyChart data={mockData} isLoading={false} title="Custom Chart Title" />);

    expect(screen.getByText('Custom Chart Title')).toBeInTheDocument();
  });

  it('should show loading state', () => {
    render(<LatencyChart data={undefined} isLoading={true} />);

    expect(screen.getByRole('status', { name: 'Loading chart' })).toBeInTheDocument();
  });

  it('should show empty state when no data', () => {
    render(<LatencyChart data={[]} isLoading={false} />);

    expect(screen.getByText('No data available')).toBeInTheDocument();
  });

  it('should display min and max P95 values', () => {
    render(<LatencyChart data={mockData} isLoading={false} />);

    expect(screen.getByText(/Min P95:/)).toBeInTheDocument();
    expect(screen.getByText(/Max P95:/)).toBeInTheDocument();
    expect(screen.getByText(/200/)).toBeInTheDocument();
    expect(screen.getByText(/300/)).toBeInTheDocument();
  });

  it('should render with testid for integration testing', () => {
    render(<LatencyChart data={mockData} isLoading={false} />);

    expect(screen.getByTestId('latency-chart')).toBeInTheDocument();
  });

  it('should handle single data point', () => {
    const singlePoint = [mockData[0]];
    render(<LatencyChart data={singlePoint} isLoading={false} />);

    expect(screen.getByTestId('latency-chart')).toBeInTheDocument();
    // Single point: min and max should both be 200
    expect(screen.getAllByText(/200/).length).toBeGreaterThanOrEqual(2);
  });
});
