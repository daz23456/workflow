/**
 * Properties Panel Component
 *
 * Displays the property editor for the currently selected operation.
 */

'use client';

import { useTransformBuilderStore } from '@/lib/stores/transform-builder-store';
import { SelectNode } from './nodes/select-node';
import { MapNode } from './nodes/map-node';
import { FilterNode } from './nodes/filter-node';
import { LimitNode } from './nodes/limit-node';
import { SkipNode } from './nodes/skip-node';
import { SortNode } from './nodes/sort-node';
import { EnrichNode } from './nodes/enrich-node';
import { GroupByNode } from './nodes/groupby-node';
import { AggregateNode } from './nodes/aggregate-node';
import { FlatMapNode } from './nodes/flatmap-node';
import { JoinNode } from './nodes/join-node';

export function PropertiesPanel() {
  const { pipeline, selection } = useTransformBuilderStore();

  const selectedIndex = selection.operationIndex;
  const selectedOperation = selectedIndex >= 0 ? pipeline[selectedIndex] : null;

  if (!selectedOperation) {
    return (
      <div className="h-full flex items-center justify-center text-gray-500 dark:text-gray-400 p-4">
        <div className="text-center">
          <p className="text-sm">Click an operation in the pipeline to edit its properties</p>
        </div>
      </div>
    );
  }

  // Render the appropriate node editor based on operation type
  const operationType = selectedOperation.operation;

  return (
    <div className="p-4 overflow-auto h-full">
      {operationType === 'select' && <SelectNode operationIndex={selectedIndex} />}
      {operationType === 'map' && <MapNode operationIndex={selectedIndex} />}
      {operationType === 'filter' && <FilterNode operationIndex={selectedIndex} />}
      {operationType === 'limit' && <LimitNode operationIndex={selectedIndex} />}
      {operationType === 'skip' && <SkipNode operationIndex={selectedIndex} />}
      {operationType === 'sortBy' && <SortNode operationIndex={selectedIndex} />}
      {operationType === 'enrich' && <EnrichNode operationIndex={selectedIndex} />}
      {operationType === 'groupBy' && <GroupByNode operationIndex={selectedIndex} />}
      {operationType === 'aggregate' && <AggregateNode operationIndex={selectedIndex} />}
      {operationType === 'flatMap' && <FlatMapNode operationIndex={selectedIndex} />}
      {operationType === 'join' && <JoinNode operationIndex={selectedIndex} />}
    </div>
  );
}
