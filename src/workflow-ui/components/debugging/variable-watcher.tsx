'use client';

import { useState } from 'react';

export interface Variable {
  name: string;
  value: unknown;
  timestamp: string;
}

export interface VariableChange {
  value: unknown;
  timestamp: string;
}

export interface VariableHistory {
  name: string;
  changes: VariableChange[];
}

export interface VariableWatcherProps {
  variables: Variable[];
  onPin?: (variableName: string) => void;
  pinnedVariables?: string[];
  variableHistory?: VariableHistory[];
  groupBySource?: boolean;
  changedVariables?: string[];
}

export function VariableWatcher({
  variables,
  onPin,
  pinnedVariables = [],
  variableHistory,
  groupBySource = false,
  changedVariables = [],
}: VariableWatcherProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedVariable, setExpandedVariable] = useState<string | null>(null);
  const [showingHistory, setShowingHistory] = useState<string | null>(null);

  if (variables.length === 0) {
    return (
      <div role="region" aria-label="variable watcher" className="p-4 text-center text-gray-500">
        No variables available
      </div>
    );
  }

  const filteredVariables = variables.filter((v) =>
    v.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCopy = async (value: unknown) => {
    await navigator.clipboard.writeText(String(value));
  };

  const handlePin = (variableName: string) => {
    onPin?.(variableName);
  };

  const toggleExpand = (variableName: string) => {
    setExpandedVariable((current) => (current === variableName ? null : variableName));
  };

  const showHistory = (variableName: string) => {
    setShowingHistory(variableName);
  };

  const isComplex = (value: unknown): boolean => {
    return typeof value === 'object' && value !== null;
  };

  const formatValue = (value: unknown): string => {
    if (isComplex(value)) {
      return JSON.stringify(value, null, 2);
    }
    return String(value);
  };

  const groupVariablesBySource = (vars: Variable[]) => {
    const groups: Record<string, Variable[]> = {};

    vars.forEach((v) => {
      const parts = v.name.split('.');
      const source = parts[0] === 'tasks' ? `tasks.${parts[1]}` : parts[0];

      if (!groups[source]) {
        groups[source] = [];
      }
      groups[source].push(v);
    });

    return groups;
  };

  const renderVariable = (variable: Variable) => {
    const isChanged = changedVariables.includes(variable.name);
    const isPinned = pinnedVariables.includes(variable.name);
    const isExpanded = expandedVariable === variable.name;
    const history = variableHistory?.find((h) => h.name === variable.name);

    return (
      <div
        key={variable.name}
        data-changed={isChanged}
        className={`p-3 rounded border ${isChanged ? 'bg-yellow-50 border-yellow-300' : 'bg-gray-50 border-gray-200'}`}
      >
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <div
              className="font-medium cursor-pointer hover:text-blue-600"
              onClick={() => showHistory(variable.name)}
            >
              {variable.name}
            </div>
            <div className="text-sm text-gray-600 mt-1">
              {isExpanded ? (
                <pre className="bg-white p-2 rounded text-xs overflow-auto">
                  {formatValue(variable.value)}
                </pre>
              ) : (
                <span>{isComplex(variable.value) ? '{...}' : formatValue(variable.value)}</span>
              )}
            </div>
            {showingHistory === variable.name && history && (
              <div className="mt-2 text-sm">
                <div className="font-medium">History:</div>
                <div className="space-y-1">
                  {history.changes.map((change, idx) => (
                    <div key={idx} className="text-gray-600">
                      {formatValue(change.value)} - {new Date(change.timestamp).toLocaleString()}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div className="flex space-x-2 ml-2">
            {isComplex(variable.value) && (
              <button
                onClick={() => toggleExpand(variable.name)}
                className="text-sm text-blue-600 hover:underline"
                aria-label={isExpanded ? 'Collapse' : 'Expand'}
              >
                {isExpanded ? 'Collapse' : 'Expand'}
              </button>
            )}
            <button
              onClick={() => handleCopy(variable.value)}
              className="text-sm text-blue-600 hover:underline"
              aria-label="Copy"
            >
              Copy
            </button>
            <button
              onClick={() => handlePin(variable.name)}
              className="text-sm text-blue-600 hover:underline"
              aria-label={isPinned ? 'Unpin' : 'Pin'}
            >
              {isPinned ? 'Unpin' : 'Pin'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderGroupedVariables = () => {
    const groups = groupVariablesBySource(filteredVariables);

    return (
      <div className="space-y-4">
        {Object.entries(groups).map(([source, vars]) => (
          <div key={source}>
            <h4 className="font-medium mb-2">{source}</h4>
            <div className="space-y-2">{vars.map((v) => renderVariable(v))}</div>
          </div>
        ))}
      </div>
    );
  };

  const pinnedVars = variables.filter((v) => pinnedVariables.includes(v.name));

  return (
    <div role="region" aria-label="variable watcher" className="p-4 space-y-4">
      {/* Header with search */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Variable Watcher</h3>
        <input
          type="text"
          placeholder="Search variables..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="px-3 py-2 border rounded text-sm"
        />
      </div>

      {/* Pinned variables section */}
      {pinnedVars.length > 0 && (
        <div className="border-b pb-4">
          <h4 className="font-medium mb-2">Pinned Variables</h4>
          <div className="space-y-2">{pinnedVars.map((v) => renderVariable(v))}</div>
        </div>
      )}

      {/* All variables */}
      <div>
        {groupBySource ? (
          renderGroupedVariables()
        ) : (
          <div className="space-y-2">{filteredVariables.map((v) => renderVariable(v))}</div>
        )}
      </div>
    </div>
  );
}
