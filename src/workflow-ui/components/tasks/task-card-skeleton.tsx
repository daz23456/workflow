export function TaskCardSkeleton() {
  return (
    <div className="animate-pulse rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      {/* Header */}
      <div className="mb-3">
        <div className="mb-2 flex items-start justify-between gap-3">
          <div className="h-6 w-32 rounded bg-gray-200"></div>
          <div className="h-6 w-16 shrink-0 rounded bg-gray-200"></div>
        </div>
        <div className="h-4 w-full rounded bg-gray-100"></div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4 border-t border-gray-100 pt-4">
        {/* Success Rate */}
        <div>
          <div className="mb-1 h-3 w-20 rounded bg-gray-100"></div>
          <div className="h-6 w-12 rounded bg-gray-200"></div>
        </div>

        {/* Executions */}
        <div>
          <div className="mb-1 h-3 w-16 rounded bg-gray-100"></div>
          <div className="h-5 w-8 rounded bg-gray-200"></div>
        </div>

        {/* Average Duration */}
        <div>
          <div className="mb-1 h-3 w-20 rounded bg-gray-100"></div>
          <div className="h-5 w-12 rounded bg-gray-200"></div>
        </div>

        {/* Used By */}
        <div>
          <div className="mb-1 h-3 w-12 rounded bg-gray-100"></div>
          <div className="h-5 w-20 rounded bg-gray-200"></div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-4 border-t border-gray-100 pt-3">
        <div className="h-3 w-32 rounded bg-gray-100"></div>
      </div>
    </div>
  );
}
