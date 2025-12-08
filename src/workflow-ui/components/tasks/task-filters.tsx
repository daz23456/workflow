'use client';

import { useState, useEffect, RefObject } from 'react';
import { useDebounce } from '@/lib/utils';
import { LabelFilter } from '@/components/labels';

export interface TaskFiltersState {
  search: string;
  namespace: string | undefined;
  sort: string;
  tags: string[];
  category: string | undefined;
}

interface TaskFiltersProps {
  namespaces: string[];
  availableTags?: string[];
  availableCategories?: string[];
  onFilterChange: (filters: TaskFiltersState) => void;
  defaultValues?: {
    search?: string;
    namespace?: string;
    sort?: string;
    tags?: string[];
    category?: string;
  };
  isLoading?: boolean;
  searchInputRef?: RefObject<HTMLInputElement | null>;
  showLabelFilters?: boolean;
}

export function TaskFilters({
  namespaces,
  availableTags = [],
  availableCategories = [],
  onFilterChange,
  defaultValues,
  isLoading = false,
  searchInputRef,
  showLabelFilters = true,
}: TaskFiltersProps) {
  const [search, setSearch] = useState(defaultValues?.search || '');
  const [namespace, setNamespace] = useState(defaultValues?.namespace || '');
  const [sort, setSort] = useState(defaultValues?.sort || 'name');
  const [tags, setTags] = useState<string[]>(defaultValues?.tags || []);
  const [selectedCategories, setSelectedCategories] = useState<string[]>(
    defaultValues?.category ? [defaultValues.category] : []
  );

  const debouncedSearch = useDebounce(search, 300);

  // Sync with parent when defaultValues change (e.g., keyboard shortcut clear)
  useEffect(() => {
    if (defaultValues) {
      const newSearch = defaultValues.search || '';
      const newNamespace = defaultValues.namespace || '';
      const newSort = defaultValues.sort || 'name';
      const newTags = defaultValues.tags || [];
      const newCategory = defaultValues.category;

      if (newSearch !== search) {
        setSearch(newSearch);
      }
      if (newNamespace !== namespace) {
        setNamespace(newNamespace);
      }
      if (newSort !== sort) {
        setSort(newSort);
      }
      if (JSON.stringify(newTags) !== JSON.stringify(tags)) {
        setTags(newTags);
      }
      const newSelectedCategories = newCategory ? [newCategory] : [];
      if (JSON.stringify(newSelectedCategories) !== JSON.stringify(selectedCategories)) {
        setSelectedCategories(newSelectedCategories);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultValues]);

  // Notify parent of filter changes
  useEffect(() => {
    onFilterChange({
      search: debouncedSearch,
      namespace: namespace || undefined,
      sort,
      tags,
      category: selectedCategories[0] || undefined,
    });
  }, [debouncedSearch, namespace, sort, tags, selectedCategories, onFilterChange]);

  const hasLabels = availableTags.length > 0 || availableCategories.length > 0;

  return (
    <div className="mb-6 space-y-4">
      {/* Main filters row */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
        {/* Search Input */}
        <div className="flex-1">
          <label htmlFor="search" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Search
          </label>
          <input
            ref={searchInputRef}
            id="search"
            type="search"
            placeholder="Search tasks..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            disabled={isLoading}
            className="block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm shadow-sm transition-all duration-150 ease-in-out focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-gray-50 dark:disabled:bg-gray-900 disabled:text-gray-500 dark:text-gray-100"
          />
        </div>

        {/* Namespace Select */}
        <div className="w-full sm:w-48">
          <label htmlFor="namespace" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Namespace
          </label>
          <select
            id="namespace"
            value={namespace}
            onChange={(e) => setNamespace(e.target.value)}
            disabled={isLoading}
            className="block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm shadow-sm transition-all duration-150 ease-in-out focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-gray-50 dark:disabled:bg-gray-900 disabled:text-gray-500 dark:text-gray-100"
          >
            <option value="">All namespaces</option>
            {namespaces.map((ns) => (
              <option key={ns} value={ns}>
                {ns}
              </option>
            ))}
          </select>
        </div>

        {/* Sort Select */}
        <div className="w-full sm:w-48">
          <label htmlFor="sort" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Sort by
          </label>
          <select
            id="sort"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            disabled={isLoading}
            className="block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm shadow-sm transition-all duration-150 ease-in-out focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-gray-50 dark:disabled:bg-gray-900 disabled:text-gray-500 dark:text-gray-100"
          >
            <option value="name">Name ↑ A-Z</option>
            <option value="success-rate">Success Rate ↓ High-Low</option>
            <option value="executions">Total Executions ↓ High-Low</option>
            <option value="usage">Usage ↓ Most Used</option>
          </select>
        </div>
      </div>

      {/* Label filters */}
      {showLabelFilters && hasLabels && (
        <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
          <LabelFilter
            availableTags={availableTags}
            availableCategories={availableCategories}
            selectedTags={tags}
            selectedCategories={selectedCategories}
            onTagsChange={setTags}
            onCategoriesChange={setSelectedCategories}
            isLoading={isLoading}
            collapsible
            defaultCollapsed
          />
        </div>
      )}
    </div>
  );
}
