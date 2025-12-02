/**
 * TrafficStats Component
 *
 * Aggregated statistics panel showing key metrics
 * for the traffic visualization.
 *
 * Stage 12.5: Live Traffic Observatory
 */

'use client';

import React from 'react';
import { Activity, Clock, CheckCircle, TrendingUp } from 'lucide-react';

export interface TrafficStatsProps {
  activeExecutions: number;
  totalToday: number;
  successRate: number;
  avgLatencyMs: number;
  className?: string;
}

interface StatCardProps {
  icon: React.ReactNode;
  value: string;
  label: string;
  color: string;
}

function StatCard({ icon, value, label, color }: StatCardProps) {
  return (
    <div className="flex items-center gap-2">
      <div className={`p-1.5 rounded ${color}`}>
        {icon}
      </div>
      <div>
        <p className="text-white font-bold text-sm">{value}</p>
        <p className="text-gray-400 text-[10px]">{label}</p>
      </div>
    </div>
  );
}

function formatNumber(num: number): string {
  return num.toLocaleString('en-US');
}

export function TrafficStats({
  activeExecutions,
  totalToday,
  successRate,
  avgLatencyMs,
  className = '',
}: TrafficStatsProps) {
  return (
    <div
      data-testid="traffic-stats"
      className={`bg-black/60 backdrop-blur-sm rounded-lg p-3 ${className}`}
    >
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          icon={<Activity className="h-3 w-3 text-blue-400" />}
          value={String(activeExecutions)}
          label="Active"
          color="bg-blue-500/20"
        />
        <StatCard
          icon={<TrendingUp className="h-3 w-3 text-purple-400" />}
          value={formatNumber(totalToday)}
          label="Today"
          color="bg-purple-500/20"
        />
        <StatCard
          icon={<CheckCircle className="h-3 w-3 text-green-400" />}
          value={`${successRate}%`}
          label="Success"
          color="bg-green-500/20"
        />
        <StatCard
          icon={<Clock className="h-3 w-3 text-yellow-400" />}
          value={`${avgLatencyMs}ms`}
          label="Avg Latency"
          color="bg-yellow-500/20"
        />
      </div>
    </div>
  );
}
