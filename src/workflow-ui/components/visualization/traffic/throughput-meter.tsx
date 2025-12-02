/**
 * ThroughputMeter Component
 *
 * Real-time gauge displaying current requests per second
 * with visual color coding based on load level.
 *
 * Stage 12.5: Live Traffic Observatory
 */

'use client';

import React, { useMemo } from 'react';

export interface ThroughputMeterProps {
  currentRate: number;
  maxRate: number;
  className?: string;
}

// Get color based on percentage of max capacity
function getLoadColor(percentage: number): string {
  if (percentage < 0.4) return '#4ade80'; // Green - low load
  if (percentage < 0.7) return '#fbbf24'; // Yellow - medium load
  return '#ef4444'; // Red - high load
}

export function ThroughputMeter({
  currentRate,
  maxRate,
  className = '',
}: ThroughputMeterProps) {
  const percentage = useMemo(() =>
    Math.min(1, Math.max(0, currentRate / maxRate)),
    [currentRate, maxRate]
  );

  const color = useMemo(() => getLoadColor(percentage), [percentage]);

  // Arc calculations for SVG gauge
  const arcRadius = 40;
  const arcStartAngle = -135;
  const arcEndAngle = 135;
  const arcRange = arcEndAngle - arcStartAngle;
  const currentAngle = arcStartAngle + (arcRange * percentage);

  // Convert angle to SVG arc coordinates
  const polarToCartesian = (angle: number) => {
    const radians = (angle * Math.PI) / 180;
    return {
      x: 50 + arcRadius * Math.cos(radians),
      y: 50 + arcRadius * Math.sin(radians),
    };
  };

  const start = polarToCartesian(arcStartAngle);
  const end = polarToCartesian(currentAngle);
  const largeArcFlag = percentage > 0.5 ? 1 : 0;

  const arcPath = percentage > 0
    ? `M ${start.x} ${start.y} A ${arcRadius} ${arcRadius} 0 ${largeArcFlag} 1 ${end.x} ${end.y}`
    : '';

  const backgroundEnd = polarToCartesian(arcEndAngle);
  const backgroundArcPath = `M ${start.x} ${start.y} A ${arcRadius} ${arcRadius} 0 1 1 ${backgroundEnd.x} ${backgroundEnd.y}`;

  return (
    <div
      data-testid="throughput-meter"
      className={`bg-black/60 backdrop-blur-sm rounded-lg p-4 ${className}`}
    >
      <svg viewBox="0 0 100 70" className="w-full h-auto">
        {/* Background arc */}
        <path
          d={backgroundArcPath}
          fill="none"
          stroke="#1f2937"
          strokeWidth="8"
          strokeLinecap="round"
        />

        {/* Active arc */}
        {percentage > 0 && (
          <path
            data-testid="gauge-arc"
            d={arcPath}
            fill="none"
            stroke={color}
            strokeWidth="8"
            strokeLinecap="round"
            style={{
              filter: `drop-shadow(0 0 6px ${color})`,
            }}
          />
        )}
        {percentage === 0 && (
          <circle
            data-testid="gauge-arc"
            cx={start.x}
            cy={start.y}
            r="0.1"
            fill="transparent"
          />
        )}

        {/* Value display */}
        <text
          x="50"
          y="45"
          textAnchor="middle"
          className="fill-white font-bold"
          style={{ fontSize: '16px' }}
        >
          {currentRate.toFixed(1)}
        </text>

        {/* Label */}
        <text
          x="50"
          y="60"
          textAnchor="middle"
          className="fill-gray-400"
          style={{ fontSize: '8px' }}
        >
          req/s
        </text>
      </svg>
    </div>
  );
}
