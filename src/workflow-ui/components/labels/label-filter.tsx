'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { TagBadge } from './tag-badge';
import { CategoryBadge } from './category-badge';
import { ChevronDown, ChevronRight, X } from 'lucide-react';

interface LabelFilterProps {
  availableTags: string[];
  availableCategories: string[];
  selectedTags: string[];
  selectedCategories: string[];
  onTagsChange: (tags: string[]) => void;
  onCategoriesChange: (categories: string[]) => void;
  isLoading?: boolean;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
  className?: string;
}

export function LabelFilter({
  availableTags,
  availableCategories,
  selectedTags,
  selectedCategories,
  onTagsChange,
  onCategoriesChange,
  isLoading = false,
  collapsible = false,
  defaultCollapsed = false,
  className,
}: LabelFilterProps) {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);

  const hasActiveFilters = selectedTags.length > 0 || selectedCategories.length > 0;
  const activeFilterCount = selectedTags.length + selectedCategories.length;

  const handleTagClick = (tag: string) => {
    if (selectedTags.includes(tag)) {
      onTagsChange(selectedTags.filter((t) => t !== tag));
    } else {
      onTagsChange([...selectedTags, tag]);
    }
  };

  const handleCategoryClick = (category: string) => {
    if (selectedCategories.includes(category)) {
      onCategoriesChange(selectedCategories.filter((c) => c !== category));
    } else {
      onCategoriesChange([...selectedCategories, category]);
    }
  };

  const handleClear = () => {
    onTagsChange([]);
    onCategoriesChange([]);
  };

  const toggleCollapsed = () => {
    setIsCollapsed(!isCollapsed);
  };

  if (isLoading) {
    return (
      <div className={cn('space-y-3', className)}>
        <div className="h-4 w-16 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
        <div className="flex flex-wrap gap-2">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-6 w-16 animate-pulse rounded-full bg-gray-200 dark:bg-gray-700"
            />
          ))}
        </div>
      </div>
    );
  }

  const header = (
    <div className="flex items-center justify-between">
      {collapsible ? (
        <button
          type="button"
          onClick={toggleCollapsed}
          className="flex items-center gap-1 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100"
          aria-label="Labels"
          aria-expanded={!isCollapsed}
        >
          {isCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
          <span>Labels</span>
          {isCollapsed && activeFilterCount > 0 && (
            <span className="ml-1 rounded-full bg-blue-100 dark:bg-blue-900 px-1.5 py-0.5 text-xs font-medium text-blue-700 dark:text-blue-300">
              {activeFilterCount}
            </span>
          )}
        </button>
      ) : (
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Labels</span>
      )}
      {hasActiveFilters && !isCollapsed && (
        <button
          type="button"
          onClick={handleClear}
          className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          aria-label="Clear filters"
        >
          <X className="h-3 w-3" />
          Clear
        </button>
      )}
    </div>
  );

  const content = (
    <div className={cn('space-y-4', isCollapsed && 'hidden')}>
      {/* Tags Section */}
      <div>
        <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Tags</h4>
        {availableTags.length === 0 ? (
          <p className="text-xs text-gray-400 dark:text-gray-500 italic">No tags available</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {availableTags.map((tag) => {
              const isSelected = selectedTags.includes(tag);
              return (
                <TagBadge
                  key={tag}
                  tag={tag}
                  onClick={handleTagClick}
                  data-selected={isSelected}
                  className={cn(
                    isSelected && 'ring-2 ring-blue-400 dark:ring-blue-500'
                  )}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* Categories Section */}
      <div>
        <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Categories</h4>
        {availableCategories.length === 0 ? (
          <p className="text-xs text-gray-400 dark:text-gray-500 italic">No categories available</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {availableCategories.map((category) => {
              const isSelected = selectedCategories.includes(category);
              return (
                <CategoryBadge
                  key={category}
                  category={category}
                  onClick={handleCategoryClick}
                  data-selected={isSelected}
                  className={cn(
                    isSelected && 'ring-2 ring-purple-400 dark:ring-purple-500'
                  )}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className={cn('space-y-3', className)}>
      {header}
      {content}
    </div>
  );
}
