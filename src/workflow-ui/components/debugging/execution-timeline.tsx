'use client';

import { useState } from 'react';

export interface ExecutionEvent {
  id: string;
  type: 'workflow_started' | 'workflow_completed' | 'task_started' | 'task_completed';
  timestamp: string;
  workflowName?: string;
  taskId?: string;
  taskName?: string;
  status?: string;
}

export interface ExecutionTimelineProps {
  events: ExecutionEvent[];
  onTimeChange?: (timestamp: string) => void;
}

export function ExecutionTimeline({ events, onTimeChange }: ExecutionTimelineProps) {
  const [currentTime, setCurrentTime] = useState<string | null>(null);
  const [hoveredEvent, setHoveredEvent] = useState<ExecutionEvent | null>(null);

  if (events.length === 0) {
    return (
      <div role="region" aria-label="execution timeline" className="p-4 text-center text-gray-500">
        No execution events available
      </div>
    );
  }

  // Calculate duration
  const startTime = new Date(events[0].timestamp);
  const endTime = new Date(events[events.length - 1].timestamp);
  const durationMs = endTime.getTime() - startTime.getTime();
  const durationSeconds = Math.round(durationMs / 1000);

  const handleScrubberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const index = parseInt(e.target.value, 10);
    const timestamp = events[index]?.timestamp;
    if (timestamp) {
      setCurrentTime(timestamp);
      onTimeChange?.(timestamp);
    }
  };

  const handleEventClick = (event: ExecutionEvent) => {
    setCurrentTime(event.timestamp);
    onTimeChange?.(event.timestamp);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      const currentIndex = events.findIndex((ev) => ev.timestamp === currentTime);
      const newIndex =
        e.key === 'ArrowRight'
          ? Math.min(currentIndex + 1, events.length - 1)
          : Math.max(currentIndex - 1, 0);

      const timestamp = events[newIndex]?.timestamp;
      if (timestamp) {
        setCurrentTime(timestamp);
        onTimeChange?.(timestamp);
      }
    }
  };

  const getEventClassName = (eventType: string) => {
    if (eventType.includes('workflow')) {
      return 'event-workflow bg-blue-100 border-blue-300';
    }
    return 'event-task bg-green-100 border-green-300';
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toISOString().substring(11, 19); // HH:MM:SS
  };

  return (
    <div role="region" aria-label="execution timeline" className="p-4 space-y-4">
      {/* Header with duration */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Execution Timeline</h3>
        <div className="text-sm text-gray-600">Duration: {durationSeconds}s</div>
      </div>

      {/* Current time indicator */}
      <div className="text-sm text-gray-700">
        Current: {currentTime ? formatTime(currentTime) : formatTime(events[0].timestamp)}
      </div>

      {/* Timeline scrubber */}
      <div className="py-2">
        <input
          type="range"
          role="slider"
          aria-label="timeline scrubber"
          min="0"
          max={events.length - 1}
          value={events.findIndex((ev) => ev.timestamp === currentTime) || 0}
          onChange={handleScrubberChange}
          onKeyDown={handleKeyDown}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
        />
      </div>

      {/* Event list */}
      <div className="space-y-2">
        {events.map((event) => (
          <div
            key={event.id}
            className={`p-3 rounded border cursor-pointer ${getEventClassName(event.type)} ${
              event.timestamp === currentTime ? 'ring-2 ring-blue-500' : ''
            }`}
            onClick={() => handleEventClick(event)}
            onMouseEnter={() => setHoveredEvent(event)}
            onMouseLeave={() => setHoveredEvent(null)}
          >
            <div className="flex justify-between items-start">
              <div>
                <div className="font-medium">{event.type}</div>
                {event.taskId && hoveredEvent?.id === event.id && (
                  <div className="text-sm text-gray-600 mt-1">
                    <div>Task ID: {event.taskId}</div>
                    {event.taskName && <div>Task: {event.taskName}</div>}
                  </div>
                )}
              </div>
              <div className="text-sm text-gray-500">{formatTime(event.timestamp)}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
