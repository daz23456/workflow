import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StarRating, CompactStarRating } from './star-rating';

describe('StarRating', () => {
  it('renders correct number of filled stars for rating 3', () => {
    render(<StarRating stars={3} />);

    const filledStars = screen.getAllByTestId(/star-\d+-filled/);
    const emptyStars = screen.getAllByTestId(/star-\d+-empty/);

    expect(filledStars).toHaveLength(3);
    expect(emptyStars).toHaveLength(2);
  });

  it('renders 5 empty stars for rating 0', () => {
    render(<StarRating stars={0} />);

    const emptyStars = screen.getAllByTestId(/star-\d+-empty/);
    expect(emptyStars).toHaveLength(5);
  });

  it('renders 5 filled stars for rating 5', () => {
    render(<StarRating stars={5} />);

    const filledStars = screen.getAllByTestId(/star-\d+-filled/);
    expect(filledStars).toHaveLength(5);
  });

  it('clamps negative values to 0', () => {
    render(<StarRating stars={-2} />);

    const emptyStars = screen.getAllByTestId(/star-\d+-empty/);
    expect(emptyStars).toHaveLength(5);
  });

  it('clamps values above max to maxStars', () => {
    render(<StarRating stars={10} maxStars={5} />);

    const filledStars = screen.getAllByTestId(/star-\d+-filled/);
    expect(filledStars).toHaveLength(5);
  });

  it('respects custom maxStars', () => {
    render(<StarRating stars={3} maxStars={3} />);

    const filledStars = screen.getAllByTestId(/star-\d+-filled/);
    expect(filledStars).toHaveLength(3);
  });

  it('shows count when showCount is true', () => {
    render(<StarRating stars={4} showCount />);

    expect(screen.getByTestId('star-count')).toHaveTextContent('(4/5)');
  });

  it('hides count when showCount is false', () => {
    render(<StarRating stars={4} />);

    expect(screen.queryByTestId('star-count')).not.toBeInTheDocument();
  });

  it('has correct aria-label', () => {
    render(<StarRating stars={3} maxStars={5} />);

    const rating = screen.getByTestId('star-rating');
    expect(rating).toHaveAttribute('aria-label', '3 out of 5 stars');
  });

  it('applies custom className', () => {
    render(<StarRating stars={3} className="custom-class" />);

    const rating = screen.getByTestId('star-rating');
    expect(rating).toHaveClass('custom-class');
  });
});

describe('CompactStarRating', () => {
  it('shows correct star value', () => {
    render(<CompactStarRating stars={4} />);

    expect(screen.getByTestId('compact-star-value')).toHaveTextContent('4');
  });

  it('applies green color for high ratings (4-5)', () => {
    render(<CompactStarRating stars={4} />);

    const value = screen.getByTestId('compact-star-value');
    expect(value).toHaveClass('text-green-600');
  });

  it('applies yellow color for medium ratings (2-3)', () => {
    render(<CompactStarRating stars={3} />);

    const value = screen.getByTestId('compact-star-value');
    expect(value).toHaveClass('text-yellow-600');
  });

  it('applies red color for low ratings (0-1)', () => {
    render(<CompactStarRating stars={1} />);

    const value = screen.getByTestId('compact-star-value');
    expect(value).toHaveClass('text-red-600');
  });

  it('clamps stars to valid range', () => {
    render(<CompactStarRating stars={10} />);

    expect(screen.getByTestId('compact-star-value')).toHaveTextContent('5');
  });

  it('has correct aria-label', () => {
    render(<CompactStarRating stars={3} />);

    const rating = screen.getByTestId('compact-star-rating');
    expect(rating).toHaveAttribute('aria-label', '3 out of 5 stars');
  });
});
