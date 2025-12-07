/**
 * SubWorkflowBreadcrumb - Navigation breadcrumb for nested workflow views
 *
 * Features:
 * - Shows current path through nested sub-workflows
 * - Click to navigate back to parent levels
 * - Truncation for deep nesting with ellipsis
 * - Accessible navigation landmark
 */

'use client';

import { ChevronRight, MoreHorizontal, Layers } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BreadcrumbItem {
  name: string;
  label: string;
}

interface SubWorkflowBreadcrumbProps {
  path: BreadcrumbItem[];
  onNavigate: (index: number) => void;
  maxVisible?: number;
}

export function SubWorkflowBreadcrumb({
  path,
  onNavigate,
  maxVisible = 4,
}: SubWorkflowBreadcrumbProps) {
  if (path.length === 0) {
    return null;
  }

  // Determine which items to show
  const shouldTruncate = path.length > maxVisible;
  let visibleItems: Array<{ item: BreadcrumbItem; originalIndex: number }>;

  if (shouldTruncate) {
    // Show first item, ellipsis, and last (maxVisible - 1) items
    const lastItemsCount = maxVisible - 1;
    const lastItems = path.slice(-lastItemsCount);

    visibleItems = [
      { item: path[0], originalIndex: 0 },
      // Ellipsis will be rendered separately
      ...lastItems.map((item, i) => ({
        item,
        originalIndex: path.length - lastItemsCount + i,
      })),
    ];
  } else {
    visibleItems = path.map((item, index) => ({ item, originalIndex: index }));
  }

  return (
    <nav role="navigation" aria-label="Workflow breadcrumb" className="flex items-center">
      <ol className="flex items-center gap-1" role="list">
        {visibleItems.map(({ item, originalIndex }, displayIndex) => {
          const isLast = originalIndex === path.length - 1;
          const isFirst = displayIndex === 0;

          return (
            <li key={item.name} className="flex items-center">
              {/* Separator */}
              {!isFirst && !shouldTruncate && (
                <ChevronRight
                  data-testid="breadcrumb-separator"
                  className="w-4 h-4 text-gray-400 mx-1"
                  aria-hidden
                />
              )}

              {/* Ellipsis after first item when truncated */}
              {shouldTruncate && displayIndex === 1 && (
                <>
                  <ChevronRight className="w-4 h-4 text-gray-400 mx-1" aria-hidden />
                  <span
                    data-testid="breadcrumb-ellipsis"
                    className="flex items-center text-gray-400 mx-1"
                    aria-hidden
                  >
                    <MoreHorizontal className="w-4 h-4" />
                  </span>
                  <ChevronRight className="w-4 h-4 text-gray-400 mx-1" aria-hidden />
                </>
              )}

              {/* Separator for truncated items (except first and after ellipsis) */}
              {shouldTruncate && displayIndex > 1 && (
                <ChevronRight
                  data-testid="breadcrumb-separator"
                  className="w-4 h-4 text-gray-400 mx-1"
                  aria-hidden
                />
              )}

              {/* Breadcrumb item */}
              {isLast ? (
                <span
                  aria-current="page"
                  className={cn(
                    'flex items-center gap-1 px-2 py-1 rounded',
                    'text-sm font-medium text-indigo-700 bg-indigo-50'
                  )}
                >
                  <Layers className="w-4 h-4" />
                  {item.label}
                </span>
              ) : (
                <button
                  onClick={() => onNavigate(originalIndex)}
                  className={cn(
                    'flex items-center gap-1 px-2 py-1 rounded',
                    'text-sm text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 transition-colors'
                  )}
                >
                  <Layers className="w-4 h-4" />
                  {item.label}
                </button>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
