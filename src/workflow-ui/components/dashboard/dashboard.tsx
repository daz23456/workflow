'use client';

import { useState, useEffect } from 'react';
import type { TimeRange } from '@/lib/api/types';
import { useSystemMetrics, useWorkflowsMetrics, useSlowestWorkflows, useWorkflowHistoryMetrics } from '@/lib/api/queries';
import { TimeRangeSelector } from './time-range-selector';
import { SystemMetricsCard } from './system-metrics-card';
import { WorkflowMetricsTable } from './workflow-metrics-table';
import { SlowestWorkflowsPanel } from './slowest-workflows-panel';
import { LatencyChart } from './latency-chart';
import { LatencyDistribution } from './latency-distribution';

export function Dashboard() {
  const [timeRange, setTimeRange] = useState<TimeRange>('24h');
  const [selectedWorkflow, setSelectedWorkflow] = useState<string | undefined>();

  const { data: systemMetrics, isLoading: systemLoading } = useSystemMetrics(timeRange);
  const { data: workflowsMetrics, isLoading: workflowsLoading } = useWorkflowsMetrics();
  const { data: slowestWorkflows, isLoading: slowestLoading } = useSlowestWorkflows(10);

  // Auto-select the first (slowest) workflow when data loads
  useEffect(() => {
    if (slowestWorkflows?.length && !selectedWorkflow) {
      setSelectedWorkflow(slowestWorkflows[0].name);
    }
  }, [slowestWorkflows, selectedWorkflow]);

  // Get history for the selected workflow to show in the chart
  const { data: historyData, isLoading: historyLoading } = useWorkflowHistoryMetrics(
    selectedWorkflow ?? '',
    timeRange
  );

  // Get selected workflow metrics for distribution chart
  const selectedWorkflowMetrics = slowestWorkflows?.find((w) => w.name === selectedWorkflow);

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

      {/* Two-column layout for charts and slowest workflows */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left column: Charts stacked */}
        <div className="space-y-4">
          <LatencyChart
            data={historyData}
            isLoading={historyLoading || !selectedWorkflow}
            title={selectedWorkflow ? `${selectedWorkflow} - Latency Trends` : 'Latency Over Time'}
          />
          <LatencyDistribution
            p50Ms={selectedWorkflowMetrics?.avgDurationMs ?? 0} // Approximate P50 with avg
            p95Ms={selectedWorkflowMetrics?.p95Ms ?? 0}
            avgMs={selectedWorkflowMetrics?.avgDurationMs ?? 0}
            isLoading={slowestLoading || !selectedWorkflow}
            workflowName={selectedWorkflow}
          />
        </div>
        {/* Right column: Slowest workflows */}
        <SlowestWorkflowsPanel
          workflows={slowestWorkflows}
          isLoading={slowestLoading}
          selectedWorkflow={selectedWorkflow}
          onSelectWorkflow={setSelectedWorkflow}
        />
      </div>

      {/* Workflow metrics table */}
      <WorkflowMetricsTable workflows={workflowsMetrics} isLoading={workflowsLoading} />
    </div>
  );
}
