import { cn } from '@/lib/utils';
import { Tag, X } from 'lucide-react';

interface TagBadgeProps {
  tag: string;
  className?: string;
  showIcon?: boolean;
  onClick?: (tag: string) => void;
  onRemove?: (tag: string) => void;
  'data-selected'?: boolean;
  'data-tag'?: string;
  'data-disabled'?: boolean;
}

export function TagBadge({
  tag,
  className,
  showIcon = true,
  onClick,
  onRemove,
  'data-selected': dataSelected,
  'data-tag': dataTag,
  'data-disabled': dataDisabled,
}: TagBadgeProps) {
  const handleClick = () => {
    onClick?.(tag);
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    onRemove?.(tag);
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium',
        'bg-blue-50 text-blue-700 border border-blue-200',
        'dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-700',
        onClick && 'cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900/60',
        className
      )}
      onClick={onClick ? handleClick : undefined}
      data-selected={dataSelected}
      data-tag={dataTag}
      data-disabled={dataDisabled}
    >
      {showIcon && <Tag className="h-3 w-3" />}
      <span>{tag}</span>
      {onRemove && (
        <button
          type="button"
          onClick={handleRemove}
          className="ml-0.5 rounded-full p-0.5 hover:bg-blue-200 dark:hover:bg-blue-800"
          aria-label={`Remove ${tag}`}
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </span>
  );
}
