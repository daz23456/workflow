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
  ChevronDown,
  ChevronRight,
  Database,
  Mail,
  FileCheck,
  X,
  AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTasks } from '@/lib/api/queries';

// Category icon mapping
const categoryIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  Data: Database,
  Notifications: Mail,
  Validation: FileCheck,
};

// API response type for tasks
interface ApiTask {
  name: string;
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

  // Filter tasks by search and category
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

      return matchesSearch && matchesCategory;
    });
  }, [tasks, searchQuery, selectedCategory]);

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

  // Toggle category filter
  const toggleCategoryFilter = (category: string) => {
    setSelectedCategory(selectedCategory === category ? null : category);
  };

  // Loading state
  if (isLoading) {
    return (
      <div
        data-testid="task-palette"
        className="w-64 bg-white border-r border-gray-200 p-4"
        aria-label="Task palette"
      >
        <h2 className="text-lg font-semibold mb-4">Tasks</h2>
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
        className="w-64 bg-white border-r border-gray-200 p-4"
        aria-label="Task palette"
      >
        <h2 className="text-lg font-semibold mb-4">Tasks</h2>
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
      className={cn('w-64 bg-white border-r border-gray-200 flex flex-col', isCollapsed && 'w-12')}
      aria-label="Task palette"
    >
      {/* Header */}
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        {!isCollapsed && <h2 className="text-lg font-semibold">Tasks</h2>}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1 hover:bg-gray-100 rounded"
          aria-label={isCollapsed ? 'Expand palette' : 'Collapse palette'}
        >
          {isCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </button>
      </div>

      {!isCollapsed && (
        <>
          {/* Search */}
          <div className="p-4 border-b border-gray-200">
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

          {/* Category Filters */}
          <div className="p-4 border-b border-gray-200">
            <div className="flex flex-wrap gap-2">
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => toggleCategoryFilter(category)}
                  className={cn(
                    'px-3 py-1 text-sm rounded-full border transition-colors',
                    selectedCategory === category
                      ? 'bg-blue-500 text-white border-blue-500'
                      : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'
                  )}
                  aria-label={`Filter by ${category}`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>

          {/* Task List */}
          <div className="flex-1 overflow-y-auto p-4">
            {filteredTasks.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p className="text-sm">No tasks found</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredTasks.map((task: TaskItem) => {
                  const Icon = categoryIcons[task.category] || Database;
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
                        'p-3 border rounded-lg cursor-move transition-all',
                        isDragging && 'opacity-50 border-blue-400',
                        !isDragging && 'border-gray-200 hover:border-blue-400 hover:shadow-md'
                      )}
                      aria-label={`Drag ${task.displayName} to canvas`}
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          toggleTaskExpansion(task.name);
                        }
                      }}
                    >
                      {/* Task Header */}
                      <div className="flex items-start gap-2">
                        <div data-testid={`task-icon-${task.name}`}>
                          <Icon className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-sm text-gray-900">
                            {task.displayName}
                          </div>
                          <div className="text-xs text-gray-600 mt-1">{task.description}</div>
                          <div className="mt-2">
                            <span className="inline-block px-2 py-0.5 text-xs bg-gray-100 text-gray-700 rounded">
                              {task.category}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Expanded Details */}
                      {isExpanded && (
                        <div className="mt-3 pt-3 border-t border-gray-200 text-xs">
                          <div className="space-y-2">
                            <div>
                              <div className="font-semibold text-gray-700">Input:</div>
                              <pre className="mt-1 p-2 bg-gray-50 rounded overflow-x-auto">
                                {JSON.stringify(task.inputSchema, null, 2)}
                              </pre>
                            </div>
                            <div>
                              <div className="font-semibold text-gray-700">Output:</div>
                              <pre className="mt-1 p-2 bg-gray-50 rounded overflow-x-auto">
                                {JSON.stringify(task.outputSchema, null, 2)}
                              </pre>
                            </div>
                            <div className="text-gray-500 italic">Full schema</div>
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
