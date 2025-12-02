'use client';

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';

interface LatencyDistributionProps {
  p50Ms: number;
  p95Ms: number;
  avgMs: number;
  minMs?: number;
  maxMs?: number;
  isLoading?: boolean;
  workflowName?: string;
}

/**
 * Generates a bell curve distribution approximation based on percentile data.
 * Uses the relationship between P50 (median) and P95 to estimate distribution shape.
 */
function generateDistributionData(p50: number, p95: number, avg: number) {
  // Estimate standard deviation from P50 and P95
  // For normal distribution: P95 ≈ mean + 1.645 * stdDev
  const estimatedStdDev = (p95 - p50) / 1.645;
  const mean = avg || p50;

  // Generate points for the bell curve
  const points: { latency: number; density: number; label: string }[] = [];
  const minX = Math.max(0, mean - 3 * estimatedStdDev);
  const maxX = mean + 3 * estimatedStdDev;
  const step = (maxX - minX) / 50;

  for (let x = minX; x <= maxX; x += step) {
    // Normal distribution PDF
    const exponent = -Math.pow(x - mean, 2) / (2 * Math.pow(estimatedStdDev, 2));
    const density = Math.exp(exponent) / (estimatedStdDev * Math.sqrt(2 * Math.PI));

    points.push({
      latency: Math.round(x),
      density: density * 100, // Scale for visibility
      label: `${Math.round(x)}ms`,
    });
  }

  return points;
}

export function LatencyDistribution({
  p50Ms,
  p95Ms,
  avgMs,
  isLoading = false,
  workflowName,
}: LatencyDistributionProps) {
  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Latency Distribution</h2>
        <div className="h-40 bg-gray-100 animate-pulse rounded" />
      </div>
    );
  }

  if (!p50Ms || !p95Ms) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Latency Distribution</h2>
        <div className="h-40 flex items-center justify-center text-gray-500">
          No distribution data available
        </div>
      </div>
    );
  }

  const distributionData = generateDistributionData(p50Ms, p95Ms, avgMs);

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload[0]) return null;
    const data = payload[0].payload;

    return (
      <div className="bg-white p-2 rounded border shadow text-sm">
        <p className="font-semibold">{data.latency}ms</p>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4" data-testid="latency-distribution">
      <div className="mb-3">
        <h2 className="text-lg font-semibold text-gray-900">Latency Distribution</h2>
        <p className="text-sm text-gray-500">
          {workflowName ? `Estimated distribution for ${workflowName}` : 'Estimated latency distribution'}
        </p>
      </div>

      <ResponsiveContainer width="100%" height={160}>
        <AreaChart data={distributionData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="distributionGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.05} />
            </linearGradient>
          </defs>

          <XAxis
            dataKey="latency"
            stroke="#6b7280"
            style={{ fontSize: '10px' }}
            tickLine={false}
            tickFormatter={(value) => `${value}ms`}
          />

          <YAxis hide />

          <Tooltip content={<CustomTooltip />} />

          {/* P50 marker */}
          <ReferenceLine
            x={p50Ms}
            stroke="#10b981"
            strokeWidth={2}
            strokeDasharray="4 4"
            label={{ value: 'P50', position: 'top', fill: '#10b981', fontSize: 11 }}
          />

          {/* Average marker */}
          <ReferenceLine
            x={Math.round(avgMs)}
            stroke="#3b82f6"
            strokeWidth={2}
            strokeDasharray="4 4"
            label={{ value: 'Avg', position: 'top', fill: '#3b82f6', fontSize: 11 }}
          />

          {/* P95 marker */}
          <ReferenceLine
            x={p95Ms}
            stroke="#f97316"
            strokeWidth={2}
            strokeDasharray="4 4"
            label={{ value: 'P95', position: 'top', fill: '#f97316', fontSize: 11 }}
          />

          <Area
            type="monotone"
            dataKey="density"
            stroke="#8b5cf6"
            strokeWidth={2}
            fill="url(#distributionGradient)"
          />
        </AreaChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div className="flex justify-center gap-6 mt-2 text-xs">
        <span className="flex items-center gap-1">
          <span className="w-3 h-0.5 bg-green-500 inline-block" style={{ borderStyle: 'dashed' }} />
          <span className="text-gray-600">P50: <strong>{p50Ms}ms</strong></span>
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-0.5 bg-blue-500 inline-block" style={{ borderStyle: 'dashed' }} />
          <span className="text-gray-600">Avg: <strong>{Math.round(avgMs)}ms</strong></span>
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-0.5 bg-orange-500 inline-block" style={{ borderStyle: 'dashed' }} />
          <span className="text-gray-600">P95: <strong>{p95Ms}ms</strong></span>
        </span>
      </div>
    </div>
  );
}
