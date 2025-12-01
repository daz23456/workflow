'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, SkipForward, RotateCcw } from 'lucide-react';

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

const PLAYBACK_SPEEDS = [0.125, 0.25, 0.5, 1, 2] as const;
type PlaybackSpeed = (typeof PLAYBACK_SPEEDS)[number];

export function ExecutionTimeline({ events, onTimeChange }: ExecutionTimelineProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<PlaybackSpeed>(1);
  const playIntervalRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Notify parent when index changes
  const updateIndex = useCallback(
    (index: number) => {
      setCurrentIndex(index);
      if (events[index]) {
        onTimeChange?.(events[index].timestamp);
      }
    },
    [events, onTimeChange]
  );

  // Auto-play effect with real-time intervals
  useEffect(() => {
    if (isPlaying && events.length > 0) {
      const scheduleNext = (fromIndex: number) => {
        const nextIndex = fromIndex + 1;
        if (nextIndex >= events.length) {
          setIsPlaying(false);
          return;
        }

        // Calculate real time difference between current and next event
        const currentTime = new Date(events[fromIndex].timestamp).getTime();
        const nextTime = new Date(events[nextIndex].timestamp).getTime();
        const realDiffMs = Math.max(10, nextTime - currentTime); // Minimum 10ms to prevent zero/negative
        const scaledInterval = realDiffMs / playbackSpeed;

        playIntervalRef.current = setTimeout(() => {
          setCurrentIndex(nextIndex);
          onTimeChange?.(events[nextIndex].timestamp);
          scheduleNext(nextIndex);
        }, scaledInterval);
      };

      scheduleNext(currentIndex);

      return () => {
        if (playIntervalRef.current) {
          clearTimeout(playIntervalRef.current);
        }
      };
    }
  }, [isPlaying, playbackSpeed, events, onTimeChange, currentIndex]);

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

  const formatDuration = (ms: number): string => {
    if (ms < 1000) {
      return `${ms}ms`;
    }
    return `${(ms / 1000).toFixed(3)}s`;
  };

  const handleScrubberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const index = parseInt(e.target.value, 10);
    setIsPlaying(false);
    updateIndex(index);
  };

  const handleEventClick = (index: number) => {
    setIsPlaying(false);
    updateIndex(index);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      stepForward();
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      stepBackward();
    } else if (e.key === ' ') {
      e.preventDefault();
      togglePlay();
    }
  };

  const togglePlay = () => {
    if (currentIndex >= events.length - 1) {
      // Restart from beginning
      updateIndex(0);
    }
    setIsPlaying(!isPlaying);
  };

  const stepForward = () => {
    setIsPlaying(false);
    if (currentIndex < events.length - 1) {
      updateIndex(currentIndex + 1);
    }
  };

  const stepBackward = () => {
    setIsPlaying(false);
    if (currentIndex > 0) {
      updateIndex(currentIndex - 1);
    }
  };

  const restart = () => {
    setIsPlaying(false);
    updateIndex(0);
  };

  const getEventClassName = (eventType: string, isCompleted: boolean) => {
    if (eventType.includes('workflow')) {
      return isCompleted
        ? 'bg-blue-100 border-blue-400'
        : 'bg-blue-50 border-blue-200';
    }
    return isCompleted
      ? 'bg-green-100 border-green-400'
      : 'bg-green-50 border-green-200';
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const month = date.toLocaleString('en-US', { month: 'short' });
    const day = date.getDate();
    const time = date.toISOString().substring(11, 23); // HH:MM:SS.mmm
    return `${month} ${day}, ${time}`;
  };

  const getEventLabel = (event: ExecutionEvent) => {
    switch (event.type) {
      case 'workflow_started':
        return `Workflow Started${event.workflowName ? `: ${event.workflowName}` : ''}`;
      case 'workflow_completed':
        return `Workflow Completed${event.status ? ` (${event.status})` : ''}`;
      case 'task_started':
        return `Task Started: ${event.taskName || event.taskId || 'Unknown'}`;
      case 'task_completed':
        return `Task Completed: ${event.taskName || event.taskId || 'Unknown'}${event.status ? ` (${event.status})` : ''}`;
      default:
        return event.type;
    }
  };

  const currentEvent = events[currentIndex];

  return (
    <div role="region" aria-label="execution timeline" className="p-4 space-y-4">
      {/* Header with duration */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Execution Timeline</h3>
        <div className="text-sm text-gray-600">Duration: {formatDuration(durationMs)}</div>
      </div>

      {/* Playback Controls */}
      <div className="flex items-center gap-3 bg-gray-50 rounded-lg p-3">
        {/* Restart */}
        <button
          onClick={restart}
          className="p-2 rounded-md hover:bg-gray-200 transition-colors"
          aria-label="Restart"
          title="Restart (go to beginning)"
        >
          <RotateCcw className="w-4 h-4 text-gray-600" />
        </button>

        {/* Play/Pause */}
        <button
          onClick={togglePlay}
          className="p-2 rounded-full bg-blue-600 hover:bg-blue-700 text-white transition-colors"
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? (
            <Pause className="w-5 h-5" />
          ) : (
            <Play className="w-5 h-5 ml-0.5" />
          )}
        </button>

        {/* Step Forward */}
        <button
          onClick={stepForward}
          disabled={currentIndex >= events.length - 1}
          className="p-2 rounded-md hover:bg-gray-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          aria-label="Step forward"
          title="Step to next event"
        >
          <SkipForward className="w-4 h-4 text-gray-600" />
        </button>

        {/* Divider */}
        <div className="w-px h-6 bg-gray-300" />

        {/* Speed Selector */}
        <div className="flex items-center gap-1">
          <span className="text-xs text-gray-500 mr-1">Speed:</span>
          {PLAYBACK_SPEEDS.map((speed) => (
            <button
              key={speed}
              onClick={() => setPlaybackSpeed(speed)}
              className={`px-2 py-1 text-xs rounded transition-colors ${
                playbackSpeed === speed
                  ? 'bg-blue-600 text-white'
                  : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-100'
              }`}
              aria-label={`${speed}x speed`}
            >
              {speed}x
            </button>
          ))}
        </div>

        {/* Event Counter */}
        <div className="ml-auto text-sm text-gray-600">
          {currentIndex + 1} / {events.length}
        </div>
      </div>

      {/* Current time indicator */}
      <div className="text-sm text-gray-700">
        Current: {formatTime(currentEvent.timestamp)}
      </div>

      {/* Timeline scrubber */}
      <div className="py-2">
        <input
          type="range"
          role="slider"
          aria-label="timeline scrubber"
          min="0"
          max={events.length - 1}
          value={currentIndex}
          onChange={handleScrubberChange}
          onKeyDown={handleKeyDown}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
        />
      </div>

      {/* Event list */}
      <div className="space-y-2 max-h-[400px] overflow-y-auto">
        {events.map((event, index) => {
          const isPast = index < currentIndex;
          const isCurrent = index === currentIndex;

          return (
            <div
              key={event.id}
              className={`p-3 rounded border cursor-pointer transition-all ${getEventClassName(event.type, isPast || isCurrent)} ${
                isCurrent ? 'ring-2 ring-blue-500 shadow-md' : ''
              } ${isPast ? 'opacity-60' : ''}`}
              onClick={() => handleEventClick(index)}
            >
              <div className="flex justify-between items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900 truncate">
                    {getEventLabel(event)}
                  </div>
                  {event.taskId && (
                    <div className="text-xs text-gray-500 mt-0.5 truncate">
                      ID: {event.taskId}
                    </div>
                  )}
                </div>
                <div className="text-sm text-gray-500 shrink-0">
                  {formatTime(event.timestamp)}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
