'use client';

/**
 * Spec-Driven Development Training - Main Page
 * Interactive training program for engineers skeptical of process
 */

import { useRouter } from 'next/navigation';
import {
  Trophy,
  Clock,
  CheckCircle2,
  ArrowRight,
  Target,
  Zap,
  RefreshCw,
  Award,
  Users,
  BarChart3,
  Sparkles,
} from 'lucide-react';
import { useTrainingStore, getQuarterlyProgress } from '@/lib/store';
import { ALL_EXERCISES, getTotalEstimatedTime } from '@/lib/exercises';

export default function TrainingPage() {
  const router = useRouter();
  const { completedExercises, certificateIssued } = useTrainingStore();
  const quarterlyProgress = getQuarterlyProgress();

  const totalTime = getTotalEstimatedTime();
  const completedCount = completedExercises.length;
  const totalExercises = ALL_EXERCISES.length;

  const exerciseIcons: Record<string, React.ReactNode> = {
    baseline: <BarChart3 className="w-6 h-6" />,
    'spec-driven': <Target className="w-6 h-6" />,
    'context-recovery': <RefreshCw className="w-6 h-6" />,
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-900 to-gray-800">
      {/* Hero Section */}
      <div className="max-w-5xl mx-auto px-4 pt-16 pb-12">
        <div className="text-center">
          <div className="inline-flex items-center gap-2 bg-yellow-500/20 text-yellow-400 px-4 py-2 rounded-full text-sm font-medium mb-6">
            <Zap className="w-4 h-4" />
            <span>2 hours to prove it yourself</span>
          </div>

          <h1 className="text-5xl md:text-6xl font-bold mb-4 text-white">
            Skip the Slides.{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">
              Prove It Yourself.
            </span>
          </h1>

          <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-8">
            We&apos;re not going to lecture you about why spec-driven development
            works. You&apos;re going to complete 3 exercises, track your own metrics,
            and decide for yourself.
          </p>

          {/* Quick Stats */}
          <div className="flex justify-center gap-8 md:gap-16 mb-12">
            <div className="text-center">
              <div className="text-4xl font-bold text-white">{totalTime}</div>
              <div className="text-sm text-gray-400">minutes total</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-white">{totalExercises}</div>
              <div className="text-sm text-gray-400">exercises</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-white flex items-center justify-center gap-1">
                <Sparkles className="w-6 h-6 text-yellow-400" />1
              </div>
              <div className="text-sm text-gray-400">certificate</div>
            </div>
          </div>

          {completedCount === 0 && (
            <button
              onClick={() => router.push('/exercise/baseline')}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-bold text-lg px-8 py-4 rounded-xl transition-all shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40"
            >
              Start the Challenge
              <ArrowRight className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      {completedCount > 0 && (
        <div className="max-w-3xl mx-auto px-4 mb-12">
          <div className="bg-gray-800/50 backdrop-blur rounded-2xl p-6 border border-gray-700/50">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-gray-400">Your Progress</span>
              <span className="text-sm font-bold text-blue-400">
                {completedCount}/{totalExercises} Exercises
              </span>
            </div>
            <div className="h-3 bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 transition-all duration-500"
                style={{ width: `${(completedCount / totalExercises) * 100}%` }}
              />
            </div>
            {completedCount === totalExercises && !certificateIssued && (
              <div className="mt-6 text-center">
                <button
                  onClick={() => router.push('/certificate')}
                  className="inline-flex items-center gap-2 bg-gradient-to-r from-yellow-500 to-orange-500 text-black font-bold px-6 py-3 rounded-xl hover:opacity-90 transition-opacity shadow-lg shadow-yellow-500/25"
                >
                  <Award className="w-5 h-5" />
                  Claim Your Certificate
                </button>
              </div>
            )}
            {certificateIssued && (
              <div className="mt-4 text-center">
                <button
                  onClick={() => router.push('/certificate')}
                  className="text-yellow-400 hover:text-yellow-300 font-medium"
                >
                  View Your Certificate →
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Exercises Grid */}
      <div className="max-w-5xl mx-auto px-4 pb-16">
        <h2 className="text-2xl font-bold mb-6 text-center text-white">The Challenge</h2>

        <div className="grid gap-6">
          {ALL_EXERCISES.map((exercise, index) => {
            const isCompleted = completedExercises.includes(exercise.id);
            const isLocked =
              index > 0 && !completedExercises.includes(ALL_EXERCISES[index - 1].id);
            const isCurrent = !isCompleted && !isLocked;

            return (
              <div
                key={exercise.id}
                className={`relative rounded-2xl border transition-all ${
                  isCompleted
                    ? 'bg-green-900/20 border-green-700/50'
                    : isCurrent
                    ? 'bg-gray-800/50 border-blue-500 shadow-lg shadow-blue-500/10'
                    : 'bg-gray-800/30 border-gray-700/50 opacity-60'
                }`}
              >
                <div className="p-6">
                  <div className="flex items-start gap-4">
                    {/* Exercise Number */}
                    <div
                      className={`flex-shrink-0 w-14 h-14 rounded-xl flex items-center justify-center ${
                        isCompleted
                          ? 'bg-green-500 text-white'
                          : isCurrent
                          ? 'bg-gradient-to-br from-blue-500 to-cyan-500 text-white'
                          : 'bg-gray-700 text-gray-400'
                      }`}
                    >
                      {isCompleted ? (
                        <CheckCircle2 className="w-7 h-7" />
                      ) : (
                        exerciseIcons[exercise.id]
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-3 mb-2">
                        <h3 className="text-xl font-bold text-white">{exercise.title}</h3>
                        <span className="text-sm text-gray-400">{exercise.subtitle}</span>
                        <span className="ml-auto flex items-center gap-1 text-sm text-gray-400">
                          <Clock className="w-4 h-4" />
                          {exercise.estimatedTime} min
                        </span>
                      </div>

                      <p className="text-gray-400 mb-4">{exercise.description}</p>

                      <div className="flex flex-wrap items-center gap-4">
                        <div className="flex items-center gap-2 text-sm">
                          <Target className="w-4 h-4 text-blue-400" />
                          <span className="text-gray-300">
                            Proves: {exercise.whatYoullProve}
                          </span>
                        </div>

                        {isCurrent && (
                          <button
                            onClick={() => router.push(`/exercise/${exercise.id}`)}
                            className="ml-auto inline-flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white font-medium px-5 py-2.5 rounded-xl transition-colors"
                          >
                            Start Exercise
                            <ArrowRight className="w-4 h-4" />
                          </button>
                        )}

                        {isCompleted && (
                          <button
                            onClick={() => router.push(`/exercise/${exercise.id}`)}
                            className="ml-auto inline-flex items-center gap-2 text-green-400 hover:text-green-300 font-medium transition-colors"
                          >
                            Review Results
                            <ArrowRight className="w-4 h-4" />
                          </button>
                        )}

                        {isLocked && (
                          <span className="ml-auto text-sm text-gray-500">
                            Complete previous exercise to unlock
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Results Link */}
        {completedCount === totalExercises && (
          <div className="mt-8 text-center">
            <button
              onClick={() => router.push('/results')}
              className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 font-medium"
            >
              <BarChart3 className="w-5 h-5" />
              View Your Full Results Comparison
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Quarterly Objective Section */}
      <div className="bg-gray-800/30 border-t border-gray-700/50">
        <div className="max-w-5xl mx-auto px-4 py-16">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold mb-2 text-white">Quarterly Objective</h2>
            <p className="text-gray-400">
              Evaluate and optionally adopt spec-driven development
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-4">
            {[
              {
                label: 'Complete Training',
                done: quarterlyProgress.training,
                icon: <Trophy className="w-5 h-5" />,
              },
              {
                label: 'Apply to Real Task',
                done: quarterlyProgress.realProject,
                icon: <Target className="w-5 h-5" />,
              },
              {
                label: 'Document Findings',
                done: quarterlyProgress.documented,
                icon: <BarChart3 className="w-5 h-5" />,
              },
              {
                label: 'Share with Team',
                done: quarterlyProgress.shared,
                icon: <Users className="w-5 h-5" />,
              },
            ].map((item, i) => (
              <div
                key={i}
                className={`rounded-xl p-4 border transition-all ${
                  item.done
                    ? 'bg-green-900/20 border-green-700/50'
                    : 'bg-gray-800/50 border-gray-700/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      item.done ? 'bg-green-500 text-white' : 'bg-gray-700 text-gray-400'
                    }`}
                  >
                    {item.done ? <CheckCircle2 className="w-5 h-5" /> : item.icon}
                  </div>
                  <span className={item.done ? 'text-green-400 font-medium' : 'text-gray-300'}>
                    {item.label}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 text-center">
            <div className="inline-flex items-center gap-3 text-sm text-gray-400">
              <span>Objective Progress:</span>
              <div className="w-40 h-2.5 bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-green-500 to-emerald-400 transition-all"
                  style={{ width: `${quarterlyProgress.percentage}%` }}
                />
              </div>
              <span className="font-medium text-white">
                {Math.round(quarterlyProgress.percentage)}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom CTA */}
      <div className="max-w-5xl mx-auto px-4 py-12 text-center">
        <p className="text-gray-400 mb-4">
          <span className="font-semibold text-white">Success</span> = You made an
          informed decision based on your own data.
        </p>
        <p className="text-sm text-gray-500">
          We&apos;re not mandating adoption. We&apos;re asking you to try it, measure
          it, and decide for yourself.
        </p>
      </div>
    </div>
  );
}
