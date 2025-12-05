/**
 * WorkflowLane Component
 *
 * Horizontal swimlane representing a workflow with task nodes.
 * Execution particles flow left-to-right through these lanes.
 *
 * Stage 12.5: Live Traffic Observatory
 */

'use client';

import React, { useMemo } from 'react';
import { Box, Sphere, Text, Line } from '@react-three/drei';
import { Vector3 } from 'three';
import { useRenderMode } from '../../../lib/visualization/visualization-store';

export interface TaskNode {
  id: string;
  name: string;
  xPosition: number;
  isActive?: boolean;
}

export interface WorkflowLaneProps {
  id: string;
  name: string;
  color: string;
  yPosition: number;
  tasks: TaskNode[];
  onTaskClick?: (workflowId: string, taskId: string) => void;
  onLaneClick?: (workflowId: string) => void;
}

export function WorkflowLane({
  id,
  name,
  color,
  yPosition,
  tasks,
  onTaskClick,
  onLaneClick,
}: WorkflowLaneProps) {
  const renderMode = useRenderMode();
  const isPerformanceMode = renderMode === 'performance';

  // Performance mode: reduce geometry complexity
  const taskSphereSegments = isPerformanceMode ? 8 : 16;

  // Calculate lane line points
  const linePoints = useMemo(() => {
    if (tasks.length < 2) return [];
    const sortedTasks = [...tasks].sort((a, b) => a.xPosition - b.xPosition);
    return sortedTasks.map((task) => new Vector3(task.xPosition, yPosition, 0));
  }, [tasks, yPosition]);

  const handleLaneClick = () => {
    onLaneClick?.(id);
  };

  const handleTaskClick = (taskId: string) => {
    onTaskClick?.(id, taskId);
  };

  return (
    <group data-testid={`workflow-lane-${id}`} onClick={handleLaneClick}>
      {/* Lane label */}
      <Text
        position={[-15, yPosition, 0]}
        fontSize={0.8}
        color={color}
        anchorX="right"
        anchorY="middle"
      >
        {name}
      </Text>

      {/* Lane line connecting tasks */}
      {linePoints.length >= 2 && (
        <Line
          points={linePoints}
          color={color}
          lineWidth={2}
          opacity={0.5}
          transparent
        />
      )}

      {/* Task nodes */}
      {tasks.map((task) => (
        <group
          key={task.id}
          position={[task.xPosition, yPosition, 0]}
          data-testid={`task-node-${task.id}`}
          onClick={(e) => {
            e.stopPropagation();
            handleTaskClick(task.id);
          }}
        >
          {/* Task sphere */}
          <Sphere args={[0.5, taskSphereSegments, taskSphereSegments]}>
            <meshStandardMaterial
              color={task.isActive ? '#ffffff' : color}
              emissive={color}
              emissiveIntensity={task.isActive ? 0.8 : 0.3}
            />
          </Sphere>

          {/* Task label (small, below the node) */}
          <Text
            position={[0, -1, 0]}
            fontSize={0.4}
            color="#ffffff"
            anchorX="center"
            anchorY="top"
            fillOpacity={0.7}
          >
            {task.name}
          </Text>
        </group>
      ))}

      {/* Lane background (subtle highlight) */}
      <Box
        args={[60, 2, 0.1]}
        position={[15, yPosition, -0.5]}
      >
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.05}
        />
      </Box>
    </group>
  );
}
