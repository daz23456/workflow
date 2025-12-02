import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TimeRangeSelector } from './time-range-selector';

describe('TimeRangeSelector', () => {
  it('should render all time range options', () => {
    const onChange = vi.fn();
    render(<TimeRangeSelector value="24h" onChange={onChange} />);

    expect(screen.getByRole('tab', { name: '1h' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: '24h' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: '7d' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: '30d' })).toBeInTheDocument();
  });

  it('should highlight the selected option', () => {
    const onChange = vi.fn();
    render(<TimeRangeSelector value="7d" onChange={onChange} />);

    const selectedTab = screen.getByRole('tab', { name: '7d' });
    expect(selectedTab).toHaveAttribute('aria-selected', 'true');
  });

  it('should call onChange when clicking a different option', () => {
    const onChange = vi.fn();
    render(<TimeRangeSelector value="24h" onChange={onChange} />);

    fireEvent.click(screen.getByRole('tab', { name: '7d' }));
    expect(onChange).toHaveBeenCalledWith('7d');
  });

  it('should have accessible tablist role', () => {
    const onChange = vi.fn();
    render(<TimeRangeSelector value="24h" onChange={onChange} />);

    expect(screen.getByRole('tablist', { name: 'Time range selector' })).toBeInTheDocument();
  });

  it('should set aria-selected correctly for unselected tabs', () => {
    const onChange = vi.fn();
    render(<TimeRangeSelector value="24h" onChange={onChange} />);

    const unselectedTab = screen.getByRole('tab', { name: '1h' });
    expect(unselectedTab).toHaveAttribute('aria-selected', 'false');
  });
});
