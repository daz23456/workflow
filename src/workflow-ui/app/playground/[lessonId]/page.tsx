'use client';

/**
 * Individual Lesson Page - Interactive Lesson Viewer
 * Stage 9.5: Interactive Documentation & Learning - Day 2
 */

import { useParams, useRouter } from 'next/navigation';
import { LessonViewer } from '@/components/learning/lesson-viewer';
import { getLessonById } from '@/components/learning/lessons-registry';
import { useLearningStore } from '@/lib/stores/learning-store';
import { AlertCircle } from 'lucide-react';

export default function LessonPage() {
  const params = useParams();
  const router = useRouter();
  const lessonId = params.lessonId as string;

  const { completeLesson, lessonProgress, _hasHydrated } = useLearningStore();
  const lesson = getLessonById(lessonId);

  if (!lesson) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Lesson Not Found</h1>
          <p className="text-gray-600 mb-6">
            The lesson "{lessonId}" does not exist.
          </p>
          <button
            onClick={() => router.push('/playground')}
            className="px-6 py-3 bg-blue-500 text-white rounded-md font-semibold hover:bg-blue-600"
          >
            Back to Playground
          </button>
        </div>
      </div>
    );
  }

  const handleComplete = () => {
    completeLesson(lesson.id);
    // Navigate back to playground
    router.push('/playground');
  };

  const handleExit = () => {
    router.push('/playground');
  };

  return (
    <div className="h-screen">
      <LessonViewer
        lesson={lesson}
        onComplete={handleComplete}
        onExit={handleExit}
        initialProgress={_hasHydrated ? (lessonProgress[lesson.id] || 0) : 0}
      />
    </div>
  );
}
