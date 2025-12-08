import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QualityBreakdown, QualitySummaryBar, type CriterionResult } from './quality-breakdown';

const mockCriteria: CriterionResult[] = [
  {
    criterion: 'HasMessage',
    name: 'Human-Readable Message',
    met: true,
    details: 'Found message: "User not found"',
  },
  {
    criterion: 'HasErrorCode',
    name: 'Machine-Readable Error Code',
    met: true,
    details: 'Found code: NOT_FOUND',
  },
  {
    criterion: 'AppropriateHttpStatus',
    name: 'Appropriate HTTP Status',
    met: false,
    tip: 'Use 404 for not found errors',
  },
  {
    criterion: 'HasRequestId',
    name: 'Request Correlation ID',
    met: false,
    tip: 'Add a request_id field for debugging',
  },
  {
    criterion: 'HasActionableSuggestion',
    name: 'Actionable Suggestion',
    met: true,
    details: 'Found suggestion',
  },
];

describe('QualityBreakdown', () => {
  it('renders all criteria', () => {
    render(<QualityBreakdown criteria={mockCriteria} />);

    expect(screen.getByTestId('quality-breakdown')).toBeInTheDocument();
    expect(screen.getByTestId('criterion-HasMessage')).toBeInTheDocument();
    expect(screen.getByTestId('criterion-HasErrorCode')).toBeInTheDocument();
    expect(screen.getByTestId('criterion-AppropriateHttpStatus')).toBeInTheDocument();
    expect(screen.getByTestId('criterion-HasRequestId')).toBeInTheDocument();
    expect(screen.getByTestId('criterion-HasActionableSuggestion')).toBeInTheDocument();
  });

  it('shows correct count of met criteria', () => {
    render(<QualityBreakdown criteria={mockCriteria} />);

    expect(screen.getByText('3/5 met')).toBeInTheDocument();
  });

  it('shows empty message when no criteria', () => {
    render(<QualityBreakdown criteria={[]} />);

    expect(screen.getByTestId('quality-breakdown-empty')).toBeInTheDocument();
    expect(screen.getByText('No criteria data available')).toBeInTheDocument();
  });

  it('shows details for met criteria in expanded mode', () => {
    render(<QualityBreakdown criteria={mockCriteria} compact={false} />);

    expect(screen.getByText('Found message: "User not found"')).toBeInTheDocument();
    expect(screen.getByText('Found code: NOT_FOUND')).toBeInTheDocument();
  });

  it('shows tips for unmet criteria in expanded mode', () => {
    render(<QualityBreakdown criteria={mockCriteria} compact={false} />);

    expect(screen.getByText('Use 404 for not found errors')).toBeInTheDocument();
    expect(screen.getByText('Add a request_id field for debugging')).toBeInTheDocument();
  });

  it('shows compact chips in compact mode', () => {
    render(<QualityBreakdown criteria={mockCriteria} compact />);

    expect(screen.getByTestId('criterion-chip-HasMessage')).toBeInTheDocument();
    expect(screen.getByTestId('criterion-chip-HasErrorCode')).toBeInTheDocument();
    expect(screen.getByTestId('criterion-chip-AppropriateHttpStatus')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(<QualityBreakdown criteria={mockCriteria} className="custom-class" />);

    expect(screen.getByTestId('quality-breakdown')).toHaveClass('custom-class');
  });
});

describe('QualitySummaryBar', () => {
  it('renders progress bar', () => {
    render(<QualitySummaryBar metCount={3} totalCount={5} />);

    expect(screen.getByTestId('quality-summary-bar')).toBeInTheDocument();
    expect(screen.getByText('3/5')).toBeInTheDocument();
  });

  it('shows green color for high percentage (80%+)', () => {
    render(<QualitySummaryBar metCount={4} totalCount={5} />);

    const bar = screen.getByRole('progressbar');
    expect(bar).toHaveClass('bg-green-500');
  });

  it('shows yellow color for medium percentage (40-79%)', () => {
    render(<QualitySummaryBar metCount={3} totalCount={5} />);

    const bar = screen.getByRole('progressbar');
    expect(bar).toHaveClass('bg-yellow-500');
  });

  it('shows red color for low percentage (<40%)', () => {
    render(<QualitySummaryBar metCount={1} totalCount={5} />);

    const bar = screen.getByRole('progressbar');
    expect(bar).toHaveClass('bg-red-500');
  });

  it('handles zero total gracefully', () => {
    render(<QualitySummaryBar metCount={0} totalCount={0} />);

    expect(screen.getByText('0/0')).toBeInTheDocument();
  });

  it('has correct aria attributes', () => {
    render(<QualitySummaryBar metCount={3} totalCount={5} />);

    const bar = screen.getByRole('progressbar');
    expect(bar).toHaveAttribute('aria-valuenow', '3');
    expect(bar).toHaveAttribute('aria-valuemin', '0');
    expect(bar).toHaveAttribute('aria-valuemax', '5');
  });
});
