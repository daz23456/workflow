'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown, ChevronRight, AlertTriangle, List, Network } from 'lucide-react';
import { useBlastRadius } from '@/lib/api/queries';
import { BlastRadiusSummary } from './blast-radius-summary';
import { BlastRadiusGraph, BlastRadiusGraphLegend } from './blast-radius-graph';

interface BlastRadiusPanelProps {
  taskName: string;
  defaultExpanded?: boolean;
}

type ViewMode = 'list' | 'graph';
type DepthOption = 1 | 2 | 3 | 0; // 0 = unlimited

const DEPTH_OPTIONS: { value: DepthOption; label: string }[] = [
  { value: 1, label: 'Depth 1' },
  { value: 2, label: 'Depth 2' },
  { value: 3, label: 'Depth 3' },
  { value: 0, label: 'Unlimited' },
];

/**
 * Collapsible panel showing blast radius analysis for a task
 * Shows what workflows and tasks would be affected if this task changes
 */
export function BlastRadiusPanel({ taskName, defaultExpanded = false }: BlastRadiusPanelProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [depth, setDepth] = useState<DepthOption>(1);
  const router = useRouter();

  const { data, isLoading, error } = useBlastRadius(taskName, {
    depth: depth === 0 ? 10 : depth, // Use 10 as "unlimited" since API requires a number
    enabled: isExpanded, // Only fetch when expanded
  });

  const handleWorkflowClick = (workflowName: string) => {
    router.push(`/workflows/${workflowName}`);
  };

  const handleTaskClick = (taskNameClicked: string) => {
    router.push(`/tasks/${taskNameClicked}`);
  };

  const handleNodeClick = (nodeId: string, nodeType: 'task' | 'workflow') => {
    // Extract name from nodeId (format: "task:name" or "workflow:name")
    const name = nodeId.includes(':') ? nodeId.split(':')[1] : nodeId;
    if (nodeType === 'workflow') {
      handleWorkflowClick(name);
    } else {
      handleTaskClick(name);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700" data-testid="blast-radius-panel">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center gap-3 p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        aria-expanded={isExpanded}
        data-testid="panel-header"
      >
        {isExpanded ? (
          <ChevronDown className="h-5 w-5 text-gray-400" />
        ) : (
          <ChevronRight className="h-5 w-5 text-gray-400" />
        )}
        <span className="flex-1 font-semibold text-gray-900 dark:text-gray-100">
          Blast Radius
        </span>
        {data?.truncatedAtDepth && (
          <span
            className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400"
            title="More affected items exist beyond the current depth"
            data-testid="truncation-warning"
          >
            <AlertTriangle className="h-3.5 w-3.5" />
            More levels exist
          </span>
        )}
      </button>

      {/* Content */}
      {isExpanded && (
        <div className="border-t border-gray-200 dark:border-gray-700 p-4" data-testid="panel-content">
          {/* Controls */}
          <div className="flex items-center justify-between mb-4 gap-4">
            {/* Depth selector */}
            <div className="flex items-center gap-2">
              <label htmlFor="depth-select" className="text-sm text-gray-500 dark:text-gray-400">
                Analysis depth:
              </label>
              <select
                id="depth-select"
                value={depth}
                onChange={(e) => setDepth(Number(e.target.value) as DepthOption)}
                className="text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                data-testid="depth-selector"
              >
                {DEPTH_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* View mode toggle */}
            <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
              <button
                onClick={() => setViewMode('list')}
                className={`flex items-center gap-1 px-2 py-1 rounded text-sm ${
                  viewMode === 'list'
                    ? 'bg-white dark:bg-gray-700 shadow text-gray-900 dark:text-gray-100'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
                data-testid="view-list"
                aria-pressed={viewMode === 'list'}
              >
                <List className="h-4 w-4" />
                List
              </button>
              <button
                onClick={() => setViewMode('graph')}
                className={`flex items-center gap-1 px-2 py-1 rounded text-sm ${
                  viewMode === 'graph'
                    ? 'bg-white dark:bg-gray-700 shadow text-gray-900 dark:text-gray-100'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
                data-testid="view-graph"
                aria-pressed={viewMode === 'graph'}
              >
                <Network className="h-4 w-4" />
                Graph
              </button>
            </div>
          </div>

          {/* Loading state */}
          {isLoading && (
            <div className="py-8 text-center" data-testid="loading">
              <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-2" />
              <p className="text-sm text-gray-500 dark:text-gray-400">Analyzing impact...</p>
            </div>
          )}

          {/* Error state */}
          {error && (
            <div className="py-4 text-center" data-testid="error">
              <p className="text-sm text-red-600 dark:text-red-400">
                Failed to load blast radius analysis
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {error.message}
              </p>
            </div>
          )}

          {/* Data display */}
          {!isLoading && !error && data && (
            <>
              {viewMode === 'list' && data.summary && (
                <BlastRadiusSummary
                  summary={data.summary}
                  onWorkflowClick={handleWorkflowClick}
                  onTaskClick={handleTaskClick}
                />
              )}
              {viewMode === 'graph' && data.graph && (
                <>
                  <BlastRadiusGraph graph={data.graph} onNodeClick={handleNodeClick} />
                  <BlastRadiusGraphLegend />
                </>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Skeleton loading state for the blast radius panel
 */
export function BlastRadiusPanelSkeleton() {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 animate-pulse">
      <div className="flex items-center gap-3 p-4">
        <div className="h-5 w-5 bg-gray-200 dark:bg-gray-700 rounded" />
        <div className="h-5 w-32 bg-gray-200 dark:bg-gray-700 rounded" />
      </div>
    </div>
  );
}
