import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TemplateFiltersComponent } from './template-filters';
import { TemplateCategory, TemplateDifficulty, type TemplateFilters } from '@/types/template';

describe('TemplateFiltersComponent', () => {
  const mockOnFiltersChange = vi.fn();
  const defaultFilters: TemplateFilters = {};
  const availableTags = ['http', 'parallel', 'api', 'webhook'];

  beforeEach(() => {
    mockOnFiltersChange.mockClear();
  });

  it('should render filter sections', () => {
    render(
      <TemplateFiltersComponent
        filters={defaultFilters}
        onFiltersChange={mockOnFiltersChange}
        availableTags={availableTags}
      />
    );

    expect(screen.getByText('Filters')).toBeInTheDocument();
    expect(screen.getByLabelText('Search')).toBeInTheDocument();
    expect(screen.getByText('Category')).toBeInTheDocument();
    expect(screen.getByText('Difficulty')).toBeInTheDocument();
    expect(screen.getByText('Tags')).toBeInTheDocument();
  });

  it('should call onFiltersChange when search input changes', () => {
    render(
      <TemplateFiltersComponent
        filters={defaultFilters}
        onFiltersChange={mockOnFiltersChange}
        availableTags={availableTags}
      />
    );

    const searchInput = screen.getByPlaceholderText('Search templates...');
    fireEvent.change(searchInput, { target: { value: 'slack' } });

    expect(mockOnFiltersChange).toHaveBeenCalledWith({ search: 'slack' });
  });

  it('should clear search when input is empty', () => {
    const filtersWithSearch: TemplateFilters = { search: 'test' };
    render(
      <TemplateFiltersComponent
        filters={filtersWithSearch}
        onFiltersChange={mockOnFiltersChange}
        availableTags={availableTags}
      />
    );

    const searchInput = screen.getByPlaceholderText('Search templates...');
    fireEvent.change(searchInput, { target: { value: '' } });

    expect(mockOnFiltersChange).toHaveBeenCalledWith({
      search: undefined,
    });
  });

  it('should render all category buttons', () => {
    render(
      <TemplateFiltersComponent
        filters={defaultFilters}
        onFiltersChange={mockOnFiltersChange}
        availableTags={availableTags}
      />
    );

    expect(screen.getByText('API Composition')).toBeInTheDocument();
    expect(screen.getByText('Data Processing')).toBeInTheDocument();
    expect(screen.getByText('Real-Time')).toBeInTheDocument();
    expect(screen.getByText('Integrations')).toBeInTheDocument();
  });

  it('should call onFiltersChange when category is selected', () => {
    render(
      <TemplateFiltersComponent
        filters={defaultFilters}
        onFiltersChange={mockOnFiltersChange}
        availableTags={availableTags}
      />
    );

    const apiCompositionButton = screen.getByText('API Composition');
    fireEvent.click(apiCompositionButton);

    expect(mockOnFiltersChange).toHaveBeenCalledWith({
      category: TemplateCategory.ApiComposition,
    });
  });

  it('should deselect category when clicked again', () => {
    const filtersWithCategory: TemplateFilters = {
      category: TemplateCategory.ApiComposition,
    };
    render(
      <TemplateFiltersComponent
        filters={filtersWithCategory}
        onFiltersChange={mockOnFiltersChange}
        availableTags={availableTags}
      />
    );

    const apiCompositionButton = screen.getByText('API Composition');
    fireEvent.click(apiCompositionButton);

    expect(mockOnFiltersChange).toHaveBeenCalledWith({
      category: undefined,
    });
  });

  it('should render all difficulty buttons', () => {
    render(
      <TemplateFiltersComponent
        filters={defaultFilters}
        onFiltersChange={mockOnFiltersChange}
        availableTags={availableTags}
      />
    );

    expect(screen.getByText('Beginner')).toBeInTheDocument();
    expect(screen.getByText('Intermediate')).toBeInTheDocument();
    expect(screen.getByText('Advanced')).toBeInTheDocument();
  });

  it('should call onFiltersChange when difficulty is selected', () => {
    render(
      <TemplateFiltersComponent
        filters={defaultFilters}
        onFiltersChange={mockOnFiltersChange}
        availableTags={availableTags}
      />
    );

    const beginnerButton = screen.getByText('Beginner');
    fireEvent.click(beginnerButton);

    expect(mockOnFiltersChange).toHaveBeenCalledWith({
      difficulty: TemplateDifficulty.Beginner,
    });
  });

  it('should render available tags', () => {
    render(
      <TemplateFiltersComponent
        filters={defaultFilters}
        onFiltersChange={mockOnFiltersChange}
        availableTags={availableTags}
      />
    );

    expect(screen.getByText('http')).toBeInTheDocument();
    expect(screen.getByText('parallel')).toBeInTheDocument();
    expect(screen.getByText('api')).toBeInTheDocument();
    expect(screen.getByText('webhook')).toBeInTheDocument();
  });

  it('should toggle tag when clicked', () => {
    render(
      <TemplateFiltersComponent
        filters={defaultFilters}
        onFiltersChange={mockOnFiltersChange}
        availableTags={availableTags}
      />
    );

    const httpTag = screen.getByText('http');
    fireEvent.click(httpTag);

    expect(mockOnFiltersChange).toHaveBeenCalledWith({
      tags: ['http'],
    });
  });

  it('should remove tag when clicked again', () => {
    const filtersWithTags: TemplateFilters = { tags: ['http', 'parallel'] };
    render(
      <TemplateFiltersComponent
        filters={filtersWithTags}
        onFiltersChange={mockOnFiltersChange}
        availableTags={availableTags}
      />
    );

    const httpTag = screen.getByText('http');
    fireEvent.click(httpTag);

    expect(mockOnFiltersChange).toHaveBeenCalledWith({
      tags: ['parallel'], // http removed
    });
  });

  it('should call onFiltersChange when max setup time changes', () => {
    render(
      <TemplateFiltersComponent
        filters={defaultFilters}
        onFiltersChange={mockOnFiltersChange}
        availableTags={availableTags}
      />
    );

    const timeSlider = screen.getByLabelText(/Max Setup Time/i);
    fireEvent.change(timeSlider, { target: { value: '30' } });

    expect(mockOnFiltersChange).toHaveBeenCalledWith({
      maxEstimatedTime: 30,
    });
  });

  it('should clear maxEstimatedTime when slider is at max (60)', () => {
    const filtersWithTime: TemplateFilters = { maxEstimatedTime: 30 };
    render(
      <TemplateFiltersComponent
        filters={filtersWithTime}
        onFiltersChange={mockOnFiltersChange}
        availableTags={availableTags}
      />
    );

    const timeSlider = screen.getByLabelText(/Max Setup Time/i);
    fireEvent.change(timeSlider, { target: { value: '60' } });

    expect(mockOnFiltersChange).toHaveBeenCalledWith({
      maxEstimatedTime: undefined,
    });
  });

  it('should call onFiltersChange when parallel-only checkbox is toggled', () => {
    render(
      <TemplateFiltersComponent
        filters={defaultFilters}
        onFiltersChange={mockOnFiltersChange}
        availableTags={availableTags}
      />
    );

    const parallelCheckbox = screen.getByLabelText(
      /Show only workflows with parallel execution/i
    );
    fireEvent.click(parallelCheckbox);

    expect(mockOnFiltersChange).toHaveBeenCalledWith({
      parallelOnly: true,
    });
  });

  it('should show Clear All button when filters are active', () => {
    const activeFilters: TemplateFilters = {
      category: TemplateCategory.ApiComposition,
    };
    render(
      <TemplateFiltersComponent
        filters={activeFilters}
        onFiltersChange={mockOnFiltersChange}
        availableTags={availableTags}
      />
    );

    expect(screen.getByText('Clear All')).toBeInTheDocument();
  });

  it('should not show Clear All button when no filters are active', () => {
    render(
      <TemplateFiltersComponent
        filters={defaultFilters}
        onFiltersChange={mockOnFiltersChange}
        availableTags={availableTags}
      />
    );

    expect(screen.queryByText('Clear All')).not.toBeInTheDocument();
  });

  it('should clear all filters when Clear All is clicked', () => {
    const activeFilters: TemplateFilters = {
      category: TemplateCategory.ApiComposition,
      difficulty: TemplateDifficulty.Beginner,
      search: 'test',
      tags: ['http'],
      maxEstimatedTime: 30,
      parallelOnly: true,
    };
    render(
      <TemplateFiltersComponent
        filters={activeFilters}
        onFiltersChange={mockOnFiltersChange}
        availableTags={availableTags}
      />
    );

    const clearAllButton = screen.getByText('Clear All');
    fireEvent.click(clearAllButton);

    expect(mockOnFiltersChange).toHaveBeenCalledWith({});
  });

  it('should not render tags section when availableTags is empty', () => {
    render(
      <TemplateFiltersComponent
        filters={defaultFilters}
        onFiltersChange={mockOnFiltersChange}
        availableTags={[]}
      />
    );

    expect(screen.queryByText('Tags')).not.toBeInTheDocument();
  });
});
