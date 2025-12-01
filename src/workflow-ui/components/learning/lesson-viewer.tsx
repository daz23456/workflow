'use client';

/**
 * LessonViewer - Interactive Step-by-Step Lesson Interface
 * Stage 9.5: Interactive Documentation & Learning - Day 2
 *
 * Features:
 * - Step-by-step lesson navigation
 * - Live YAML code editing with CodeMirror
 * - Progress tracking
 * - Syntax validation
 * - Success criteria checklist
 */

import { useState } from 'react';
import { ChevronLeft, ChevronRight, CheckCircle, Circle, Lightbulb, Code, BookOpen } from 'lucide-react';
import type { Lesson } from '@/types/learning';
import { CodeEditor } from './code-editor';
import { cn } from '@/lib/utils';

interface LessonViewerProps {
  lesson: Lesson;
  onComplete: () => void;
  onExit: () => void;
  initialProgress?: number;
  className?: string;
}

/**
 * Interactive lesson viewer with step-by-step guide and live code editor
 *
 * Usage:
 * ```tsx
 * <LessonViewer
 *   lesson={LESSON_HELLO_WORLD}
 *   onComplete={() => markLessonComplete('hello-world')}
 *   onExit={() => router.push('/playground')}
 * />
 * ```
 */
export function LessonViewer({ lesson, onComplete, onExit, initialProgress = 0, className = '' }: LessonViewerProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [yamlCode, setYamlCode] = useState(lesson.yaml);
  const [showHints, setShowHints] = useState(false);
  const [checkedCriteria, setCheckedCriteria] = useState<Set<number>>(new Set());

  const currentStep = lesson.content.steps[currentStepIndex];
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === lesson.content.steps.length - 1;
  const progress = ((currentStepIndex + 1) / lesson.content.steps.length) * 100;

  const handleNext = () => {
    if (!isLastStep) {
      setCurrentStepIndex(currentStepIndex + 1);
      setShowHints(false);
    }
  };

  const handlePrevious = () => {
    if (!isFirstStep) {
      setCurrentStepIndex(currentStepIndex - 1);
      setShowHints(false);
    }
  };

  const handleToggleCriteria = (index: number) => {
    const newChecked = new Set(checkedCriteria);
    if (newChecked.has(index)) {
      newChecked.delete(index);
    } else {
      newChecked.add(index);
    }
    setCheckedCriteria(newChecked);
  };

  const allCriteriaChecked = checkedCriteria.size === lesson.successCriteria.length;

  const handleCompleteLesson = () => {
    onComplete();
  };

  return (
    <div className={cn('flex flex-col h-full bg-white', className)} data-testid="lesson-viewer">
      {/* Header */}
      <div className="border-b border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-1">{lesson.title}</h1>
            <p className="text-sm text-gray-600">{lesson.description}</p>
          </div>
          <button
            onClick={onExit}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            data-testid="exit-button"
          >
            Exit Lesson
          </button>
        </div>

        {/* Progress Bar */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 transition-all duration-300"
              style={{ width: `${progress}%` }}
              data-testid="lesson-progress-bar"
            />
          </div>
          <span className="text-sm font-medium text-gray-700">
            Step {currentStepIndex + 1} of {lesson.content.steps.length}
          </span>
        </div>
      </div>

      {/* Main Content - Split View */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Instructions */}
        <div className="w-1/2 border-r border-gray-200 overflow-y-auto p-6">
          <div className="max-w-2xl">
            {/* Step Title */}
            <div className="flex items-center gap-2 mb-4">
              <BookOpen className="w-5 h-5 text-blue-500" />
              <h2 className="text-xl font-bold text-gray-900">{currentStep.title}</h2>
            </div>

            {/* Step Description */}
            <p className="text-gray-700 mb-6">{currentStep.description}</p>

            {/* Code Example (if present) */}
            {currentStep.codeExample && (
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-2">
                  <Code className="w-4 h-4 text-gray-500" />
                  <h3 className="text-sm font-semibold text-gray-700">Code Example:</h3>
                </div>
                <pre className="bg-gray-50 border border-gray-200 rounded-lg p-4 overflow-x-auto text-sm font-mono text-gray-800">
                  {currentStep.codeExample}
                </pre>
              </div>
            )}

            {/* Tips (collapsible) */}
            {currentStep.tips && currentStep.tips.length > 0 && (
              <div className="mb-6">
                <button
                  onClick={() => setShowHints(!showHints)}
                  className="flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-700 mb-2"
                  data-testid="toggle-hints-button"
                >
                  <Lightbulb className="w-4 h-4" />
                  <span>{showHints ? 'Hide' : 'Show'} Hints ({currentStep.tips.length})</span>
                </button>
                {showHints && (
                  <ul className="space-y-2" data-testid="hints-list">
                    {currentStep.tips.map((tip, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm text-gray-600">
                        <span className="text-blue-500 mt-0.5">•</span>
                        <span>{tip}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex items-center gap-3 mt-8">
              <button
                onClick={handlePrevious}
                disabled={isFirstStep}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-md font-medium transition-colors',
                  isFirstStep
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                )}
                data-testid="previous-step-button"
              >
                <ChevronLeft className="w-4 h-4" />
                Previous
              </button>

              <button
                onClick={handleNext}
                disabled={isLastStep}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-md font-medium transition-colors',
                  isLastStep
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-blue-500 text-white hover:bg-blue-600'
                )}
                data-testid="next-step-button"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Right: Live Code Editor & Success Criteria */}
        <div className="w-1/2 flex flex-col overflow-hidden">
          {/* Code Editor */}
          <div className="flex-1 overflow-hidden p-6 pb-0">
            <div className="h-full flex flex-col">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Live YAML Editor:</h3>
              <CodeEditor value={yamlCode} onChange={setYamlCode} height="100%" />
            </div>
          </div>

          {/* Success Criteria Checklist */}
          <div className="border-t border-gray-200 p-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Success Criteria:</h3>
            <ul className="space-y-2 mb-4" data-testid="success-criteria-list">
              {lesson.successCriteria.map((criteria, index) => (
                <li key={index} className="flex items-start gap-2">
                  <button
                    onClick={() => handleToggleCriteria(index)}
                    className="flex-shrink-0 mt-0.5"
                    aria-label={`Toggle ${criteria}`}
                    data-testid={`criteria-checkbox-${index}`}
                  >
                    {checkedCriteria.has(index) ? (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    ) : (
                      <Circle className="w-5 h-5 text-gray-300" />
                    )}
                  </button>
                  <span
                    className={cn(
                      'text-sm',
                      checkedCriteria.has(index) ? 'text-gray-900 font-medium' : 'text-gray-600'
                    )}
                  >
                    {criteria}
                  </span>
                </li>
              ))}
            </ul>

            {/* Complete Lesson Button */}
            <button
              onClick={handleCompleteLesson}
              disabled={!allCriteriaChecked}
              className={cn(
                'w-full px-4 py-3 rounded-md font-semibold transition-colors',
                allCriteriaChecked
                  ? 'bg-green-500 text-white hover:bg-green-600'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              )}
              data-testid="complete-lesson-button"
            >
              {allCriteriaChecked ? '✓ Complete Lesson' : 'Complete All Criteria to Continue'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
