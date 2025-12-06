'use client';

/**
 * Playground Page - Interactive Lessons Hub
 * Stage 9.5: Interactive Documentation & Learning - Day 2
 *
 * Features:
 * - Browse all available lessons
 * - Track progress across lessons
 * - Filter by difficulty
 * - View completion stats
 */

import { useState } from 'react';
import { GraduationCap, Filter, TrendingUp } from 'lucide-react';
import { LessonCard } from '@/components/learning/lesson-card';
import { ALL_LESSONS, getLessonsByDifficulty } from '@/components/learning/lessons-registry';
import { useLearningStore } from '@/lib/stores/learning-store';
import { useRouter } from 'next/navigation';

export default function PlaygroundPage() {
  const router = useRouter();
  const [difficultyFilter, setDifficultyFilter] = useState<'all' | 'beginner' | 'intermediate' | 'advanced'>('all');

  const { completedLessons, lessonProgress, _hasHydrated } = useLearningStore();

  // Calculate statistics (use defaults before hydration to prevent mismatch)
  const totalLessons = ALL_LESSONS.length;
  const completedCount = _hasHydrated ? completedLessons.length : 0;
  const completionPercentage = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;

  // Filter lessons by difficulty
  const filteredLessons =
    difficultyFilter === 'all' ? ALL_LESSONS : getLessonsByDifficulty(difficultyFilter);

  const handleLessonClick = (lessonId: string) => {
    router.push(`/playground/${lessonId}`);
  };

  return (
    <div className="min-h-screen theme-gradient">
      {/* Header */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between">
            <div data-tour="playground-header">
              <div className="flex items-center gap-3 mb-2">
                <GraduationCap className="w-8 h-8 theme-accent-text" />
                <h1 className="text-3xl text-gray-900 dark:text-white">Interactive Playground</h1>
              </div>
              <p className="text-gray-600 dark:text-gray-300">
                Learn workflow orchestration through hands-on interactive lessons
              </p>
            </div>

            {/* Stats Card */}
            <div className="bg-[var(--theme-accent-light)] theme-rounded-lg p-4 border border-[var(--theme-accent)]/30 theme-shadow-md" data-tour="completion-stats">
              <div className="flex items-center gap-3">
                <TrendingUp className="w-6 h-6 theme-accent-text" />
                <div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">
                    {completedCount}/{totalLessons}
                  </div>
                  <div className="text-sm theme-accent-text">Lessons Completed</div>
                </div>
              </div>
              <div className="mt-2 h-2 bg-gray-200 dark:bg-gray-700 theme-rounded-full overflow-hidden">
                <div
                  className="h-full theme-accent"
                  style={{ width: `${completionPercentage}%` }}
                  data-testid="overall-progress-bar"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex items-center gap-4" data-tour="difficulty-filters">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
            <Filter className="w-4 h-4" />
            <span>Filter by difficulty:</span>
          </div>

          <div className="flex gap-2">
            {(['all', 'beginner', 'intermediate', 'advanced'] as const).map((level) => (
              <button
                key={level}
                onClick={() => setDifficultyFilter(level)}
                className={`px-4 py-2 text-sm font-medium theme-rounded-md transition-colors ${
                  difficultyFilter === level
                    ? 'theme-accent text-white theme-shadow-sm'
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
                data-testid={`filter-${level}`}
              >
                {level.charAt(0).toUpperCase() + level.slice(1)}
              </button>
            ))}
          </div>

          {difficultyFilter !== 'all' && (
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {filteredLessons.length} lesson{filteredLessons.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>

      {/* Lessons Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        {filteredLessons.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400">No lessons found for this difficulty level.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" data-testid="lessons-grid" data-tour="lessons-grid">
            {filteredLessons.map((lesson) => (
              <div key={lesson.id} data-lesson-id={lesson.id}>
                <LessonCard
                  lesson={lesson}
                  isCompleted={_hasHydrated && completedLessons.includes(lesson.id)}
                  progress={_hasHydrated ? (lessonProgress[lesson.id] || 0) : 0}
                  onClick={() => handleLessonClick(lesson.id)}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
