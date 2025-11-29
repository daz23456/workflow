import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { WorkflowCardSkeleton } from './workflow-card-skeleton';

describe('WorkflowCardSkeleton', () => {
  it('renders with loading status role', () => {
    render(<WorkflowCardSkeleton />);

    const skeleton = screen.getByRole('status');
    expect(skeleton).toBeInTheDocument();
    expect(skeleton).toHaveAccessibleName('Loading workflow');
  });

  it('renders skeleton elements with pulse animation', () => {
    const { container } = render(<WorkflowCardSkeleton />);

    // Should have multiple animated skeleton elements
    const animatedElements = container.querySelectorAll('.animate-pulse');
    expect(animatedElements.length).toBeGreaterThan(5);
  });

  it('has proper card styling', () => {
    const { container } = render(<WorkflowCardSkeleton />);

    const card = container.firstChild as HTMLElement;
    expect(card).toHaveClass('rounded-lg', 'border', 'shadow-sm');
  });
});
