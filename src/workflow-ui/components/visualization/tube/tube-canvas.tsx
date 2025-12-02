/**
 * TubeCanvas - SVG Canvas for London Underground-style visualization
 *
 * Renders workflows as tube lines with stations (tasks) following
 * Harry Beck's design principles: only 0°, 45°, and 90° angles.
 *
 * Part of Stage 12.4: Tube Map View
 */

'use client';

import React from 'react';

export interface TubeCanvasProps {
  width: number;
  height: number;
  className?: string;
  children?: React.ReactNode;
}

export function TubeCanvas({
  width,
  height,
  className = '',
  children,
}: TubeCanvasProps) {
  return (
    <svg
      data-testid="tube-canvas"
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label="Tube map visualization of workflow tasks"
      className={className}
      style={{
        backgroundColor: '#0a1628',
        fontFamily: "'Johnston', 'Gill Sans', sans-serif",
      }}
    >
      {/* Grid pattern for reference (optional, can be toggled) */}
      <defs>
        <pattern
          id="tube-grid"
          width="20"
          height="20"
          patternUnits="userSpaceOnUse"
        >
          <path
            d="M 20 0 L 0 0 0 20"
            fill="none"
            stroke="rgba(255,255,255,0.05)"
            strokeWidth="0.5"
          />
        </pattern>
      </defs>

      {/* Background */}
      <rect width={width} height={height} fill="#0a1628" />

      {/* Optional grid overlay */}
      <rect width={width} height={height} fill="url(#tube-grid)" />

      {/* Children: lines, stations, trains */}
      {children}
    </svg>
  );
}

export default TubeCanvas;
