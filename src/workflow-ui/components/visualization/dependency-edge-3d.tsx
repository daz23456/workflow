/**
 * DependencyEdge3D - 3D edge (connection) component
 *
 * Renders a line connecting two task nodes in the visualization.
 * Supports:
 * - Straight and curved (bezier) lines
 * - Theme-based styling
 * - Active/highlighted state for signal flow
 * - Hub-spoke routing: ALL edges go through central hub (star topology)
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

// Check if a node is at/near the hub center
function isAtHub(position: { x: number; y: number; z: number }): boolean {
  const threshold = 1.0; // Within 1 unit of center
  return Math.abs(position.x) < threshold &&
         Math.abs(position.y) < threshold &&
         Math.abs(position.z) < threshold;
}

// Hub center position
const HUB_CENTER: [number, number, number] = [0, 0, 0.5];

export function DependencyEdge3D({
  id: _id,
  sourceId,
  targetId,
  curved = true,
  active = false,
}: DependencyEdge3DProps) {
  const themePreset = useVisualizationStore((state) => state.themePreset);
  const layoutMode = useVisualizationStore((state) => state.layoutMode);
  const nodes = useVisualizationStore((state) => state.nodes);

  const theme = getThemePreset(themePreset);

  // Get source and target positions
  const sourceNode = nodes.get(sourceId);
  const targetNode = nodes.get(targetId);

  // Calculate edge data based on layout mode
  const edgeData = useMemo(() => {
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

    // Hub-spoke mode: TRUE star topology - all edges through hub
    if (layoutMode === 'hub-spoke') {
      const sourceIsHub = isAtHub(sourceNode.position);
      const targetIsHub = isAtHub(targetNode.position);

      // If both are spokes, render TWO separate edges: spoke→hub and hub→spoke
      if (!sourceIsHub && !targetIsHub) {
        return {
          type: 'hub-routed' as const,
          // Edge 1: Source spoke → Hub (inbound)
          edge1: {
            start,
            end: HUB_CENTER,
          },
          // Edge 2: Hub → Target spoke (outbound)
          edge2: {
            start: HUB_CENTER,
            end,
          },
        };
      }

      // One is the hub - draw direct line
      return {
        type: 'direct' as const,
        start,
        end,
      };
    }

    // Default: curved line calculation
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
      midZ + 0.2,
    ];

    return {
      type: 'curved' as const,
      start,
      end,
      mid,
    };
  }, [sourceNode, targetNode, layoutMode]);

  // Don't render if nodes don't exist
  if (!edgeData) {
    return null;
  }

  // Calculate line properties based on state
  const lineWidth = active ? theme.edgeWidth * 2 : theme.edgeWidth;
  const opacity = active ? Math.min(theme.edgeOpacity * 2, 1) : theme.edgeOpacity;
  const color = theme.edgeColor;

  // Hub-routed: render two separate straight lines through hub
  if (edgeData.type === 'hub-routed') {
    return (
      <>
        {/* Inbound: Source spoke → Hub */}
        <Line
          points={[edgeData.edge1.start, edgeData.edge1.end]}
          color={color}
          lineWidth={lineWidth}
          transparent
          opacity={opacity}
        />
        {/* Outbound: Hub → Target spoke */}
        <Line
          points={[edgeData.edge2.start, edgeData.edge2.end]}
          color={color}
          lineWidth={lineWidth}
          transparent
          opacity={opacity}
        />
      </>
    );
  }

  // Direct line (hub to spoke)
  if (edgeData.type === 'direct') {
    return (
      <Line
        points={[edgeData.start, edgeData.end]}
        color={color}
        lineWidth={lineWidth}
        transparent
        opacity={opacity}
      />
    );
  }

  // Curved line (radial/stacked modes)
  if (curved && edgeData.type === 'curved') {
    return (
      <QuadraticBezierLine
        start={edgeData.start}
        end={edgeData.end}
        mid={edgeData.mid}
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
      points={[edgeData.start, edgeData.end]}
      color={color}
      lineWidth={lineWidth}
      transparent
      opacity={opacity}
    />
  );
}
