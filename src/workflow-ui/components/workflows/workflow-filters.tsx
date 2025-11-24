import { useState, useEffect, RefObject } from 'react';
import { useDebounce } from '@/lib/utils';

interface WorkflowFiltersProps {
  namespaces: string[];
  onFilterChange: (filters: {
    search: string;
    namespace: string | undefined;
    sort: string;
  }) => void;
  defaultValues?: {
    search?: string;
    namespace?: string;
    sort?: string;
  };
  isLoading?: boolean;
  filters?: {
    search: string;
    namespace: string | undefined;
    sort: string;
  };
  onClearFilters?: () => void;
  searchInputRef?: RefObject<HTMLInputElement | null>;
}

export function WorkflowFilters({
  namespaces,
  onFilterChange,
  defaultValues,
  isLoading = false,
  filters,
  searchInputRef,
}: WorkflowFiltersProps) {
  const [search, setSearch] = useState(defaultValues?.search || '');
  const [namespace, setNamespace] = useState(defaultValues?.namespace || '');
  const [sort, setSort] = useState(defaultValues?.sort || 'name');

  const debouncedSearch = useDebounce(search, 300);

  // Sync with parent when defaultValues change (e.g., keyboard shortcut clear)
  useEffect(() => {
    if (defaultValues) {
      const newSearch = defaultValues.search || '';
      const newNamespace = defaultValues.namespace || '';
      const newSort = defaultValues.sort || 'name';

      if (newSearch !== search) {
        setSearch(newSearch);
      }
      if (newNamespace !== namespace) {
        setNamespace(newNamespace);
      }
      if (newSort !== sort) {
        setSort(newSort);
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
    });
  }, [debouncedSearch, namespace, sort, onFilterChange]);

  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end">
      {/* Search Input */}
      <div className="flex-1">
        <label htmlFor="search" className="mb-1 block text-sm font-medium text-gray-700">
          Search
        </label>
        <input
          ref={searchInputRef}
          id="search"
          type="search"
          placeholder="Search workflows..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          disabled={isLoading}
          className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm transition-all duration-150 ease-in-out focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500"
        />
      </div>

      {/* Namespace Select */}
      <div className="w-full sm:w-48">
        <label htmlFor="namespace" className="mb-1 block text-sm font-medium text-gray-700">
          Namespace
        </label>
        <select
          id="namespace"
          value={namespace}
          onChange={(e) => setNamespace(e.target.value)}
          disabled={isLoading}
          className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm transition-all duration-150 ease-in-out focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500"
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
        <label htmlFor="sort" className="mb-1 block text-sm font-medium text-gray-700">
          Sort by
        </label>
        <select
          id="sort"
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          disabled={isLoading}
          className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm transition-all duration-150 ease-in-out focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500"
        >
          <option value="name">Name ↑ A-Z</option>
          <option value="success-rate">Success Rate ↓ High-Low</option>
          <option value="executions">Total Executions ↓ High-Low</option>
        </select>
      </div>
    </div>
  );
}
