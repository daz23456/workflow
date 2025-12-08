import { cn } from '@/lib/utils';
import { Folder, X } from 'lucide-react';

interface CategoryBadgeProps {
  category: string;
  className?: string;
  showIcon?: boolean;
  onClick?: (category: string) => void;
  onRemove?: (category: string) => void;
  'data-selected'?: boolean;
  'data-category'?: string;
  'data-disabled'?: boolean;
}

export function CategoryBadge({
  category,
  className,
  showIcon = true,
  onClick,
  onRemove,
  'data-selected': dataSelected,
  'data-category': dataCategory,
  'data-disabled': dataDisabled,
}: CategoryBadgeProps) {
  const handleClick = () => {
    onClick?.(category);
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    onRemove?.(category);
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium',
        'bg-purple-50 text-purple-700 border border-purple-200',
        'dark:bg-purple-900/40 dark:text-purple-300 dark:border-purple-700',
        onClick && 'cursor-pointer hover:bg-purple-100 dark:hover:bg-purple-900/60',
        className
      )}
      onClick={onClick ? handleClick : undefined}
      data-selected={dataSelected}
      data-category={dataCategory}
      data-disabled={dataDisabled}
    >
      {showIcon && <Folder className="h-3 w-3" />}
      <span>{category}</span>
      {onRemove && (
        <button
          type="button"
          onClick={handleRemove}
          className="ml-0.5 rounded-full p-0.5 hover:bg-purple-200 dark:hover:bg-purple-800"
          aria-label={`Remove ${category}`}
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </span>
  );
}
