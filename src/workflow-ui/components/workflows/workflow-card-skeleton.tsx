export function WorkflowCardSkeleton() {
  return (
    <div
      className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm"
      role="status"
      aria-label="Loading workflow"
    >
      {/* Header Skeleton */}
      <div className="mb-4 flex items-start justify-between">
        <div className="flex-1">
          {/* Name Skeleton */}
          <div className="h-6 w-3/4 animate-pulse rounded bg-gray-200" />
          {/* Namespace Badge Skeleton */}
          <div className="mt-2 h-5 w-24 animate-pulse rounded-full bg-gray-200" />
        </div>
      </div>

      {/* Description Skeleton */}
      <div className="mb-4 space-y-2">
        <div className="h-4 w-full animate-pulse rounded bg-gray-200" />
        <div className="h-4 w-5/6 animate-pulse rounded bg-gray-200" />
      </div>

      {/* Stats Skeleton */}
      <div className="grid grid-cols-3 gap-4 border-t border-gray-100 pt-4">
        <div>
          <div className="h-3 w-16 animate-pulse rounded bg-gray-200" />
          <div className="mt-1 h-5 w-12 animate-pulse rounded bg-gray-200" />
        </div>
        <div>
          <div className="h-3 w-16 animate-pulse rounded bg-gray-200" />
          <div className="mt-1 h-5 w-16 animate-pulse rounded bg-gray-200" />
        </div>
        <div>
          <div className="h-3 w-16 animate-pulse rounded bg-gray-200" />
          <div className="mt-1 h-5 w-12 animate-pulse rounded bg-gray-200" />
        </div>
      </div>
    </div>
  );
}
