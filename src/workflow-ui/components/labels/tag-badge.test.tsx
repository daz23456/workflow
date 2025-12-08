import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { TagBadge } from './tag-badge';

describe('TagBadge', () => {
  it('renders tag text', () => {
    render(<TagBadge tag="orders" />);
    expect(screen.getByText('orders')).toBeInTheDocument();
  });

  it('has correct default styling', () => {
    const { container } = render(<TagBadge tag="orders" />);
    const badge = container.firstChild;
    expect(badge).toHaveClass('bg-blue-50');
  });

  it('applies custom className', () => {
    const { container } = render(<TagBadge tag="orders" className="custom-class" />);
    const badge = container.firstChild;
    expect(badge).toHaveClass('custom-class');
  });

  it('renders removable badge with X button', () => {
    render(<TagBadge tag="orders" onRemove={() => {}} />);
    expect(screen.getByRole('button', { name: /remove/i })).toBeInTheDocument();
  });

  it('calls onRemove when X button clicked', async () => {
    const user = userEvent.setup();
    const onRemove = vi.fn();
    render(<TagBadge tag="orders" onRemove={onRemove} />);

    await user.click(screen.getByRole('button', { name: /remove/i }));
    expect(onRemove).toHaveBeenCalledWith('orders');
  });

  it('is clickable when onClick provided', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<TagBadge tag="orders" onClick={onClick} />);

    await user.click(screen.getByText('orders'));
    expect(onClick).toHaveBeenCalledWith('orders');
  });

  it('renders with tag icon by default', () => {
    render(<TagBadge tag="orders" />);
    // Should have an svg icon
    expect(screen.getByText('orders').parentElement?.querySelector('svg')).toBeInTheDocument();
  });

  it('can hide icon', () => {
    render(<TagBadge tag="orders" showIcon={false} />);
    expect(screen.getByText('orders').parentElement?.querySelector('svg')).not.toBeInTheDocument();
  });
});
