'use client';

import { useState, useCallback, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { TagBadge } from './tag-badge';
import { CategoryBadge } from './category-badge';
import { X, Loader2, Trash2 } from 'lucide-react';

interface SelectedEntity {
  name: string;
  tags: string[];
  categories: string[];
}

interface BulkLabelChanges {
  addTags: string[];
  removeTags: string[];
  setCategories: string[] | null;
  clearCategories: boolean;
}

interface BulkLabelEditorProps {
  isOpen: boolean;
  onClose: () => void;
  entityType: 'workflow' | 'task';
  selectedEntities: SelectedEntity[];
  availableTags: string[];
  availableCategories: string[];
  onSave: (changes: BulkLabelChanges) => Promise<void>;
}

export function BulkLabelEditor({
  isOpen,
  onClose,
  entityType,
  selectedEntities,
  availableTags,
  availableCategories,
  onSave,
}: BulkLabelEditorProps) {
  const [tagsToAdd, setTagsToAdd] = useState<string[]>([]);
  const [tagsToRemove, setTagsToRemove] = useState<string[]>([]);
  const [categoriesToSet, setCategoriesToSet] = useState<string[] | null>(null);
  const [clearCategories, setClearCategories] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Get all unique tags from selected entities
  const existingTags = useMemo(() => {
    const tags = new Set<string>();
    selectedEntities.forEach((entity) => {
      entity.tags.forEach((tag) => tags.add(tag));
    });
    return Array.from(tags);
  }, [selectedEntities]);

  const handleToggleAddTag = useCallback((tag: string) => {
    if (tagsToRemove.includes(tag)) return; // Can't add if removing
    setTagsToAdd((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  }, [tagsToRemove]);

  const handleToggleRemoveTag = useCallback((tag: string) => {
    setTagsToRemove((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
    // Remove from add list if it was there
    setTagsToAdd((prev) => prev.filter((t) => t !== tag));
  }, []);

  const handleToggleCategory = useCallback((category: string) => {
    setClearCategories(false);
    setCategoriesToSet((prev) => {
      if (prev === null) return [category];
      if (prev.includes(category)) {
        const newList = prev.filter((c) => c !== category);
        return newList.length > 0 ? newList : null;
      }
      return [...prev, category];
    });
  }, []);

  const handleClearCategories = useCallback(() => {
    setClearCategories(true);
    setCategoriesToSet(null);
  }, []);

  const hasChanges = tagsToAdd.length > 0 || tagsToRemove.length > 0 || categoriesToSet !== null || clearCategories;

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave({
        addTags: tagsToAdd,
        removeTags: tagsToRemove,
        setCategories: categoriesToSet,
        clearCategories,
      });
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) {
    return null;
  }

  const entityLabel = entityType === 'workflow' ? 'workflows' : 'tasks';

  return (
    <div className="absolute z-50 mt-2 w-80 rounded-lg bg-white dark:bg-gray-800 shadow-xl border border-gray-200 dark:border-gray-700">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 px-4 py-3">
        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            Bulk Edit Labels
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {selectedEntities.length} {entityLabel} selected
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Content */}
      <div className="px-4 py-3 space-y-4 max-h-80 overflow-y-auto">
        {/* Add Tags Section */}
        <div data-testid="add-tags-section">
          <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">Add Tags</p>
          <div className="flex flex-wrap gap-1.5">
            {availableTags.map((tag) => {
              const isSelected = tagsToAdd.includes(tag);
              const isDisabled = tagsToRemove.includes(tag);
              return (
                <TagBadge
                  key={tag}
                  tag={tag}
                  onClick={isDisabled ? undefined : () => handleToggleAddTag(tag)}
                  data-tag={tag}
                  data-selected={isSelected}
                  data-disabled={isDisabled}
                  className={cn(
                    'cursor-pointer transition-opacity',
                    isSelected && 'ring-2 ring-blue-500',
                    isDisabled && 'opacity-30 cursor-not-allowed'
                  )}
                />
              );
            })}
          </div>
        </div>

        {/* Remove Tags Section */}
        <div data-testid="remove-tags-section">
          <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">Remove Tags</p>
          <div className="flex flex-wrap gap-1.5">
            {existingTags.length === 0 ? (
              <span className="text-xs text-gray-400 italic">No tags to remove</span>
            ) : (
              existingTags.map((tag) => {
                const isSelected = tagsToRemove.includes(tag);
                return (
                  <TagBadge
                    key={tag}
                    tag={tag}
                    onClick={() => handleToggleRemoveTag(tag)}
                    data-tag={tag}
                    data-selected={isSelected}
                    className={cn(
                      'cursor-pointer transition-opacity',
                      isSelected && 'ring-2 ring-red-500 line-through'
                    )}
                  />
                );
              })
            )}
          </div>
        </div>

        {/* Categories Section */}
        <div data-testid="categories-section">
          <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">Categories</p>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {availableCategories.map((category) => {
              const isSelected = categoriesToSet?.includes(category) ?? false;
              return (
                <CategoryBadge
                  key={category}
                  category={category}
                  onClick={() => handleToggleCategory(category)}
                  data-category={category}
                  data-selected={isSelected}
                  className={cn(
                    'cursor-pointer transition-opacity',
                    isSelected && 'ring-2 ring-blue-500'
                  )}
                />
              );
            })}
          </div>
          <button
            type="button"
            onClick={handleClearCategories}
            className={cn(
              'flex items-center gap-1 text-xs px-2 py-1 rounded border',
              clearCategories
                ? 'border-red-300 bg-red-50 text-red-700 dark:border-red-700 dark:bg-red-900/30 dark:text-red-300'
                : 'border-gray-300 text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-700'
            )}
          >
            <Trash2 className="h-3 w-3" />
            Clear Categories
          </button>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-end gap-2 border-t border-gray-200 dark:border-gray-700 px-4 py-3">
        <button
          type="button"
          onClick={onClose}
          disabled={isSaving}
          className="rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving || !hasChanges}
          className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1.5"
        >
          {isSaving ? (
            <>
              <Loader2 className="h-3 w-3 animate-spin" />
              Applying...
            </>
          ) : (
            'Apply'
          )}
        </button>
      </div>
    </div>
  );
}
