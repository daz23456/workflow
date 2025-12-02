import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { WorkflowMetricsTable } from './workflow-metrics-table';
import type { WorkflowMetrics } from '@/lib/api/types';

const mockWorkflows: WorkflowMetrics[] = [
  { name: 'user-signup', avgDurationMs: 234, p95Ms: 400, errorRate: 0.5, executionCount: 1000 },
  { name: 'order-process', avgDurationMs: 456, p95Ms: 700, errorRate: 3.2, executionCount: 500 },
  { name: 'payment-flow', avgDurationMs: 892, p95Ms: 1200, errorRate: 5.5, executionCount: 250 },
];

describe('WorkflowMetricsTable', () => {
  it('should render table headers', () => {
    render(<WorkflowMetricsTable workflows={mockWorkflows} isLoading={false} />);

    expect(screen.getByText('Workflow')).toBeInTheDocument();
    expect(screen.getByText('Avg Duration')).toBeInTheDocument();
    expect(screen.getByText('P95')).toBeInTheDocument();
    expect(screen.getByText('Error Rate')).toBeInTheDocument();
    expect(screen.getByText('Executions')).toBeInTheDocument();
  });

  it('should render workflow data', () => {
    render(<WorkflowMetricsTable workflows={mockWorkflows} isLoading={false} />);

    expect(screen.getByText('user-signup')).toBeInTheDocument();
    expect(screen.getByText('order-process')).toBeInTheDocument();
    expect(screen.getByText('payment-flow')).toBeInTheDocument();
  });

  it('should display duration values with ms suffix', () => {
    render(<WorkflowMetricsTable workflows={mockWorkflows} isLoading={false} />);

    expect(screen.getByText('234ms')).toBeInTheDocument();
    expect(screen.getByText('456ms')).toBeInTheDocument();
  });

  it('should format execution count with locale separator', () => {
    render(<WorkflowMetricsTable workflows={mockWorkflows} isLoading={false} />);

    expect(screen.getByText('1,000')).toBeInTheDocument();
  });

  it('should show loading skeletons when isLoading is true', () => {
    render(<WorkflowMetricsTable workflows={undefined} isLoading={true} />);

    const loadingElements = screen.getAllByRole('status');
    expect(loadingElements.length).toBe(5);
  });

  it('should show empty state when no data', () => {
    render(<WorkflowMetricsTable workflows={[]} isLoading={false} />);

    expect(screen.getByText('No workflow data available')).toBeInTheDocument();
  });

  it('should apply correct color classes for error rate', () => {
    render(<WorkflowMetricsTable workflows={mockWorkflows} isLoading={false} />);

    const lowError = screen.getByText('0.5%');
    expect(lowError).toHaveClass('text-green-600');

    const highError = screen.getByText('5.5%');
    expect(highError).toHaveClass('text-red-600');
  });

  it('should render workflow links', () => {
    render(<WorkflowMetricsTable workflows={mockWorkflows} isLoading={false} />);

    const link = screen.getByRole('link', { name: 'user-signup' });
    expect(link).toHaveAttribute('href', '/workflows/user-signup');
  });

  it('should render with testid for integration testing', () => {
    render(<WorkflowMetricsTable workflows={mockWorkflows} isLoading={false} />);

    expect(screen.getByTestId('workflow-metrics-table')).toBeInTheDocument();
  });
});
