'use client';

import { Search, X } from 'lucide-react';
import {
  TemplateCategory,
  TemplateDifficulty,
  TemplateCategoryInfo,
  TemplateDifficultyInfo,
  type TemplateFilters,
} from '@/types/template';

interface TemplateFiltersProps {
  filters: TemplateFilters;
  onFiltersChange: (filters: TemplateFilters) => void;
  availableTags?: string[];
}

export function TemplateFiltersComponent({
  filters,
  onFiltersChange,
  availableTags = [],
}: TemplateFiltersProps) {
  const updateFilters = (updates: Partial<TemplateFilters>) => {
    onFiltersChange({ ...filters, ...updates });
  };

  const clearFilters = () => {
    onFiltersChange({});
  };

  const hasActiveFilters =
    filters.category ||
    filters.difficulty ||
    filters.search ||
    (filters.tags && filters.tags.length > 0) ||
    filters.maxEstimatedTime ||
    filters.parallelOnly;

  const toggleTag = (tag: string) => {
    const currentTags = filters.tags || [];
    const newTags = currentTags.includes(tag)
      ? currentTags.filter((t) => t !== tag)
      : [...currentTags, tag];
    updateFilters({ tags: newTags.length > 0 ? newTags : undefined });
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Filters</h2>
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
          >
            <X className="w-4 h-4" />
            Clear All
          </button>
        )}
      </div>

      <div className="space-y-4">
        {/* Search */}
        <div>
          <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-2">
            Search
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              id="search"
              placeholder="Search templates..."
              value={filters.search || ''}
              onChange={(e) => updateFilters({ search: e.target.value || undefined })}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Category */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
          <div className="grid grid-cols-2 gap-2">
            {Object.values(TemplateCategory).map((category) => {
              const info = TemplateCategoryInfo[category];
              const isActive = filters.category === category;
              return (
                <button
                  key={category}
                  onClick={() =>
                    updateFilters({ category: isActive ? undefined : category })
                  }
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                    isActive
                      ? `bg-${info.color}-100 text-${info.color}-700 border-2 border-${info.color}-500`
                      : 'bg-gray-50 text-gray-700 border-2 border-transparent hover:bg-gray-100'
                  }`}
                >
                  <span>{info.icon}</span>
                  <span>{info.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Difficulty */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Difficulty</label>
          <div className="grid grid-cols-3 gap-2">
            {Object.values(TemplateDifficulty).map((difficulty) => {
              const info = TemplateDifficultyInfo[difficulty];
              const isActive = filters.difficulty === difficulty;
              return (
                <button
                  key={difficulty}
                  onClick={() =>
                    updateFilters({ difficulty: isActive ? undefined : difficulty })
                  }
                  className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors flex items-center gap-1 justify-center ${
                    isActive
                      ? `bg-${info.color}-100 text-${info.color}-700 border-2 border-${info.color}-500`
                      : 'bg-gray-50 text-gray-700 border-2 border-transparent hover:bg-gray-100'
                  }`}
                >
                  <span>{info.icon}</span>
                  <span>{info.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Tags */}
        {availableTags.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Tags</label>
            <div className="flex flex-wrap gap-2">
              {availableTags.map((tag) => {
                const isActive = filters.tags?.includes(tag);
                return (
                  <button
                    key={tag}
                    onClick={() => toggleTag(tag)}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                      isActive
                        ? 'bg-blue-100 text-blue-700 border border-blue-500'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Setup Time */}
        <div>
          <label htmlFor="maxTime" className="block text-sm font-medium text-gray-700 mb-2">
            Max Setup Time: {filters.maxEstimatedTime ? `${filters.maxEstimatedTime} min` : 'Any'}
          </label>
          <input
            type="range"
            id="maxTime"
            min="5"
            max="60"
            step="5"
            value={filters.maxEstimatedTime || 60}
            onChange={(e) =>
              updateFilters({
                maxEstimatedTime: e.target.value === '60' ? undefined : Number(e.target.value),
              })
            }
            className="w-full"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>5 min</span>
            <span>60 min</span>
          </div>
        </div>

        {/* Parallel Only */}
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="parallelOnly"
            checked={filters.parallelOnly || false}
            onChange={(e) => updateFilters({ parallelOnly: e.target.checked || undefined })}
            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
          <label htmlFor="parallelOnly" className="text-sm text-gray-700">
            Show only workflows with parallel execution
          </label>
        </div>
      </div>
    </div>
  );
}
