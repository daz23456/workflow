'use client';

import Link from 'next/link';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { SlowestWorkflow } from '@/lib/api/types';

interface SlowestWorkflowsPanelProps {
  workflows: SlowestWorkflow[] | undefined;
  isLoading: boolean;
  selectedWorkflow?: string;
  onSelectWorkflow?: (name: string) => void;
}

function DegradationIndicator({ percent }: { percent: number }) {
  if (percent > 10) {
    return (
      <span className="inline-flex items-center text-red-600 text-sm">
        <TrendingUp className="w-4 h-4 mr-1" />
        +{percent}%
      </span>
    );
  }
  if (percent < -10) {
    return (
      <span className="inline-flex items-center text-green-600 text-sm">
        <TrendingDown className="w-4 h-4 mr-1" />
        {percent}%
      </span>
    );
  }
  return (
    <span className="inline-flex items-center text-gray-500 text-sm">
      <Minus className="w-4 h-4 mr-1" />
      {percent}%
    </span>
  );
}

export function SlowestWorkflowsPanel({ workflows, isLoading, selectedWorkflow, onSelectWorkflow }: SlowestWorkflowsPanelProps) {
  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Slowest Workflows</h2>
        </div>
        <div className="divide-y divide-gray-200">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="p-4 animate-pulse" role="status" aria-label="Loading slowest workflows">
              <div className="h-4 w-32 bg-gray-200 rounded mb-2" />
              <div className="h-3 w-24 bg-gray-200 rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!workflows || workflows.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8 text-center">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Slowest Workflows</h2>
        <p className="text-gray-500">No workflow data available</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">Slowest Workflows</h2>
      </div>
      <div className="divide-y divide-gray-200" data-testid="slowest-workflows-panel">
        {workflows.map((workflow, index) => {
          const isSelected = selectedWorkflow === workflow.name;
          return (
            <button
              key={workflow.name}
              onClick={() => onSelectWorkflow?.(workflow.name)}
              className={`w-full p-4 flex items-center justify-between text-left transition-colors ${
                isSelected
                  ? 'bg-blue-50 border-l-4 border-blue-600'
                  : 'hover:bg-gray-50 border-l-4 border-transparent'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className={`text-lg font-bold w-6 ${isSelected ? 'text-blue-600' : 'text-gray-400'}`}>
                  {index + 1}
                </span>
                <div>
                  <Link
                    href={`/workflows/${workflow.name}`}
                    className={`font-medium hover:underline ${isSelected ? 'text-blue-700' : 'text-gray-900'}`}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {workflow.name}
                  </Link>
                  <p className="text-sm text-gray-500">
                    Avg: {workflow.avgDurationMs}ms | P95: {workflow.p95Ms}ms
                  </p>
                </div>
              </div>
              <DegradationIndicator percent={workflow.degradationPercent} />
            </button>
          );
        })}
      </div>
    </div>
  );
}
