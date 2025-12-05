'use client';

/**
 * Exercise Page - Interactive exercise with metrics tracking
 */

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  ArrowRight,
  Clock,
  CheckCircle2,
  Play,
  Pause,
  RotateCcw,
  Save,
  Target,
  AlertCircle,
  Download,
  FileText,
  FolderDown,
} from 'lucide-react';
import { useTrainingStore, ExerciseMetrics } from '@/lib/store';
import {
  getExerciseById,
  getNextExercise,
  exerciseContent,
  MetricField,
} from '@/lib/exercises';

const categoryLabels: Record<string, string> = {
  workflow: 'Your Workflow',
  time: 'Time',
  context: 'Context',
  quality: 'Quality',
  satisfaction: 'Satisfaction',
};

export default function ExercisePage({
  params,
}: {
  params: Promise<{ exerciseId: string }>;
}) {
  const { exerciseId } = use(params);
  const router = useRouter();

  const { exerciseMetrics, completedExercises, startExercise, completeExercise } =
    useTrainingStore();

  const [timerRunning, setTimerRunning] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [localMetrics, setLocalMetrics] = useState<ExerciseMetrics>({});
  const [showComparison, setShowComparison] = useState(false);

  const exercise = getExerciseById(exerciseId);
  const content = exerciseContent[exerciseId];
  const isCompleted = completedExercises.includes(exerciseId);
  const savedMetrics = exerciseMetrics[exerciseId];

  useEffect(() => {
    if (!exercise) {
      router.push('/');
      return;
    }

    // Load saved metrics if any
    if (savedMetrics) {
      setLocalMetrics(savedMetrics);
    }
  }, [exerciseId, router, savedMetrics, exercise]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (timerRunning) {
      interval = setInterval(() => {
        setElapsedSeconds((s) => s + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timerRunning]);

  if (!exercise || !content) return null;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleMetricChange = (key: string, value: unknown) => {
    setLocalMetrics((prev) => ({ ...prev, [key]: value }));
  };

  const handleStartTimer = () => {
    setTimerRunning(true);
    startExercise(exerciseId);
  };

  const handleStopTimer = () => {
    setTimerRunning(false);
    const minutes = Math.round(elapsedSeconds / 60);
    handleMetricChange('totalMinutes', minutes);
  };

  const handleResetTimer = () => {
    setTimerRunning(false);
    setElapsedSeconds(0);
  };

  const handleSave = () => {
    completeExercise(exerciseId, localMetrics);
    const next = getNextExercise(exerciseId);
    if (next) {
      router.push(`/exercise/${next.id}`);
    } else {
      router.push('/results');
    }
  };

  const nextExercise = getNextExercise(exerciseId);

  const renderMetricInput = (metric: MetricField) => {
    const value = localMetrics[metric.key as keyof ExerciseMetrics];

    if (metric.type === 'boolean') {
      return (
        <div className="flex gap-3">
          <button
            onClick={() => handleMetricChange(metric.key, true)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              value === true
                ? 'bg-green-500 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            Yes
          </button>
          <button
            onClick={() => handleMetricChange(metric.key, false)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              value === false
                ? 'bg-red-500 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            No
          </button>
        </div>
      );
    }

    if (metric.type === 'rating') {
      return (
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              onClick={() => handleMetricChange(metric.key, n)}
              className={`w-10 h-10 rounded-lg font-bold transition-colors ${
                value === n
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {n}
            </button>
          ))}
        </div>
      );
    }

    if (metric.type === 'text') {
      return (
        <input
          type="text"
          value={(value as string) || ''}
          onChange={(e) => handleMetricChange(metric.key, e.target.value)}
          placeholder="e.g., TypeScript, Python, Go..."
          className="w-48 bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      );
    }

    if (metric.type === 'select' && metric.options) {
      return (
        <div className="flex flex-wrap gap-2">
          {metric.options.map((option) => (
            <button
              key={option}
              onClick={() => handleMetricChange(metric.key, option)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                value === option
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {option}
            </button>
          ))}
        </div>
      );
    }

    // Default: number input
    return (
      <div className="flex items-center gap-2">
        <input
          type="number"
          value={(value as number) || ''}
          onChange={(e) => handleMetricChange(metric.key, parseInt(e.target.value) || 0)}
          min={metric.min}
          max={metric.max}
          className="w-24 bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {metric.suffix && <span className="text-gray-400">{metric.suffix}</span>}
      </div>
    );
  };

  // Group metrics by category
  const metricsByCategory = content.metrics.reduce(
    (acc, metric) => {
      if (!acc[metric.category]) acc[metric.category] = [];
      acc[metric.category].push(metric);
      return acc;
    },
    {} as Record<string, MetricField[]>
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white">
      {/* Header */}
      <div className="border-b border-gray-700/50">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <button
            onClick={() => router.push('/')}
            className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Training
          </button>

          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="text-3xl">{exercise.icon}</span>
                <h1 className="text-2xl font-bold">
                  Exercise {exercise.order}: {exercise.title}
                </h1>
                {isCompleted && (
                  <span className="inline-flex items-center gap-1 bg-green-500/20 text-green-400 px-2 py-1 rounded text-sm">
                    <CheckCircle2 className="w-4 h-4" />
                    Completed
                  </span>
                )}
              </div>
              <p className="text-gray-400">{exercise.subtitle}</p>
            </div>

            {/* Timer */}
            <div className="bg-gray-800/80 rounded-xl p-4 border border-gray-700/50">
              <div className="text-3xl font-mono font-bold text-center mb-2">
                {formatTime(elapsedSeconds)}
              </div>
              <div className="flex gap-2">
                {!timerRunning ? (
                  <button
                    onClick={handleStartTimer}
                    className="flex items-center gap-1 bg-green-500 hover:bg-green-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                  >
                    <Play className="w-4 h-4" />
                    Start
                  </button>
                ) : (
                  <button
                    onClick={handleStopTimer}
                    className="flex items-center gap-1 bg-yellow-500 hover:bg-yellow-600 text-black px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                  >
                    <Pause className="w-4 h-4" />
                    Stop
                  </button>
                )}
                <button
                  onClick={handleResetTimer}
                  className="flex items-center gap-1 bg-gray-700 hover:bg-gray-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>
              {localMetrics.totalMinutes !== undefined && localMetrics.totalMinutes > 0 && (
                <div className="text-xs text-green-400 text-center mt-2">
                  ✓ {localMetrics.totalMinutes} min captured
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Task */}
        <div className="bg-gray-800/50 rounded-2xl p-6 border border-gray-700/50 mb-8">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Target className="w-5 h-5 text-blue-400" />
            The Task
          </h2>
          <pre className="whitespace-pre-wrap text-gray-300 font-mono text-sm bg-gray-900/50 rounded-xl p-4">
            {content.task}
          </pre>
        </div>

        {/* Starter Kit - Only for spec-driven exercise */}
        {exerciseId === 'spec-driven' && (
          <div className="bg-gradient-to-r from-green-900/30 to-emerald-900/30 rounded-2xl p-6 border border-green-700/30 mb-8">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center">
                <FolderDown className="w-6 h-6 text-green-400" />
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-bold mb-1 text-green-400">
                  Step 1: Download Starter Kit
                </h2>
                <p className="text-sm text-gray-400 mb-4">
                  Download and extract to a new project directory before starting.
                </p>
                <a
                  href="/downloads/starter-kit.zip"
                  download
                  className="inline-flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-5 py-3 rounded-lg font-medium transition-colors"
                >
                  <Download className="w-5 h-5" />
                  Download Starter Kit (.zip)
                </a>
                <div className="mt-4 p-3 bg-gray-800/50 rounded-lg">
                  <p className="text-xs text-gray-400">
                    <strong className="text-gray-300">Contains:</strong> CLAUDE.md, STAGE_EXECUTION_FRAMEWORK.md, STAGE_PROOF_TEMPLATE.md, and scripts/
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    After extracting, run <code className="bg-gray-700 px-1 rounded">chmod +x scripts/*.sh</code> to make scripts executable.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="bg-gray-800/50 rounded-2xl p-6 border border-gray-700/50 mb-8">
          <h2 className="text-lg font-bold mb-4">Instructions</h2>
          <ol className="space-y-3">
            {content.instructions.map((instruction, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                  {i + 1}
                </span>
                <span className="text-gray-300">{instruction}</span>
              </li>
            ))}
          </ol>
        </div>

        {/* Tips */}
        {content.tips && (
          <div className="bg-yellow-900/20 border border-yellow-700/50 rounded-2xl p-6 mb-8">
            <h2 className="text-lg font-bold mb-3 flex items-center gap-2 text-yellow-400">
              <AlertCircle className="w-5 h-5" />
              Tips
            </h2>
            <ul className="space-y-2">
              {content.tips.map((tip, i) => (
                <li key={i} className="flex items-start gap-2 text-yellow-200/80">
                  <span className="text-yellow-400">•</span>
                  {tip}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Metrics Form */}
        <div className="bg-gray-800/50 rounded-2xl p-6 border border-gray-700/50 mb-8">
          <h2 className="text-lg font-bold mb-6">Track Your Metrics</h2>

          <div className="space-y-8">
            {Object.entries(metricsByCategory).map(([category, metrics]) => (
              <div key={category}>
                <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-4">
                  {categoryLabels[category]}
                </h3>
                <div className="space-y-4">
                  {metrics.map((metric) => (
                    <div
                      key={metric.key}
                      className="flex items-center justify-between py-3 border-b border-gray-700/50 last:border-0"
                    >
                      <label className="text-gray-300">{metric.label}</label>
                      {renderMetricInput(metric)}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Comparison Toggle (for spec-driven exercise) */}
        {exerciseId === 'spec-driven' && exerciseMetrics['baseline'] && (
          <div className="mb-8">
            <button
              onClick={() => setShowComparison(!showComparison)}
              className="text-blue-400 hover:text-blue-300 text-sm font-medium"
            >
              {showComparison ? 'Hide' : 'Show'} comparison with baseline
            </button>

            {showComparison && (
              <div className="mt-4 bg-gray-800/50 rounded-2xl p-6 border border-gray-700/50">
                <h3 className="font-bold mb-4">Baseline vs Spec-Driven</h3>
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-gray-400">
                      <th className="pb-2">Metric</th>
                      <th className="pb-2">Baseline</th>
                      <th className="pb-2">Spec-Driven</th>
                    </tr>
                  </thead>
                  <tbody className="text-gray-300">
                    <tr>
                      <td className="py-2">Time (min)</td>
                      <td>{exerciseMetrics['baseline'].totalMinutes || '-'}</td>
                      <td>{localMetrics.totalMinutes || '-'}</td>
                    </tr>
                    <tr>
                      <td className="py-2">Coverage</td>
                      <td>{exerciseMetrics['baseline'].testCoverage || '-'}%</td>
                      <td>{localMetrics.testCoverage || '-'}%</td>
                    </tr>
                    <tr>
                      <td className="py-2">Tests First</td>
                      <td>{exerciseMetrics['baseline'].testsFirst ? 'Yes' : 'No'}</td>
                      <td>{localMetrics.testsFirst ? 'Yes' : 'No'}</td>
                    </tr>
                    <tr>
                      <td className="py-2">Confidence</td>
                      <td>{exerciseMetrics['baseline'].confidence || '-'}/5</td>
                      <td>{localMetrics.confidence || '-'}/5</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => router.push('/')}
            className="text-gray-400 hover:text-white transition-colors"
          >
            Cancel
          </button>

          <button
            onClick={handleSave}
            className="inline-flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white font-medium px-6 py-3 rounded-xl transition-colors"
          >
            <Save className="w-5 h-5" />
            {isCompleted ? 'Update & Continue' : 'Save & Continue'}
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>

        {nextExercise && (
          <p className="text-center text-gray-500 text-sm mt-4">
            Next: {nextExercise.title}
          </p>
        )}
      </div>
    </div>
  );
}
