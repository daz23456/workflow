/**
 * StationMarker - Station circle representing a task
 *
 * Renders a task as a tube station with white fill and colored outline.
 * Interchange stations (shared tasks) are larger.
 * Terminus stations have an additional bar.
 *
 * Part of Stage 12.4: Tube Map View
 */

'use client';

import React from 'react';

export interface StationMarkerProps {
  id: string;
  name: string;
  x: number;
  y: number;
  lineColor: string;
  isInterchange?: boolean;
  isTerminus?: boolean;
  labelPosition?: 'top' | 'bottom' | 'left' | 'right';
  onClick?: (id: string) => void;
  onHover?: (id: string, isHovered: boolean) => void;
}

export function StationMarker({
  id,
  name,
  x,
  y,
  lineColor,
  isInterchange = false,
  isTerminus = false,
  labelPosition = 'right',
  onClick,
  onHover,
}: StationMarkerProps) {
  const radius = isInterchange ? 10 : 6;
  const strokeWidth = isInterchange ? 3 : 2;

  // Calculate label position
  const labelOffset = {
    top: { dx: 0, dy: -radius - 8, anchor: 'middle' },
    bottom: { dx: 0, dy: radius + 16, anchor: 'middle' },
    left: { dx: -radius - 8, dy: 4, anchor: 'end' },
    right: { dx: radius + 8, dy: 4, anchor: 'start' },
  }[labelPosition];

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
    <g data-testid={`station-group-${id}`}>
      {/* Terminus bar (for start/end stations) */}
      {isTerminus && (
        <rect
          data-testid={`${id}-terminus`}
          x={x - radius - 4}
          y={y - radius - 2}
          width={4}
          height={(radius + 2) * 2}
          fill={lineColor}
          rx={2}
        />
      )}

      {/* Station circle */}
      <circle
        data-testid={id}
        cx={x}
        cy={y}
        r={radius}
        fill="white"
        stroke={lineColor}
        strokeWidth={strokeWidth}
        style={{ cursor: 'pointer' }}
        onClick={handleClick}
        onPointerEnter={handlePointerEnter}
        onPointerLeave={handlePointerLeave}
      >
        <title>{name}</title>
      </circle>

      {/* Interchange double ring */}
      {isInterchange && (
        <circle
          cx={x}
          cy={y}
          r={radius + 4}
          fill="none"
          stroke="white"
          strokeWidth={2}
          style={{ pointerEvents: 'none' }}
        />
      )}

      {/* Station name label */}
      <text
        x={x + labelOffset.dx}
        y={y + labelOffset.dy}
        textAnchor={labelOffset.anchor as 'start' | 'middle' | 'end'}
        fill="white"
        fontSize={11}
        fontFamily="'Johnston', 'Gill Sans', sans-serif"
        style={{ pointerEvents: 'none', userSelect: 'none' }}
      >
        {name}
      </text>
    </g>
  );
}

export default StationMarker;
