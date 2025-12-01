'use client';

/**
 * LessonCard - Displays lesson overview with metadata
 * Stage 9.5: Interactive Documentation & Learning - Day 2
 */

import { Clock, CheckCircle, Circle } from 'lucide-react';
import type { Lesson } from '@/types/learning';
import { cn } from '@/lib/utils';

interface LessonCardProps {
  lesson: Lesson;
  isCompleted: boolean;
  progress: number; // 0-100
  onClick: () => void;
  className?: string;
}

const difficultyColors = {
  beginner: 'bg-green-100 text-green-800',
  intermediate: 'bg-yellow-100 text-yellow-800',
  advanced: 'bg-red-100 text-red-800',
};

const difficultyLabels = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
};

/**
 * Interactive lesson card showing lesson metadata and progress
 *
 * Usage:
 * ```tsx
 * <LessonCard
 *   lesson={LESSON_HELLO_WORLD}
 *   isCompleted={false}
 *   progress={50}
 *   onClick={() => navigate('/playground/hello-world')}
 * />
 * ```
 */
export function LessonCard({ lesson, isCompleted, progress, onClick, className = '' }: LessonCardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'border border-gray-200 rounded-lg p-6 cursor-pointer transition-all hover:shadow-lg hover:border-blue-400',
        isCompleted && 'bg-green-50 border-green-200',
        className
      )}
      data-testid={`lesson-card-${lesson.id}`}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl font-bold text-gray-400">#{lesson.order}</span>
          {isCompleted ? (
            <CheckCircle className="w-6 h-6 text-green-600" data-testid="completed-icon" />
          ) : (
            <Circle className="w-6 h-6 text-gray-300" data-testid="incomplete-icon" />
          )}
        </div>

        <span className={cn('px-3 py-1 text-xs font-semibold rounded-full', difficultyColors[lesson.difficulty])}>
          {difficultyLabels[lesson.difficulty]}
        </span>
      </div>

      {/* Title & Description */}
      <h3 className="text-xl font-bold text-gray-900 mb-2">{lesson.title}</h3>
      <p className="text-sm text-gray-600 mb-4">{lesson.description}</p>

      {/* Metadata */}
      <div className="flex items-center gap-4 mb-4">
        <div className="flex items-center gap-1.5 text-sm text-gray-500">
          <Clock className="w-4 h-4" />
          <span>{lesson.estimatedTime} min</span>
        </div>
        <div className="text-sm text-gray-500">
          {lesson.objectives.length} objective{lesson.objectives.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Progress Bar */}
      {progress > 0 && progress < 100 && (
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
            <span>Progress</span>
            <span>{progress}%</span>
          </div>
          <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 transition-all duration-300"
              style={{ width: `${progress}%` }}
              data-testid="progress-bar"
            />
          </div>
        </div>
      )}

      {/* Completed Badge */}
      {isCompleted && (
        <div className="mt-4 flex items-center gap-2 text-sm font-semibold text-green-700">
          <CheckCircle className="w-4 h-4" />
          <span>Completed!</span>
        </div>
      )}
    </div>
  );
}
