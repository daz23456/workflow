import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { CategoryBadge } from './category-badge';

describe('CategoryBadge', () => {
  it('renders category text', () => {
    render(<CategoryBadge category="payments" />);
    expect(screen.getByText('payments')).toBeInTheDocument();
  });

  it('has correct default styling (different from tag)', () => {
    const { container } = render(<CategoryBadge category="payments" />);
    const badge = container.firstChild;
    expect(badge).toHaveClass('bg-purple-50');
  });

  it('applies custom className', () => {
    const { container } = render(<CategoryBadge category="payments" className="custom-class" />);
    const badge = container.firstChild;
    expect(badge).toHaveClass('custom-class');
  });

  it('renders removable badge with X button', () => {
    render(<CategoryBadge category="payments" onRemove={() => {}} />);
    expect(screen.getByRole('button', { name: /remove/i })).toBeInTheDocument();
  });

  it('calls onRemove when X button clicked', async () => {
    const user = userEvent.setup();
    const onRemove = vi.fn();
    render(<CategoryBadge category="payments" onRemove={onRemove} />);

    await user.click(screen.getByRole('button', { name: /remove/i }));
    expect(onRemove).toHaveBeenCalledWith('payments');
  });

  it('is clickable when onClick provided', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<CategoryBadge category="payments" onClick={onClick} />);

    await user.click(screen.getByText('payments'));
    expect(onClick).toHaveBeenCalledWith('payments');
  });

  it('renders with folder icon by default', () => {
    render(<CategoryBadge category="payments" />);
    // Should have an svg icon
    expect(screen.getByText('payments').parentElement?.querySelector('svg')).toBeInTheDocument();
  });

  it('can hide icon', () => {
    render(<CategoryBadge category="payments" showIcon={false} />);
    expect(screen.getByText('payments').parentElement?.querySelector('svg')).not.toBeInTheDocument();
  });
});
