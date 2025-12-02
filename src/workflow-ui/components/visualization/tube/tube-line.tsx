/**
 * TubeLine - Colored line representing a workflow
 *
 * Renders a workflow as a tube line following Beck's design principles.
 * Lines connect stations (tasks) with 0°, 45°, or 90° angles only.
 *
 * Part of Stage 12.4: Tube Map View
 */

'use client';

import React, { useMemo } from 'react';

export interface Point {
  x: number;
  y: number;
}

export interface TubeLineProps {
  id: string;
  name: string;
  color: string;
  points: Point[];
  strokeWidth?: number;
  onClick?: (id: string) => void;
  onHover?: (id: string, isHovered: boolean) => void;
  isHighlighted?: boolean;
}

export function TubeLine({
  id,
  name,
  color,
  points,
  strokeWidth = 8,
  onClick,
  onHover,
  isHighlighted = false,
}: TubeLineProps) {
  // Generate SVG path from points
  const pathD = useMemo(() => {
    if (points.length < 2) return '';

    const commands = points.map((point, index) => {
      if (index === 0) {
        return `M ${point.x} ${point.y}`;
      }
      return `L ${point.x} ${point.y}`;
    });

    return commands.join(' ');
  }, [points]);

  const handleClick = () => {
    onClick?.(id);
  };

  const handlePointerEnter = () => {
    onHover?.(id, true);
  };

  const handlePointerLeave = () => {
    onHover?.(id, false);
  };

  return (
    <g data-testid={`tube-line-group-${id}`}>
      {/* White outline for contrast (like real tube maps) */}
      <path
        d={pathD}
        fill="none"
        stroke="white"
        strokeWidth={strokeWidth + 4}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.3}
      />

      {/* Main colored line */}
      <path
        data-testid={`tube-line-${id}`}
        d={pathD}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{
          cursor: 'pointer',
          transition: 'opacity 0.2s, stroke-width 0.2s',
          filter: isHighlighted ? `drop-shadow(0 0 6px ${color})` : 'none',
        }}
        opacity={isHighlighted ? 1 : 0.9}
        onClick={handleClick}
        onPointerEnter={handlePointerEnter}
        onPointerLeave={handlePointerLeave}
      >
        <title>{name}</title>
      </path>
    </g>
  );
}

export default TubeLine;
