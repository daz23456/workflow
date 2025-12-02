/**
 * EventFeed Component
 *
 * Live event stream panel showing workflow execution events
 * with filtering and auto-scroll capabilities.
 *
 * Stage 12.5: Live Traffic Observatory
 */

'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Button } from '../../ui/button';
import { Play, CheckCircle, XCircle, ArrowRight } from 'lucide-react';

export type EventType = 'workflow_started' | 'task_started' | 'task_completed' | 'workflow_completed';

export interface TrafficEvent {
  id: string;
  type: EventType;
  workflowName: string;
  executionId: string;
  taskName?: string;
  status?: 'succeeded' | 'failed';
  timestamp: Date;
}

export interface EventFeedProps {
  events: TrafficEvent[];
  maxEvents?: number;
  className?: string;
}

type FilterType = 'all' | 'started' | 'completed' | 'failed';

const EVENT_ICONS: Record<EventType, React.ReactNode> = {
  workflow_started: <Play className="h-3 w-3 text-blue-400" />,
  task_started: <ArrowRight className="h-3 w-3 text-blue-300" />,
  task_completed: <CheckCircle className="h-3 w-3 text-green-400" />,
  workflow_completed: <CheckCircle className="h-3 w-3 text-green-500" />,
};

const EVENT_COLORS: Record<EventType, string> = {
  workflow_started: 'border-l-blue-500',
  task_started: 'border-l-blue-300',
  task_completed: 'border-l-green-400',
  workflow_completed: 'border-l-green-500',
};

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

function getEventDescription(event: TrafficEvent): string {
  switch (event.type) {
    case 'workflow_started':
      return `Workflow started: ${event.workflowName}`;
    case 'task_started':
      return `Task started: ${event.taskName}`;
    case 'task_completed':
      return `Task ${event.status}: ${event.taskName}`;
    case 'workflow_completed':
      return `Workflow ${event.status}: ${event.workflowName}`;
    default:
      return 'Unknown event';
  }
}

export function EventFeed({
  events,
  maxEvents = 50,
  className = '',
}: EventFeedProps) {
  const [filter, setFilter] = useState<FilterType>('all');
  const scrollRef = useRef<HTMLDivElement>(null);

  // Filter events based on selected filter
  const filteredEvents = useMemo(() => {
    let filtered = events;

    switch (filter) {
      case 'started':
        filtered = events.filter((e) =>
          e.type === 'workflow_started' || e.type === 'task_started'
        );
        break;
      case 'completed':
        filtered = events.filter((e) =>
          (e.type === 'task_completed' || e.type === 'workflow_completed') &&
          e.status === 'succeeded'
        );
        break;
      case 'failed':
        filtered = events.filter((e) =>
          e.status === 'failed'
        );
        break;
    }

    return filtered.slice(0, maxEvents);
  }, [events, filter, maxEvents]);

  // Auto-scroll to latest event
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [events.length]);

  return (
    <div
      data-testid="event-feed"
      className={`bg-black/60 backdrop-blur-sm rounded-lg overflow-hidden ${className}`}
    >
      {/* Header with filters */}
      <div className="flex items-center gap-2 p-3 border-b border-white/10">
        <span className="text-sm font-medium text-white">Events</span>
        <div className="flex-1" />
        <div className="flex gap-1">
          <Button
            variant={filter === 'all' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setFilter('all')}
            className="h-6 px-2 text-xs"
          >
            All
          </Button>
          <Button
            variant={filter === 'started' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setFilter('started')}
            className="h-6 px-2 text-xs"
          >
            Started
          </Button>
          <Button
            variant={filter === 'completed' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setFilter('completed')}
            className="h-6 px-2 text-xs"
          >
            Completed
          </Button>
        </div>
      </div>

      {/* Event list */}
      <div
        ref={scrollRef}
        className="max-h-64 overflow-y-auto"
      >
        {filteredEvents.length === 0 ? (
          <div className="p-4 text-center text-gray-500 text-sm">
            No events to display
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {filteredEvents.map((event) => (
              <div
                key={event.id}
                data-testid={`event-${event.id}`}
                className={`flex items-center gap-2 px-3 py-2 border-l-2 ${EVENT_COLORS[event.type]} ${
                  event.status === 'failed' ? 'bg-red-900/20 border-l-red-500' : ''
                }`}
              >
                <div className="flex-shrink-0">
                  {event.status === 'failed' ? (
                    <XCircle className="h-3 w-3 text-red-400" />
                  ) : (
                    EVENT_ICONS[event.type]
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-white truncate">
                    {getEventDescription(event)}
                  </p>
                  <p className="text-[10px] text-gray-500">
                    {event.workflowName} • {event.executionId.slice(0, 8)}
                  </p>
                </div>
                <div className="flex-shrink-0 text-[10px] text-gray-500">
                  {formatTime(event.timestamp)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
