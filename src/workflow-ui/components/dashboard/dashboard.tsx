'use client';

import { useState } from 'react';
import type { TimeRange } from '@/lib/api/types';
import { useSystemMetrics, useWorkflowsMetrics, useSlowestWorkflows, useWorkflowHistoryMetrics } from '@/lib/api/queries';
import { TimeRangeSelector } from './time-range-selector';
import { SystemMetricsCard } from './system-metrics-card';
import { WorkflowMetricsTable } from './workflow-metrics-table';
import { SlowestWorkflowsPanel } from './slowest-workflows-panel';
import { LatencyChart } from './latency-chart';

export function Dashboard() {
  const [timeRange, setTimeRange] = useState<TimeRange>('24h');

  const { data: systemMetrics, isLoading: systemLoading } = useSystemMetrics(timeRange);
  const { data: workflowsMetrics, isLoading: workflowsLoading } = useWorkflowsMetrics();
  const { data: slowestWorkflows, isLoading: slowestLoading } = useSlowestWorkflows(10);

  // Get history for the slowest workflow to show in the chart
  const topWorkflow = slowestWorkflows?.[0]?.name;
  const { data: historyData, isLoading: historyLoading } = useWorkflowHistoryMetrics(
    topWorkflow ?? '',
    timeRange
  );

  return (
    <div className="space-y-6" data-testid="dashboard">
      {/* Header with time range selector */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">System Dashboard</h1>
          <p className="text-gray-600 mt-1">Monitor workflow performance and health</p>
        </div>
        <TimeRangeSelector value={timeRange} onChange={setTimeRange} />
      </div>

      {/* System-wide metrics */}
      <SystemMetricsCard metrics={systemMetrics} isLoading={systemLoading} />

      {/* Two-column layout for chart and slowest workflows */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <LatencyChart
          data={historyData}
          isLoading={historyLoading || !topWorkflow}
          title={topWorkflow ? `${topWorkflow} - P95 Latency` : 'Latency Over Time'}
        />
        <SlowestWorkflowsPanel workflows={slowestWorkflows} isLoading={slowestLoading} />
      </div>

      {/* Workflow metrics table */}
      <WorkflowMetricsTable workflows={workflowsMetrics} isLoading={workflowsLoading} />
    </div>
  );
}
