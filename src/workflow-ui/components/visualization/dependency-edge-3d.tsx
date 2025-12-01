/**
 * DependencyEdge3D - 3D edge (connection) component
 *
 * Renders a line connecting two task nodes in the visualization.
 * Supports:
 * - Straight and curved (bezier) lines
 * - Theme-based styling
 * - Active/highlighted state for signal flow
 */

'use client';

import React, { useMemo } from 'react';
import { Line, QuadraticBezierLine } from '@react-three/drei';
import { useVisualizationStore } from '../../lib/visualization/visualization-store';
import { getThemePreset } from '../../lib/visualization/theme';

interface DependencyEdge3DProps {
  id: string;
  sourceId: string;
  targetId: string;
  curved?: boolean;
  active?: boolean;
}

export function DependencyEdge3D({
  id: _id,
  sourceId,
  targetId,
  curved = true,
  active = false,
}: DependencyEdge3DProps) {
  const themePreset = useVisualizationStore((state) => state.themePreset);
  const nodes = useVisualizationStore((state) => state.nodes);

  const theme = getThemePreset(themePreset);

  // Get source and target positions
  const sourceNode = nodes.get(sourceId);
  const targetNode = nodes.get(targetId);

  // Calculate positions and midpoint
  const positions = useMemo(() => {
    if (!sourceNode || !targetNode) {
      return null;
    }

    const start: [number, number, number] = [
      sourceNode.position.x,
      sourceNode.position.y,
      sourceNode.position.z,
    ];

    const end: [number, number, number] = [
      targetNode.position.x,
      targetNode.position.y,
      targetNode.position.z,
    ];

    // Calculate midpoint with curve offset
    const midX = (start[0] + end[0]) / 2;
    const midY = (start[1] + end[1]) / 2;
    const midZ = (start[2] + end[2]) / 2;

    // Add curve offset perpendicular to the line
    const dx = end[0] - start[0];
    const dy = end[1] - start[1];
    const distance = Math.sqrt(dx * dx + dy * dy);
    const curveOffset = Math.min(distance * 0.3, 1.5);

    // Perpendicular offset for curve
    const perpX = -dy / (distance || 1);
    const perpY = dx / (distance || 1);

    const mid: [number, number, number] = [
      midX + perpX * curveOffset,
      midY + perpY * curveOffset,
      midZ + 0.2, // Slight Z offset to avoid z-fighting
    ];

    return { start, end, mid };
  }, [sourceNode, targetNode]);

  // Don't render if nodes don't exist
  if (!positions) {
    return null;
  }

  // Calculate line properties based on state
  const lineWidth = active ? theme.edgeWidth * 2 : theme.edgeWidth;
  const opacity = active ? Math.min(theme.edgeOpacity * 2, 1) : theme.edgeOpacity;
  const color = theme.edgeColor;

  if (curved) {
    return (
      <QuadraticBezierLine
        start={positions.start}
        end={positions.end}
        mid={positions.mid}
        color={color}
        lineWidth={lineWidth}
        transparent
        opacity={opacity}
        dashed={false}
      />
    );
  }

  return (
    <Line
      points={[positions.start, positions.end]}
      color={color}
      lineWidth={lineWidth}
      transparent
      opacity={opacity}
    />
  );
}
