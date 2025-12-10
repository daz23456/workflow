import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Pagination } from './pagination';

describe('Pagination', () => {
  const defaultProps = {
    currentPage: 1,
    totalPages: 10,
    totalItems: 100,
    pageSize: 10,
    onPageChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Item count display', () => {
    it('displays item count info for first page', () => {
      render(<Pagination {...defaultProps} />);

      // Check that start, end, and total are displayed
      expect(screen.getByText(/Showing/)).toBeInTheDocument();
      expect(screen.getByText(/items/)).toBeInTheDocument();
    });

    it('displays item count info for middle page', () => {
      render(<Pagination {...defaultProps} currentPage={5} />);

      expect(screen.getByText(/Showing/)).toBeInTheDocument();
    });

    it('calculates correct end item when on last page with partial results', () => {
      // When on page 10 with 95 total items and pageSize 10,
      // should show 91-95 (not 91-100)
      const { container } = render(<Pagination {...defaultProps} currentPage={10} totalItems={95} />);

      // Check container text includes the expected numbers
      expect(container.textContent).toContain('91');
      expect(container.textContent).toContain('95');
    });

    it('displays "No items" when totalItems is 0', () => {
      render(<Pagination {...defaultProps} totalItems={0} totalPages={0} />);

      expect(screen.getByText('No items')).toBeInTheDocument();
    });
  });

  describe('Navigation buttons', () => {
    it('disables first and previous buttons on first page', () => {
      render(<Pagination {...defaultProps} currentPage={1} />);

      const firstButton = screen.getByLabelText('Go to first page');
      const prevButton = screen.getByLabelText('Go to previous page');

      expect(firstButton).toBeDisabled();
      expect(prevButton).toBeDisabled();
    });

    it('disables next and last buttons on last page', () => {
      render(<Pagination {...defaultProps} currentPage={10} />);

      const nextButton = screen.getByLabelText('Go to next page');
      const lastButton = screen.getByLabelText('Go to last page');

      expect(nextButton).toBeDisabled();
      expect(lastButton).toBeDisabled();
    });

    it('enables all buttons on middle page', () => {
      render(<Pagination {...defaultProps} currentPage={5} />);

      expect(screen.getByLabelText('Go to first page')).not.toBeDisabled();
      expect(screen.getByLabelText('Go to previous page')).not.toBeDisabled();
      expect(screen.getByLabelText('Go to next page')).not.toBeDisabled();
      expect(screen.getByLabelText('Go to last page')).not.toBeDisabled();
    });

    it('calls onPageChange with 1 when first button clicked', () => {
      const onPageChange = vi.fn();
      render(<Pagination {...defaultProps} currentPage={5} onPageChange={onPageChange} />);

      fireEvent.click(screen.getByLabelText('Go to first page'));

      expect(onPageChange).toHaveBeenCalledWith(1);
    });

    it('calls onPageChange with previous page when prev button clicked', () => {
      const onPageChange = vi.fn();
      render(<Pagination {...defaultProps} currentPage={5} onPageChange={onPageChange} />);

      fireEvent.click(screen.getByLabelText('Go to previous page'));

      expect(onPageChange).toHaveBeenCalledWith(4);
    });

    it('calls onPageChange with next page when next button clicked', () => {
      const onPageChange = vi.fn();
      render(<Pagination {...defaultProps} currentPage={5} onPageChange={onPageChange} />);

      fireEvent.click(screen.getByLabelText('Go to next page'));

      expect(onPageChange).toHaveBeenCalledWith(6);
    });

    it('calls onPageChange with totalPages when last button clicked', () => {
      const onPageChange = vi.fn();
      render(<Pagination {...defaultProps} currentPage={5} onPageChange={onPageChange} />);

      fireEvent.click(screen.getByLabelText('Go to last page'));

      expect(onPageChange).toHaveBeenCalledWith(10);
    });
  });

  describe('Page number buttons', () => {
    it('highlights current page', () => {
      render(<Pagination {...defaultProps} currentPage={5} />);

      const currentPageButton = screen.getByRole('button', { name: 'Go to page 5' });
      expect(currentPageButton).toHaveAttribute('aria-current', 'page');
    });

    it('calls onPageChange when page number clicked', () => {
      const onPageChange = vi.fn();
      render(<Pagination {...defaultProps} currentPage={5} onPageChange={onPageChange} />);

      fireEvent.click(screen.getByRole('button', { name: 'Go to page 4' }));

      expect(onPageChange).toHaveBeenCalledWith(4);
    });

    it('shows all pages when total pages is small', () => {
      render(<Pagination {...defaultProps} totalPages={5} currentPage={3} />);

      expect(screen.getByRole('button', { name: 'Go to page 1' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Go to page 2' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Go to page 3' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Go to page 4' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Go to page 5' })).toBeInTheDocument();
    });

    it('shows ellipsis for many pages', () => {
      render(<Pagination {...defaultProps} totalPages={20} currentPage={10} />);

      const ellipses = screen.getAllByText('...');
      expect(ellipses.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Page size selector', () => {
    it('renders page size selector when onPageSizeChange provided', () => {
      const onPageSizeChange = vi.fn();
      render(<Pagination {...defaultProps} onPageSizeChange={onPageSizeChange} />);

      expect(screen.getByLabelText('Per page:')).toBeInTheDocument();
    });

    it('does not render page size selector when onPageSizeChange not provided', () => {
      render(<Pagination {...defaultProps} />);

      expect(screen.queryByLabelText('Per page:')).not.toBeInTheDocument();
    });

    it('calls onPageSizeChange when selection changes', () => {
      const onPageSizeChange = vi.fn();
      render(<Pagination {...defaultProps} onPageSizeChange={onPageSizeChange} />);

      fireEvent.change(screen.getByRole('combobox'), { target: { value: '50' } });

      expect(onPageSizeChange).toHaveBeenCalledWith(50);
    });

    it('renders custom page size options', () => {
      const onPageSizeChange = vi.fn();
      render(
        <Pagination
          {...defaultProps}
          onPageSizeChange={onPageSizeChange}
          pageSizeOptions={[10, 20, 30]}
        />
      );

      const select = screen.getByRole('combobox');
      expect(select).toContainHTML('10');
      expect(select).toContainHTML('20');
      expect(select).toContainHTML('30');
    });
  });

  describe('Loading state', () => {
    it('disables all buttons when loading', () => {
      render(<Pagination {...defaultProps} currentPage={5} isLoading={true} />);

      expect(screen.getByLabelText('Go to first page')).toBeDisabled();
      expect(screen.getByLabelText('Go to previous page')).toBeDisabled();
      expect(screen.getByLabelText('Go to next page')).toBeDisabled();
      expect(screen.getByLabelText('Go to last page')).toBeDisabled();
    });

    it('disables page size selector when loading', () => {
      const onPageSizeChange = vi.fn();
      render(
        <Pagination {...defaultProps} onPageSizeChange={onPageSizeChange} isLoading={true} />
      );

      expect(screen.getByRole('combobox')).toBeDisabled();
    });
  });

  describe('Edge cases', () => {
    it('handles single page correctly', () => {
      render(<Pagination {...defaultProps} totalPages={1} currentPage={1} totalItems={5} />);

      expect(screen.getByLabelText('Go to first page')).toBeDisabled();
      expect(screen.getByLabelText('Go to last page')).toBeDisabled();
    });

    it('handles empty results', () => {
      render(<Pagination {...defaultProps} totalPages={0} currentPage={1} totalItems={0} />);

      expect(screen.getByText('No items')).toBeInTheDocument();
    });
  });
});
