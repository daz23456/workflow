'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  RotateCcw,
  X,
  PanelRightOpen,
  PanelRightClose,
} from 'lucide-react';
import type { ExecutionEvent } from './execution-timeline';

const PLAYBACK_SPEEDS = [0.125, 0.25, 0.5, 1, 2] as const;
type PlaybackSpeed = (typeof PLAYBACK_SPEEDS)[number];

export interface FullscreenControlsProps {
  events: ExecutionEvent[];
  currentIndex: number;
  isPlaying: boolean;
  playbackSpeed: PlaybackSpeed;
  sidebarOpen: boolean;
  onIndexChange: (index: number) => void;
  onPlayPause: () => void;
  onSpeedChange: (speed: PlaybackSpeed) => void;
  onExit: () => void;
  onToggleSidebar: () => void;
}

const AUTO_HIDE_DELAY = 3000;

export function FullscreenControls({
  events,
  currentIndex,
  isPlaying,
  playbackSpeed,
  sidebarOpen,
  onIndexChange,
  onPlayPause,
  onSpeedChange,
  onExit,
  onToggleSidebar,
}: FullscreenControlsProps) {
  const [isVisible, setIsVisible] = useState(true);
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Reset hide timer
  const resetHideTimer = useCallback(() => {
    setIsVisible(true);
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
    }
    hideTimeoutRef.current = setTimeout(() => {
      if (!isPlaying) return; // Don't hide if paused
      setIsVisible(false);
    }, AUTO_HIDE_DELAY);
  }, [isPlaying]);

  // Handle mouse movement
  useEffect(() => {
    const handleMouseMove = () => resetHideTimer();
    document.addEventListener('mousemove', handleMouseMove);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
      }
    };
  }, [resetHideTimer]);

  // Show controls when paused
  useEffect(() => {
    if (!isPlaying) {
      setIsVisible(true);
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
      }
    } else {
      resetHideTimer();
    }
  }, [isPlaying, resetHideTimer]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (e.key) {
        case 'Escape':
          e.preventDefault();
          onExit();
          break;
        case ' ':
          e.preventDefault();
          onPlayPause();
          break;
        case 'ArrowRight':
          e.preventDefault();
          if (currentIndex < events.length - 1) {
            onIndexChange(currentIndex + 1);
          }
          break;
        case 'ArrowLeft':
          e.preventDefault();
          if (currentIndex > 0) {
            onIndexChange(currentIndex - 1);
          }
          break;
        case 's':
        case 'S':
          e.preventDefault();
          onToggleSidebar();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, events.length, onExit, onIndexChange, onPlayPause, onToggleSidebar]);

  if (events.length === 0) return null;

  // Calculate duration
  const startTime = new Date(events[0].timestamp);
  const endTime = new Date(events[events.length - 1].timestamp);
  const durationMs = endTime.getTime() - startTime.getTime();

  const formatDuration = (ms: number): string => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(3)}s`;
  };

  const currentEvent = events[currentIndex];
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toISOString().substring(11, 23);
  };

  return (
    <motion.div
      ref={containerRef}
      initial={{ opacity: 0, y: 20 }}
      animate={{
        opacity: isVisible ? 1 : 0,
        y: isVisible ? 0 : 20,
      }}
      transition={{ duration: 0.3 }}
      className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-50 ${
        isVisible ? 'pointer-events-auto' : 'pointer-events-none'
      }`}
      onMouseEnter={() => setIsVisible(true)}
    >
      <div className="bg-black/80 backdrop-blur-md rounded-2xl px-6 py-4 shadow-2xl border border-white/10">
        <div className="flex items-center gap-6">
          {/* Duration & Current Time */}
          <div className="text-white/70 text-sm min-w-[140px]">
            <div className="text-white/50 text-xs">Duration: {formatDuration(durationMs)}</div>
            <div className="font-mono">{formatTime(currentEvent.timestamp)}</div>
          </div>

          {/* Main Controls */}
          <div className="flex items-center gap-2">
            {/* Restart */}
            <button
              onClick={() => onIndexChange(0)}
              className="p-2 rounded-lg hover:bg-white/10 transition-colors"
              aria-label="Restart"
              title="Restart"
            >
              <RotateCcw className="w-5 h-5 text-white/70" />
            </button>

            {/* Step Back */}
            <button
              onClick={() => currentIndex > 0 && onIndexChange(currentIndex - 1)}
              disabled={currentIndex === 0}
              className="p-2 rounded-lg hover:bg-white/10 transition-colors disabled:opacity-30"
              aria-label="Step backward"
              title="Step backward (Left Arrow)"
            >
              <SkipBack className="w-5 h-5 text-white/70" />
            </button>

            {/* Play/Pause */}
            <button
              onClick={onPlayPause}
              className="p-3 rounded-full bg-white hover:bg-white/90 transition-colors"
              aria-label={isPlaying ? 'Pause' : 'Play'}
              title={`${isPlaying ? 'Pause' : 'Play'} (Space)`}
            >
              {isPlaying ? (
                <Pause className="w-6 h-6 text-gray-900" />
              ) : (
                <Play className="w-6 h-6 text-gray-900 ml-0.5" />
              )}
            </button>

            {/* Step Forward */}
            <button
              onClick={() => currentIndex < events.length - 1 && onIndexChange(currentIndex + 1)}
              disabled={currentIndex >= events.length - 1}
              className="p-2 rounded-lg hover:bg-white/10 transition-colors disabled:opacity-30"
              aria-label="Step forward"
              title="Step forward (Right Arrow)"
            >
              <SkipForward className="w-5 h-5 text-white/70" />
            </button>
          </div>

          {/* Scrubber */}
          <div className="flex items-center gap-3 min-w-[200px]">
            <input
              type="range"
              min="0"
              max={events.length - 1}
              value={currentIndex}
              onChange={(e) => onIndexChange(parseInt(e.target.value, 10))}
              className="w-full h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-white"
              aria-label="Timeline scrubber"
            />
            <span className="text-white/70 text-sm font-mono min-w-[60px]">
              {currentIndex + 1}/{events.length}
            </span>
          </div>

          {/* Speed */}
          <div className="flex items-center gap-1">
            {PLAYBACK_SPEEDS.map((speed) => (
              <button
                key={speed}
                onClick={() => onSpeedChange(speed)}
                className={`px-2 py-1 text-xs rounded transition-colors ${
                  playbackSpeed === speed
                    ? 'bg-white text-gray-900 font-medium'
                    : 'text-white/70 hover:bg-white/10'
                }`}
                aria-label={`${speed}x speed`}
              >
                {speed}x
              </button>
            ))}
          </div>

          {/* Divider */}
          <div className="w-px h-8 bg-white/20" />

          {/* Sidebar Toggle */}
          <button
            onClick={onToggleSidebar}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors"
            aria-label={sidebarOpen ? 'Hide sidebar' : 'Show sidebar'}
            title={`${sidebarOpen ? 'Hide' : 'Show'} sidebar (S)`}
          >
            {sidebarOpen ? (
              <PanelRightClose className="w-5 h-5 text-white/70" />
            ) : (
              <PanelRightOpen className="w-5 h-5 text-white/70" />
            )}
          </button>

          {/* Exit */}
          <button
            onClick={onExit}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors"
            aria-label="Exit fullscreen"
            title="Exit fullscreen (ESC)"
          >
            <X className="w-5 h-5 text-white/70" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
