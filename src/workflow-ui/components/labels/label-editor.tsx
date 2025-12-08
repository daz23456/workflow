'use client';

import { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { TagBadge } from './tag-badge';
import { CategoryBadge } from './category-badge';
import { X, Plus, Loader2 } from 'lucide-react';

interface LabelEditorProps {
  isOpen: boolean;
  onClose: () => void;
  entityType: 'workflow' | 'task';
  entityName: string;
  currentTags: string[];
  currentCategories: string[];
  availableTags: string[];
  availableCategories: string[];
  onSave: (labels: { tags: string[]; categories: string[] }) => Promise<void>;
}

export function LabelEditor({
  isOpen,
  onClose,
  entityType,
  entityName,
  currentTags,
  currentCategories,
  availableTags,
  availableCategories,
  onSave,
}: LabelEditorProps) {
  const [selectedTags, setSelectedTags] = useState<string[]>(currentTags);
  const [selectedCategories, setSelectedCategories] = useState<string[]>(currentCategories);
  const [newTagInput, setNewTagInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleAddTag = useCallback((tag: string) => {
    const trimmed = tag.trim().toLowerCase();
    if (trimmed && !selectedTags.includes(trimmed)) {
      setSelectedTags((prev) => [...prev, trimmed]);
    }
  }, [selectedTags]);

  const handleRemoveTag = useCallback((tag: string) => {
    setSelectedTags((prev) => prev.filter((t) => t !== tag));
  }, []);

  const handleAddCategory = useCallback((category: string) => {
    if (!selectedCategories.includes(category)) {
      setSelectedCategories((prev) => [...prev, category]);
    }
  }, [selectedCategories]);

  const handleRemoveCategory = useCallback((category: string) => {
    setSelectedCategories((prev) => prev.filter((c) => c !== category));
  }, []);

  const handleNewTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag(newTagInput);
      setNewTagInput('');
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave({ tags: selectedTags, categories: selectedCategories });
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) {
    return null;
  }

  // Available tags that aren't already selected
  const unselectedTags = availableTags.filter((tag) => !selectedTags.includes(tag));
  const unselectedCategories = availableCategories.filter((cat) => !selectedCategories.includes(cat));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-lg rounded-lg bg-white dark:bg-gray-800 shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Edit Labels
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {entityType === 'workflow' ? 'Workflow' : 'Task'}: <span className="font-medium">{entityName}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-4 space-y-6 max-h-[60vh] overflow-y-auto">
          {/* Tags Section */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Tags</h3>

            {/* Selected Tags */}
            <div className="mb-3">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Selected</p>
              <div className="flex flex-wrap gap-2 min-h-[32px]" data-testid="selected-tags">
                {selectedTags.length === 0 ? (
                  <span className="text-xs text-gray-400 italic">No tags selected</span>
                ) : (
                  selectedTags.map((tag) => (
                    <TagBadge
                      key={tag}
                      tag={tag}
                      onRemove={handleRemoveTag}
                      data-tag={tag}
                    />
                  ))
                )}
              </div>
            </div>

            {/* Add New Tag */}
            <div className="mb-3">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newTagInput}
                  onChange={(e) => setNewTagInput(e.target.value)}
                  onKeyDown={handleNewTagKeyDown}
                  placeholder="Add new tag..."
                  className="flex-1 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={() => {
                    handleAddTag(newTagInput);
                    setNewTagInput('');
                  }}
                  disabled={!newTagInput.trim()}
                  className="rounded-md bg-blue-50 dark:bg-blue-900/30 px-3 py-1.5 text-sm font-medium text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Available Tags */}
            {unselectedTags.length > 0 && (
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Available</p>
                <div className="flex flex-wrap gap-2">
                  {unselectedTags.map((tag) => (
                    <TagBadge
                      key={tag}
                      tag={tag}
                      onClick={handleAddTag}
                      className="opacity-60 hover:opacity-100"
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Categories Section */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Categories</h3>

            {/* Selected Categories */}
            <div className="mb-3">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Selected</p>
              <div className="flex flex-wrap gap-2 min-h-[32px]" data-testid="selected-categories">
                {selectedCategories.length === 0 ? (
                  <span className="text-xs text-gray-400 italic">No categories selected</span>
                ) : (
                  selectedCategories.map((category) => (
                    <CategoryBadge
                      key={category}
                      category={category}
                      onRemove={handleRemoveCategory}
                    />
                  ))
                )}
              </div>
            </div>

            {/* Available Categories */}
            {unselectedCategories.length > 0 && (
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Available</p>
                <div className="flex flex-wrap gap-2">
                  {unselectedCategories.map((category) => (
                    <CategoryBadge
                      key={category}
                      category={category}
                      onClick={handleAddCategory}
                      className="opacity-60 hover:opacity-100"
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-gray-200 dark:border-gray-700 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
