import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ImprovementTips, SingleTip, TipsBadge } from './improvement-tips';

describe('ImprovementTips', () => {
  const mockTips = [
    'Add a machine-readable error code',
    'Use appropriate HTTP status code (404 for not found)',
    'Include a request_id for debugging',
    'Add an actionable suggestion for the user',
    'Include documentation links',
  ];

  it('renders all tips when count is within maxVisible', () => {
    const shortTips = mockTips.slice(0, 2);
    render(<ImprovementTips tips={shortTips} />);

    expect(screen.getByTestId('improvement-tips')).toBeInTheDocument();
    expect(screen.getByTestId('tip-0')).toBeInTheDocument();
    expect(screen.getByTestId('tip-1')).toBeInTheDocument();
  });

  it('shows tip count in header', () => {
    render(<ImprovementTips tips={mockTips} />);

    expect(screen.getByText('(5)')).toBeInTheDocument();
  });

  it('shows "no improvements needed" when tips array is empty', () => {
    render(<ImprovementTips tips={[]} />);

    expect(screen.getByTestId('improvement-tips-none')).toBeInTheDocument();
    expect(screen.getByText('No improvements needed - all criteria met!')).toBeInTheDocument();
  });

  it('collapses tips beyond maxVisible by default', () => {
    render(<ImprovementTips tips={mockTips} maxVisible={3} />);

    expect(screen.getByTestId('tip-0')).toBeInTheDocument();
    expect(screen.getByTestId('tip-1')).toBeInTheDocument();
    expect(screen.getByTestId('tip-2')).toBeInTheDocument();
    expect(screen.queryByTestId('tip-3')).not.toBeInTheDocument();
    expect(screen.queryByTestId('tip-4')).not.toBeInTheDocument();
  });

  it('shows "show more" button when tips exceed maxVisible', () => {
    render(<ImprovementTips tips={mockTips} maxVisible={3} />);

    expect(screen.getByTestId('toggle-tips')).toBeInTheDocument();
    expect(screen.getByText('Show 2 more')).toBeInTheDocument();
  });

  it('expands to show all tips when "show more" is clicked', () => {
    render(<ImprovementTips tips={mockTips} maxVisible={3} />);

    fireEvent.click(screen.getByTestId('toggle-tips'));

    expect(screen.getByTestId('tip-0')).toBeInTheDocument();
    expect(screen.getByTestId('tip-1')).toBeInTheDocument();
    expect(screen.getByTestId('tip-2')).toBeInTheDocument();
    expect(screen.getByTestId('tip-3')).toBeInTheDocument();
    expect(screen.getByTestId('tip-4')).toBeInTheDocument();
    expect(screen.getByText('Show less')).toBeInTheDocument();
  });

  it('collapses when "show less" is clicked', () => {
    render(<ImprovementTips tips={mockTips} maxVisible={3} />);

    // Expand
    fireEvent.click(screen.getByTestId('toggle-tips'));
    expect(screen.getByTestId('tip-4')).toBeInTheDocument();

    // Collapse
    fireEvent.click(screen.getByTestId('toggle-tips'));
    expect(screen.queryByTestId('tip-4')).not.toBeInTheDocument();
  });

  it('does not show toggle button when tips count equals maxVisible', () => {
    render(<ImprovementTips tips={mockTips.slice(0, 3)} maxVisible={3} />);

    expect(screen.queryByTestId('toggle-tips')).not.toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(<ImprovementTips tips={mockTips} className="custom-class" />);

    expect(screen.getByTestId('improvement-tips')).toHaveClass('custom-class');
  });
});

describe('SingleTip', () => {
  it('renders tip text', () => {
    render(<SingleTip tip="Add error codes for machine readability" />);

    expect(screen.getByTestId('single-tip')).toBeInTheDocument();
    expect(screen.getByText('Add error codes for machine readability')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(<SingleTip tip="Test tip" className="custom-class" />);

    expect(screen.getByTestId('single-tip')).toHaveClass('custom-class');
  });
});

describe('TipsBadge', () => {
  it('shows "Perfect" badge when count is 0', () => {
    render(<TipsBadge count={0} />);

    expect(screen.getByTestId('tips-badge-none')).toBeInTheDocument();
    expect(screen.getByText('Perfect')).toBeInTheDocument();
  });

  it('shows singular "tip" for count of 1', () => {
    render(<TipsBadge count={1} />);

    expect(screen.getByTestId('tips-badge')).toBeInTheDocument();
    expect(screen.getByText('1 tip')).toBeInTheDocument();
  });

  it('shows plural "tips" for count > 1', () => {
    render(<TipsBadge count={3} />);

    expect(screen.getByTestId('tips-badge')).toBeInTheDocument();
    expect(screen.getByText('3 tips')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(<TipsBadge count={2} className="custom-class" />);

    expect(screen.getByTestId('tips-badge')).toHaveClass('custom-class');
  });
});
