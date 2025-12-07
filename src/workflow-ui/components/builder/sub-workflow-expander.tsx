/**
 * SubWorkflowExpander - Panel showing expanded sub-workflow graph
 *
 * Features:
 * - Displays sub-workflow tasks as a React Flow graph
 * - Shows task dependencies as edges
 * - Supports nested sub-workflow navigation
 * - Close with button or Escape key
 */

'use client';

import { useEffect, useMemo, useCallback } from 'react';
import { ReactFlow, Background, Controls, MiniMap } from '@xyflow/react';
import { X, Layers } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SubWorkflowTask {
  id: string;
  label: string;
  taskRef?: string;
  workflowRef?: string;
  dependsOn?: string[];
}

interface SubWorkflowExpanderProps {
  workflowName: string;
  tasks: SubWorkflowTask[];
  onClose: () => void;
  onNavigate?: (workflowRef: string) => void;
}

export function SubWorkflowExpander({
  workflowName,
  tasks,
  onClose,
  onNavigate,
}: SubWorkflowExpanderProps) {
  // Handle Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Convert tasks to React Flow nodes
  const nodes = useMemo(() => {
    return tasks.map((task, index) => ({
      id: task.id,
      type: task.workflowRef ? 'subworkflow' : 'task',
      position: { x: 100, y: index * 100 + 50 },
      data: {
        label: task.label,
        taskRef: task.taskRef,
        workflowRef: task.workflowRef,
      },
    }));
  }, [tasks]);

  // Convert dependencies to React Flow edges
  const edges = useMemo(() => {
    const edgeList: Array<{ id: string; source: string; target: string; type: string }> = [];

    tasks.forEach((task) => {
      if (task.dependsOn) {
        task.dependsOn.forEach((dep) => {
          edgeList.push({
            id: `${dep}-${task.id}`,
            source: dep,
            target: task.id,
            type: 'default',
          });
        });
      }
    });

    return edgeList;
  }, [tasks]);

  // Handle nested sub-workflow navigation
  const handleNavigate = useCallback(
    (workflowRef: string) => {
      if (onNavigate) {
        onNavigate(workflowRef);
      }
    },
    [onNavigate]
  );

  // Find nested sub-workflows
  const nestedSubWorkflows = tasks.filter((task) => task.workflowRef);

  return (
    <div
      role="dialog"
      aria-label={`Sub-workflow: ${workflowName}`}
      className="fixed inset-4 z-50 bg-white rounded-lg shadow-2xl border border-gray-200 flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gradient-to-r from-indigo-50 to-purple-50">
        <div className="flex items-center gap-2">
          <Layers className="w-5 h-5 text-indigo-600" />
          <h2 className="text-lg font-semibold text-gray-900">{workflowName}</h2>
          <span className="text-sm text-gray-500 bg-indigo-100 px-2 py-0.5 rounded-full">
            {tasks.length} tasks
          </span>
        </div>
        <button
          data-testid="close-expander-button"
          onClick={onClose}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          aria-label="Close sub-workflow view"
        >
          <X className="w-5 h-5 text-gray-500" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 relative">
        {tasks.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500">
            <p>No tasks in this sub-workflow</p>
          </div>
        ) : (
          <>
            <ReactFlow nodes={nodes} edges={edges} fitView>
              <Background />
              <Controls />
              <MiniMap />
            </ReactFlow>

            {/* Nested sub-workflow navigation buttons */}
            {nestedSubWorkflows.length > 0 && (
              <div className="absolute bottom-4 left-4 flex gap-2">
                {nestedSubWorkflows.map((task) => (
                  <button
                    key={task.id}
                    data-testid={`navigate-${task.workflowRef}`}
                    onClick={() => handleNavigate(task.workflowRef!)}
                    className={cn(
                      'flex items-center gap-1 px-3 py-1.5 rounded-lg',
                      'bg-indigo-100 text-indigo-700 hover:bg-indigo-200 transition-colors',
                      'text-sm font-medium'
                    )}
                  >
                    <Layers className="w-4 h-4" />
                    Open {task.label}
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
