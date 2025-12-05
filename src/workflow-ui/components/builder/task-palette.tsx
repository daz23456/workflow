/**
 * TaskPalette - Drag-and-Drop Task Palette for Workflow Builder
 *
 * Features:
 * - Display available tasks with search/filter
 * - Drag-and-drop tasks to canvas
 * - Task details expansion
 * - Category filtering
 * - Collapsible palette
 */

'use client';

import { useState, useMemo } from 'react';
import {
  Search,
  X,
  AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTasks } from '@/lib/api/queries';
import { HelpIcon } from '@/components/learning/help-icon';
import { HELP_TOPICS } from '@/components/learning/help-content-registry';

// API response type for tasks
interface ApiTask {
  name: string;
  namespace: string;
  description: string;
  inputSchema: unknown;
  outputSchema: unknown;
}

// Enhanced task item with derived properties for UI
interface TaskItem extends ApiTask {
  displayName: string;
  category: string;
}

// Helper to derive displayName from task name
const toDisplayName = (name: string): string => {
  return name
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

// Helper to derive category from task name (first word)
const toCategory = (name: string): string => {
  const firstWord = name.split('-')[0];
  return firstWord.charAt(0).toUpperCase() + firstWord.slice(1);
};

export function TaskPalette() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedNamespace, setSelectedNamespace] = useState<string | null>(null);
  const [expandedTask, setExpandedTask] = useState<string | null>(null);
  const [draggingTask, setDraggingTask] = useState<string | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Fetch tasks from API
  const { data, isLoading, error, refetch } = useTasks();

  // Transform API tasks to include displayName and category
  const tasks: TaskItem[] = useMemo(() => {
    if (!data?.tasks) return [];
    return data.tasks.map((task) => ({
      ...task,
      displayName: toDisplayName(task.name),
      category: toCategory(task.name),
    }));
  }, [data?.tasks]);

  // Get unique categories
  const categories = useMemo(() => {
    if (!tasks || tasks.length === 0) return [];
    return Array.from(new Set(tasks.map((task) => task.category)));
  }, [tasks]);

  // Get unique namespaces
  const namespaces = useMemo(() => {
    if (!tasks || tasks.length === 0) return [];
    return Array.from(new Set(tasks.map((task) => task.namespace).filter(Boolean))).sort();
  }, [tasks]);

  // Filter tasks by search, category, and namespace
  const filteredTasks = useMemo(() => {
    if (!tasks || tasks.length === 0) return [];

    return tasks.filter((task) => {
      // Search filter
      const matchesSearch =
        searchQuery === '' ||
        task.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.name.toLowerCase().includes(searchQuery.toLowerCase());

      // Category filter
      const matchesCategory = !selectedCategory || task.category === selectedCategory;

      // Namespace filter
      const matchesNamespace = !selectedNamespace || task.namespace === selectedNamespace;

      return matchesSearch && matchesCategory && matchesNamespace;
    });
  }, [tasks, searchQuery, selectedCategory, selectedNamespace]);

  // Handle drag start
  const handleDragStart = (task: TaskItem, event: React.DragEvent<HTMLDivElement>) => {
    setDraggingTask(task.name);

    if (!event.dataTransfer) return; // Guard for test environments

    const dragData = {
      taskRef: task.name,
      label: task.displayName,
      description: task.description,
      type: 'task',
    };

    event.dataTransfer.setData('application/reactflow', JSON.stringify(dragData));
    event.dataTransfer.effectAllowed = 'move';
  };

  // Handle drag end
  const handleDragEnd = () => {
    setDraggingTask(null);
  };

  // Toggle task expansion
  const toggleTaskExpansion = (taskName: string) => {
    setExpandedTask(expandedTask === taskName ? null : taskName);
  };

  // Loading state
  if (isLoading) {
    return (
      <div
        data-testid="task-palette"
        className="w-full h-full bg-white border-r border-gray-200 p-4"
        aria-label="Task palette"
      >
        <div data-testid="loading-skeleton" className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-gray-200 rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div
        data-testid="task-palette"
        className="w-full h-full bg-white border-r border-gray-200 p-4"
        aria-label="Task palette"
      >
        <div className="flex flex-col items-center justify-center p-4 text-center">
          <AlertTriangle className="w-12 h-12 text-red-500 mb-2" />
          <p className="text-sm text-red-600 mb-4">Failed to load tasks</p>
          <button
            onClick={() => refetch()}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            aria-label="Retry loading tasks"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      data-testid="task-palette"
      className={cn('w-full h-full bg-white border-r border-gray-200 flex flex-col overflow-hidden', isCollapsed && 'w-12')}
      aria-label="Task palette"
    >
      {!isCollapsed && (
        <>
          {/* Search */}
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center gap-1.5 mb-2">
              <label className="text-sm font-medium text-gray-700">Search</label>
              <HelpIcon topic={HELP_TOPICS.SEARCH_TASKS} />
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search tasks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                aria-label="Search tasks"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2"
                  aria-label="Clear search"
                >
                  <X className="w-4 h-4 text-gray-400 hover:text-gray-600" />
                </button>
              )}
            </div>
          </div>

          {/* Namespace Filter */}
          {namespaces.length > 1 && (
            <div className="px-4 py-2 border-b border-gray-200">
              <label className="text-xs font-medium text-gray-500 mb-1 block">Namespace</label>
              <select
                value={selectedNamespace || ''}
                onChange={(e) => setSelectedNamespace(e.target.value || null)}
                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                aria-label="Filter by namespace"
              >
                <option value="">All namespaces</option>
                {namespaces.map((ns) => (
                  <option key={ns} value={ns}>
                    {ns}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Category Filter - Dropdown for compact display */}
          {categories.length > 1 && (
            <div className="px-4 py-2 border-b border-gray-200">
              <label className="text-xs font-medium text-gray-500 mb-1 block">Category</label>
              <select
                value={selectedCategory || ''}
                onChange={(e) => setSelectedCategory(e.target.value || null)}
                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                aria-label="Filter by category"
              >
                <option value="">All categories ({tasks.length})</option>
                {categories.map((category) => {
                  const count = tasks.filter((t) => t.category === category).length;
                  return (
                    <option key={category} value={category}>
                      {category} ({count})
                    </option>
                  );
                })}
              </select>
            </div>
          )}

          {/* Task List */}
          <div className="flex-1 overflow-y-auto p-4">
            {filteredTasks.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p className="text-sm">No tasks found</p>
              </div>
            ) : (
              <div className="space-y-1">
                {filteredTasks.map((task: TaskItem) => {
                  const isExpanded = expandedTask === task.name;
                  const isDragging = draggingTask === task.name;

                  return (
                    <div
                      key={task.name}
                      data-testid={`task-item-${task.name}`}
                      draggable
                      onDragStart={(e) => handleDragStart(task, e)}
                      onDragEnd={handleDragEnd}
                      onClick={() => toggleTaskExpansion(task.name)}
                      data-dragging={isDragging}
                      className={cn(
                        'px-2 py-1.5 border rounded cursor-move transition-all text-sm',
                        isDragging && 'opacity-50 border-blue-400 bg-blue-50',
                        !isDragging && 'border-gray-200 hover:border-blue-400 hover:bg-blue-50'
                      )}
                      aria-label={`Drag ${task.displayName} to canvas`}
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          toggleTaskExpansion(task.name);
                        }
                      }}
                    >
                      {/* Compact Task Display */}
                      <div className="font-medium text-gray-900 truncate">
                        {task.displayName}
                      </div>

                      {/* Expanded Details - only show on click */}
                      {isExpanded && (
                        <div className="mt-2 pt-2 border-t border-gray-200 text-xs">
                          <p className="text-gray-600 mb-2">{task.description}</p>
                          <div className="space-y-2">
                            <div>
                              <div className="font-semibold text-gray-700">Input:</div>
                              <pre className="mt-1 p-1.5 bg-gray-50 rounded overflow-x-auto text-[10px]">
                                {JSON.stringify(task.inputSchema, null, 2)}
                              </pre>
                            </div>
                            <div>
                              <div className="font-semibold text-gray-700">Output:</div>
                              <pre className="mt-1 p-1.5 bg-gray-50 rounded overflow-x-auto text-[10px]">
                                {JSON.stringify(task.outputSchema, null, 2)}
                              </pre>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
