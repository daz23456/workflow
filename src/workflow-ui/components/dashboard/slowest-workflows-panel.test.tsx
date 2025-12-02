import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SlowestWorkflowsPanel } from './slowest-workflows-panel';
import type { SlowestWorkflow } from '@/lib/api/types';

const mockWorkflows: SlowestWorkflow[] = [
  { name: 'slow-workflow', avgDurationMs: 2000, p95Ms: 3000, degradationPercent: 50 },
  { name: 'medium-workflow', avgDurationMs: 1000, p95Ms: 1500, degradationPercent: -20 },
  { name: 'improving-workflow', avgDurationMs: 500, p95Ms: 800, degradationPercent: 5 },
];

describe('SlowestWorkflowsPanel', () => {
  it('should render panel header', () => {
    render(<SlowestWorkflowsPanel workflows={mockWorkflows} isLoading={false} />);

    expect(screen.getByText('Slowest Workflows')).toBeInTheDocument();
  });

  it('should render workflow names with rankings', () => {
    render(<SlowestWorkflowsPanel workflows={mockWorkflows} isLoading={false} />);

    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('slow-workflow')).toBeInTheDocument();
  });

  it('should display duration metrics', () => {
    render(<SlowestWorkflowsPanel workflows={mockWorkflows} isLoading={false} />);

    expect(screen.getByText(/Avg: 2000ms/)).toBeInTheDocument();
    expect(screen.getByText(/P95: 3000ms/)).toBeInTheDocument();
  });

  it('should show positive degradation with up arrow', () => {
    render(<SlowestWorkflowsPanel workflows={mockWorkflows} isLoading={false} />);

    expect(screen.getByText('+50%')).toBeInTheDocument();
  });

  it('should show negative degradation (improvement) with down arrow', () => {
    render(<SlowestWorkflowsPanel workflows={mockWorkflows} isLoading={false} />);

    expect(screen.getByText('-20%')).toBeInTheDocument();
  });

  it('should show loading skeletons when isLoading is true', () => {
    render(<SlowestWorkflowsPanel workflows={undefined} isLoading={true} />);

    const loadingElements = screen.getAllByRole('status');
    expect(loadingElements.length).toBe(5);
  });

  it('should show empty state when no data', () => {
    render(<SlowestWorkflowsPanel workflows={[]} isLoading={false} />);

    expect(screen.getByText('No workflow data available')).toBeInTheDocument();
  });

  it('should render workflow links', () => {
    render(<SlowestWorkflowsPanel workflows={mockWorkflows} isLoading={false} />);

    const link = screen.getByRole('link', { name: 'slow-workflow' });
    expect(link).toHaveAttribute('href', '/workflows/slow-workflow');
  });

  it('should render with testid for integration testing', () => {
    render(<SlowestWorkflowsPanel workflows={mockWorkflows} isLoading={false} />);

    expect(screen.getByTestId('slowest-workflows-panel')).toBeInTheDocument();
  });

  it('should apply correct colors for degradation indicators', () => {
    render(<SlowestWorkflowsPanel workflows={mockWorkflows} isLoading={false} />);

    // High degradation should be red
    const degraded = screen.getByText('+50%').closest('span');
    expect(degraded).toHaveClass('text-red-600');

    // Improvement should be green
    const improved = screen.getByText('-20%').closest('span');
    expect(improved).toHaveClass('text-green-600');
  });
});
