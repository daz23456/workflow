import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QualityBadge, QualityBadgeWithStars, QualityIndicator } from './quality-badge';

describe('QualityBadge', () => {
  it('renders badge with star value', () => {
    render(<QualityBadge stars={4} />);

    expect(screen.getByTestId('quality-badge')).toBeInTheDocument();
    expect(screen.getByTestId('quality-badge-value')).toHaveTextContent('4');
  });

  it('applies green colors for high ratings (4-5)', () => {
    render(<QualityBadge stars={4} />);

    const badge = screen.getByTestId('quality-badge');
    expect(badge).toHaveClass('bg-green-100');
    expect(badge).toHaveClass('text-green-700');
  });

  it('applies yellow colors for medium ratings (2-3)', () => {
    render(<QualityBadge stars={3} />);

    const badge = screen.getByTestId('quality-badge');
    expect(badge).toHaveClass('bg-yellow-100');
    expect(badge).toHaveClass('text-yellow-700');
  });

  it('applies red colors for low ratings (0-1)', () => {
    render(<QualityBadge stars={1} />);

    const badge = screen.getByTestId('quality-badge');
    expect(badge).toHaveClass('bg-red-100');
    expect(badge).toHaveClass('text-red-700');
  });

  it('clamps stars to valid range (0-5)', () => {
    render(<QualityBadge stars={10} />);

    expect(screen.getByTestId('quality-badge-value')).toHaveTextContent('5');
  });

  it('clamps negative stars to 0', () => {
    render(<QualityBadge stars={-2} />);

    expect(screen.getByTestId('quality-badge-value')).toHaveTextContent('0');
  });

  it('shows label when showLabel is true', () => {
    render(<QualityBadge stars={4} showLabel />);

    expect(screen.getByText('/5')).toBeInTheDocument();
  });

  it('hides label when showLabel is false', () => {
    render(<QualityBadge stars={4} />);

    expect(screen.queryByText('/5')).not.toBeInTheDocument();
  });

  it('applies size classes for sm variant', () => {
    render(<QualityBadge stars={4} size="sm" />);

    const badge = screen.getByTestId('quality-badge');
    expect(badge).toHaveClass('px-1.5', 'py-0.5', 'text-xs');
  });

  it('applies size classes for lg variant', () => {
    render(<QualityBadge stars={4} size="lg" />);

    const badge = screen.getByTestId('quality-badge');
    expect(badge).toHaveClass('px-3', 'py-1.5', 'text-base');
  });

  it('has correct aria-label', () => {
    render(<QualityBadge stars={3} />);

    const badge = screen.getByTestId('quality-badge');
    expect(badge).toHaveAttribute('aria-label', 'Error quality: 3 out of 5 stars');
  });

  it('has role="status"', () => {
    render(<QualityBadge stars={4} />);

    const badge = screen.getByTestId('quality-badge');
    expect(badge).toHaveAttribute('role', 'status');
  });

  it('applies custom className', () => {
    render(<QualityBadge stars={4} className="custom-class" />);

    expect(screen.getByTestId('quality-badge')).toHaveClass('custom-class');
  });
});

describe('QualityBadgeWithStars', () => {
  it('renders with full star display by default', () => {
    render(<QualityBadgeWithStars stars={4} />);

    expect(screen.getByTestId('quality-badge-with-stars')).toBeInTheDocument();
    expect(screen.getByTestId('star-rating')).toBeInTheDocument();
  });

  it('renders compact star rating when showAllStars is false', () => {
    render(<QualityBadgeWithStars stars={4} showAllStars={false} />);

    expect(screen.getByTestId('compact-star-rating')).toBeInTheDocument();
    expect(screen.queryByTestId('star-rating')).not.toBeInTheDocument();
  });

  it('applies green background for high ratings', () => {
    render(<QualityBadgeWithStars stars={4} />);

    const badge = screen.getByTestId('quality-badge-with-stars');
    expect(badge).toHaveClass('bg-green-50');
  });

  it('applies yellow background for medium ratings', () => {
    render(<QualityBadgeWithStars stars={3} />);

    const badge = screen.getByTestId('quality-badge-with-stars');
    expect(badge).toHaveClass('bg-yellow-50');
  });

  it('applies red background for low ratings', () => {
    render(<QualityBadgeWithStars stars={1} />);

    const badge = screen.getByTestId('quality-badge-with-stars');
    expect(badge).toHaveClass('bg-red-50');
  });

  it('clamps stars to valid range', () => {
    render(<QualityBadgeWithStars stars={10} showAllStars={false} />);

    expect(screen.getByTestId('compact-star-value')).toHaveTextContent('5');
  });

  it('applies custom className', () => {
    render(<QualityBadgeWithStars stars={4} className="custom-class" />);

    expect(screen.getByTestId('quality-badge-with-stars')).toHaveClass('custom-class');
  });
});

describe('QualityIndicator', () => {
  it('renders with default labels based on rating', () => {
    render(<QualityIndicator stars={4} />);

    expect(screen.getByTestId('quality-indicator')).toBeInTheDocument();
    expect(screen.getByText('Good')).toBeInTheDocument();
  });

  it('shows "Fair" for medium ratings', () => {
    render(<QualityIndicator stars={3} />);

    expect(screen.getByText('Fair')).toBeInTheDocument();
  });

  it('shows "Poor" for low ratings', () => {
    render(<QualityIndicator stars={1} />);

    expect(screen.getByText('Poor')).toBeInTheDocument();
  });

  it('uses custom label when provided', () => {
    render(<QualityIndicator stars={4} label="Excellent" />);

    expect(screen.getByText('Excellent')).toBeInTheDocument();
    expect(screen.queryByText('Good')).not.toBeInTheDocument();
  });

  it('applies green dot and text for high ratings', () => {
    render(<QualityIndicator stars={4} />);

    const indicator = screen.getByTestId('quality-indicator');
    expect(indicator.querySelector('.bg-green-500')).toBeInTheDocument();
    expect(indicator.querySelector('.text-green-600')).toBeInTheDocument();
  });

  it('applies yellow dot and text for medium ratings', () => {
    render(<QualityIndicator stars={2} />);

    const indicator = screen.getByTestId('quality-indicator');
    expect(indicator.querySelector('.bg-yellow-500')).toBeInTheDocument();
    expect(indicator.querySelector('.text-yellow-600')).toBeInTheDocument();
  });

  it('applies red dot and text for low ratings', () => {
    render(<QualityIndicator stars={1} />);

    const indicator = screen.getByTestId('quality-indicator');
    expect(indicator.querySelector('.bg-red-500')).toBeInTheDocument();
    expect(indicator.querySelector('.text-red-600')).toBeInTheDocument();
  });

  it('clamps stars to valid range', () => {
    render(<QualityIndicator stars={10} />);

    // 10 clamped to 5, which is >= 4, so should show "Good"
    expect(screen.getByText('Good')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(<QualityIndicator stars={4} className="custom-class" />);

    expect(screen.getByTestId('quality-indicator')).toHaveClass('custom-class');
  });
});
