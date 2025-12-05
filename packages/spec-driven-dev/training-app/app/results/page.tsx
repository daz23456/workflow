'use client';

/**
 * Results Page - Compare baseline vs spec-driven metrics
 */

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import confetti from 'canvas-confetti';
import {
  ArrowLeft,
  ArrowRight,
  Award,
  TrendingUp,
  TrendingDown,
  Minus,
  CheckCircle2,
  XCircle,
  Clock,
  Target,
  Shield,
  Zap,
  FileText,
  Download,
  Rocket,
  BookOpen,
  GitBranch,
  ExternalLink,
  PartyPopper,
  MessageCircleQuestion,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useTrainingStore } from '@/lib/store';
import { config } from '@/lib/config';

export default function ResultsPage() {
  const router = useRouter();
  const { exerciseMetrics, completedExercises, certificateIssued } = useTrainingStore();
  const confettiFired = useRef(false);

  const baseline = exerciseMetrics['baseline'];
  const specDriven = exerciseMetrics['spec-driven'];
  const contextRecovery = exerciseMetrics['context-recovery'];

  const allComplete =
    completedExercises.includes('baseline') &&
    completedExercises.includes('spec-driven') &&
    completedExercises.includes('context-recovery');

  // Fire confetti on first load
  useEffect(() => {
    if (allComplete && !confettiFired.current) {
      confettiFired.current = true;
      // Fire confetti from both sides
      const end = Date.now() + 2000;
      const colors = ['#22c55e', '#3b82f6', '#f59e0b', '#ec4899'];

      (function frame() {
        confetti({
          particleCount: 3,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors: colors,
        });
        confetti({
          particleCount: 3,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors: colors,
        });

        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      })();
    }
  }, [allComplete]);

  if (!allComplete) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Complete All Exercises First</h1>
          <p className="text-gray-400 mb-6">
            You need to complete all 3 exercises to see your results.
          </p>
          <button
            onClick={() => router.push('/')}
            className="text-blue-400 hover:text-blue-300"
          >
            ← Back to Training
          </button>
        </div>
      </div>
    );
  }

  // Calculate comparisons
  const timeDiff =
    baseline?.totalMinutes && specDriven?.totalMinutes
      ? specDriven.totalMinutes - baseline.totalMinutes
      : null;

  const coverageDiff =
    baseline?.testCoverage !== undefined && specDriven?.testCoverage !== undefined
      ? specDriven.testCoverage - baseline.testCoverage
      : null;

  const confidenceDiff =
    baseline?.confidence !== undefined && specDriven?.confidence !== undefined
      ? specDriven.confidence - baseline.confidence
      : null;

  const recoveryImprovement =
    contextRecovery?.contextRecoveryMinutes && contextRecovery?.contextRecoverySeconds
      ? (contextRecovery.contextRecoveryMinutes * 60 - contextRecovery.contextRecoverySeconds) /
        (contextRecovery.contextRecoveryMinutes * 60)
      : null;

  const renderTrend = (diff: number | null, higherIsBetter: boolean = true) => {
    if (diff === null) return <Minus className="w-5 h-5 text-gray-400" />;
    if (diff === 0) return <Minus className="w-5 h-5 text-gray-400" />;

    const isPositive = higherIsBetter ? diff > 0 : diff < 0;
    if (isPositive) {
      return <TrendingUp className="w-5 h-5 text-green-400" />;
    }
    return <TrendingDown className="w-5 h-5 text-red-400" />;
  };

  const renderBoolean = (value: boolean | undefined) => {
    if (value === undefined) return <Minus className="w-5 h-5 text-gray-400" />;
    return value ? (
      <CheckCircle2 className="w-5 h-5 text-green-400" />
    ) : (
      <XCircle className="w-5 h-5 text-red-400" />
    );
  };

  // Expandable concern item component
  const ConcernItem = ({ question, answer }: { question: string; answer: string }) => {
    const [isOpen, setIsOpen] = useState(false);
    return (
      <div className="border border-gray-700/50 rounded-lg overflow-hidden">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-700/30 transition-colors"
        >
          <span className="font-medium text-gray-200">{question}</span>
          {isOpen ? (
            <ChevronUp className="w-5 h-5 text-gray-400 flex-shrink-0" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0" />
          )}
        </button>
        {isOpen && (
          <div className="px-4 pb-4 text-gray-400 text-sm leading-relaxed">
            {answer}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white">
      {/* Celebration Header */}
      <div className="bg-gradient-to-r from-green-900/30 via-blue-900/30 to-purple-900/30 border-b border-gray-700/50">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <button
            onClick={() => router.push('/')}
            className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Training
          </button>

          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-500 rounded-2xl mb-4">
              <PartyPopper className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-4xl font-bold mb-2">You Did It!</h1>
            <p className="text-xl text-gray-300 mb-6">
              All 3 exercises complete. Here&apos;s what you proved.
            </p>

            {!certificateIssued && (
              <button
                onClick={() => router.push('/certificate')}
                className="inline-flex items-center gap-3 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 text-black font-bold text-lg px-8 py-4 rounded-xl transition-all shadow-lg shadow-yellow-500/25 hover:shadow-yellow-500/40 hover:scale-105"
              >
                <Award className="w-6 h-6" />
                Claim Your Certificate
                <ArrowRight className="w-6 h-6" />
              </button>
            )}
            {certificateIssued && (
              <button
                onClick={() => router.push('/certificate')}
                className="inline-flex items-center gap-2 bg-green-500/20 text-green-400 font-medium px-6 py-3 rounded-xl border border-green-500/30 hover:bg-green-500/30 transition-colors"
              >
                <CheckCircle2 className="w-5 h-5" />
                View Your Certificate
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Key Insights */}
        <div className="grid md:grid-cols-3 gap-4 mb-12">
          {/* Time Comparison */}
          <div className="bg-gray-800/50 rounded-2xl p-6 border border-gray-700/50">
            <div className="flex items-center gap-2 mb-3">
              <Clock className="w-5 h-5 text-blue-400" />
              <span className="text-sm text-gray-400">Time Investment</span>
            </div>
            <div className="text-3xl font-bold mb-1">
              {timeDiff !== null ? (
                <>
                  {timeDiff > 0 ? '+' : ''}
                  {timeDiff} min
                </>
              ) : (
                '—'
              )}
            </div>
            <div className="text-sm text-gray-400">
              {timeDiff !== null && timeDiff > 0
                ? 'Setup overhead (one-time cost)'
                : timeDiff !== null && timeDiff < 0
                ? 'Time saved with framework'
                : 'Compare time spent'}
            </div>
          </div>

          {/* Coverage Improvement */}
          <div className="bg-gray-800/50 rounded-2xl p-6 border border-gray-700/50">
            <div className="flex items-center gap-2 mb-3">
              <Shield className="w-5 h-5 text-green-400" />
              <span className="text-sm text-gray-400">Coverage Change</span>
            </div>
            <div className="text-3xl font-bold mb-1">
              {coverageDiff !== null ? (
                <>
                  {coverageDiff > 0 ? '+' : ''}
                  {coverageDiff}%
                </>
              ) : (
                '—'
              )}
            </div>
            <div className="text-sm text-gray-400">
              {specDriven?.testCoverage !== undefined
                ? `${specDriven.testCoverage}% with framework`
                : 'Coverage improvement'}
            </div>
          </div>

          {/* Context Recovery */}
          <div className="bg-gray-800/50 rounded-2xl p-6 border border-gray-700/50">
            <div className="flex items-center gap-2 mb-3">
              <Zap className="w-5 h-5 text-yellow-400" />
              <span className="text-sm text-gray-400">Recovery Speed</span>
            </div>
            <div className="text-3xl font-bold mb-1">
              {recoveryImprovement !== null ? (
                <>{Math.round(recoveryImprovement * 100)}% faster</>
              ) : (
                '—'
              )}
            </div>
            <div className="text-sm text-gray-400">
              {contextRecovery?.contextRecoverySeconds !== undefined
                ? `${contextRecovery.contextRecoverySeconds}s vs ${contextRecovery.contextRecoveryMinutes} min`
                : 'Context recovery time'}
            </div>
          </div>
        </div>

        {/* Detailed Comparison Table */}
        <div className="bg-gray-800/50 rounded-2xl border border-gray-700/50 overflow-hidden mb-12">
          <div className="p-6 border-b border-gray-700/50">
            <h2 className="text-xl font-bold">Detailed Comparison</h2>
          </div>

          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-700/50 text-left">
                <th className="px-6 py-4 text-gray-400 font-medium">Metric</th>
                <th className="px-6 py-4 text-gray-400 font-medium">Baseline</th>
                <th className="px-6 py-4 text-gray-400 font-medium">Spec-Driven</th>
                <th className="px-6 py-4 text-gray-400 font-medium">Trend</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-700/50">
                <td className="px-6 py-4 text-gray-300">Total Time (min)</td>
                <td className="px-6 py-4">{baseline?.totalMinutes ?? '—'}</td>
                <td className="px-6 py-4">{specDriven?.totalMinutes ?? '—'}</td>
                <td className="px-6 py-4">{renderTrend(timeDiff, false)}</td>
              </tr>
              <tr className="border-b border-gray-700/50">
                <td className="px-6 py-4 text-gray-300">Re-explanations Needed</td>
                <td className="px-6 py-4">{baseline?.reExplanations ?? '—'}</td>
                <td className="px-6 py-4">{specDriven?.reExplanations ?? '—'}</td>
                <td className="px-6 py-4">
                  {renderTrend(
                    baseline?.reExplanations !== undefined &&
                      specDriven?.reExplanations !== undefined
                      ? specDriven.reExplanations - baseline.reExplanations
                      : null,
                    false
                  )}
                </td>
              </tr>
              <tr className="border-b border-gray-700/50">
                <td className="px-6 py-4 text-gray-300">Tests Written First</td>
                <td className="px-6 py-4">{renderBoolean(baseline?.testsFirst)}</td>
                <td className="px-6 py-4">{renderBoolean(specDriven?.testsFirst)}</td>
                <td className="px-6 py-4">
                  {specDriven?.testsFirst && !baseline?.testsFirst ? (
                    <TrendingUp className="w-5 h-5 text-green-400" />
                  ) : (
                    <Minus className="w-5 h-5 text-gray-400" />
                  )}
                </td>
              </tr>
              <tr className="border-b border-gray-700/50">
                <td className="px-6 py-4 text-gray-300">Test Coverage (%)</td>
                <td className="px-6 py-4">
                  {baseline?.testCoverage !== undefined ? `${baseline.testCoverage}%` : '—'}
                </td>
                <td className="px-6 py-4">
                  {specDriven?.testCoverage !== undefined ? `${specDriven.testCoverage}%` : '—'}
                </td>
                <td className="px-6 py-4">{renderTrend(coverageDiff)}</td>
              </tr>
              <tr className="border-b border-gray-700/50">
                <td className="px-6 py-4 text-gray-300">Confidence (1-5)</td>
                <td className="px-6 py-4">{baseline?.confidence ?? '—'}</td>
                <td className="px-6 py-4">{specDriven?.confidence ?? '—'}</td>
                <td className="px-6 py-4">{renderTrend(confidenceDiff)}</td>
              </tr>
              <tr className="border-b border-gray-700/50">
                <td className="px-6 py-4 text-gray-300">Production Ready</td>
                <td className="px-6 py-4">{renderBoolean(baseline?.productionReady)}</td>
                <td className="px-6 py-4">{renderBoolean(specDriven?.productionReady)}</td>
                <td className="px-6 py-4">
                  {specDriven?.productionReady && !baseline?.productionReady ? (
                    <TrendingUp className="w-5 h-5 text-green-400" />
                  ) : (
                    <Minus className="w-5 h-5 text-gray-400" />
                  )}
                </td>
              </tr>
              <tr>
                <td className="px-6 py-4 text-gray-300">Quality Gates Passed</td>
                <td className="px-6 py-4 text-gray-500">N/A</td>
                <td className="px-6 py-4">{renderBoolean(specDriven?.gatesPassed)}</td>
                <td className="px-6 py-4">
                  {specDriven?.gatesPassed ? (
                    <TrendingUp className="w-5 h-5 text-green-400" />
                  ) : (
                    <Minus className="w-5 h-5 text-gray-400" />
                  )}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Context Recovery Section */}
        <div className="bg-gray-800/50 rounded-2xl border border-gray-700/50 p-6 mb-12">
          <h2 className="text-xl font-bold mb-4">Context Recovery Comparison</h2>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-red-900/20 border border-red-700/50 rounded-xl p-4">
              <h3 className="font-medium text-red-400 mb-2">Without Framework</h3>
              <div className="text-3xl font-bold">
                {contextRecovery?.contextRecoveryMinutes ?? '—'} min
              </div>
              <p className="text-sm text-gray-400 mt-1">
                Time to explain project and get productive
              </p>
            </div>

            <div className="bg-green-900/20 border border-green-700/50 rounded-xl p-4">
              <h3 className="font-medium text-green-400 mb-2">With Framework</h3>
              <div className="text-3xl font-bold">
                {contextRecovery?.contextRecoverySeconds ?? '—'} sec
              </div>
              <p className="text-sm text-gray-400 mt-1">
                Time to read state file and continue
              </p>
            </div>
          </div>

          {recoveryImprovement !== null && (
            <div className="mt-6 p-4 bg-blue-900/20 border border-blue-700/50 rounded-xl">
              <div className="flex items-center gap-2">
                <Target className="w-5 h-5 text-blue-400" />
                <span className="font-medium">Weekly Impact</span>
              </div>
              <p className="text-gray-400 mt-2">
                If you lose context 3× per day,{' '}
                <span className="text-white font-medium">
                  you could save{' '}
                  {Math.round(
                    ((contextRecovery?.contextRecoveryMinutes ?? 0) -
                      (contextRecovery?.contextRecoverySeconds ?? 0) / 60) *
                      3 *
                      5
                  )}{' '}
                  minutes per week
                </span>{' '}
                with the framework.
              </p>
            </div>
          )}
        </div>

        {/* Your Verdict */}
        <div className="bg-gray-800/50 rounded-2xl border border-gray-700/50 p-6 mb-8">
          <h2 className="text-xl font-bold mb-4">Your Verdict</h2>

          <p className="text-gray-400 mb-6">
            Based on your own data, was spec-driven development worth it?
          </p>

          <div className="grid md:grid-cols-3 gap-4">
            <div className="bg-gray-700/30 rounded-xl p-4 text-center">
              <div className="text-2xl mb-2">🎯</div>
              <div className="font-medium">Quality</div>
              <div className="text-sm text-gray-400 mt-1">
                {coverageDiff !== null && coverageDiff > 0
                  ? `+${coverageDiff}% coverage`
                  : 'Check your numbers'}
              </div>
            </div>
            <div className="bg-gray-700/30 rounded-xl p-4 text-center">
              <div className="text-2xl mb-2">⚡</div>
              <div className="font-medium">Speed</div>
              <div className="text-sm text-gray-400 mt-1">
                {recoveryImprovement !== null
                  ? `${Math.round(recoveryImprovement * 100)}% faster recovery`
                  : 'Check your numbers'}
              </div>
            </div>
            <div className="bg-gray-700/30 rounded-xl p-4 text-center">
              <div className="text-2xl mb-2">💪</div>
              <div className="font-medium">Confidence</div>
              <div className="text-sm text-gray-400 mt-1">
                {confidenceDiff !== null && confidenceDiff > 0
                  ? `+${confidenceDiff} points`
                  : 'Check your numbers'}
              </div>
            </div>
          </div>
        </div>

        {/* Want to Know More */}
        <div className="bg-gray-800/50 rounded-2xl border border-gray-700/50 p-6 mb-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center">
              <MessageCircleQuestion className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Want to Know More?</h2>
              <p className="text-sm text-gray-400">Practical questions about making this work</p>
            </div>
          </div>

          <div className="space-y-3">
            <ConcernItem
              question="How do I adapt this for my specific tech stack?"
              answer="The framework is language-agnostic. CLAUDE.md captures YOUR stack, YOUR patterns, YOUR constraints. The quality gates script can be customized for any build system - Jest, pytest, xUnit, Go test, whatever. Start with the template, then make it yours."
            />
            <ConcernItem
              question="What if my project doesn't fit the stage model?"
              answer="Stages are flexible - they're just focused units of work. Bug fix? That's a stage. Refactor? Stage. Experiment? Stage with MINIMAL profile. The framework adapts to your work, not the other way around. Use what helps, skip what doesn't."
            />
            <ConcernItem
              question="90% coverage seems unrealistic for my existing codebase"
              answer="For existing code, absolutely - that's why we have coverage strategies. 'New code only' means you only hit 90% on code you write going forward. Existing code stays as-is. Over time, coverage improves naturally as you touch files. No big-bang rewrite needed."
            />
            <ConcernItem
              question="How do I introduce this to my team?"
              answer="Don't force it. Try it yourself first, share what worked (and what didn't). If teammates are curious, help them experiment. If it helps over time, great - that's a win. If something doesn't work, discuss it as a group. The best approach is the one your squad evolves together, not one imposed from outside."
            />
          </div>
        </div>

        {/* Still Skeptical */}
        <div className="bg-gradient-to-r from-orange-900/20 to-red-900/20 rounded-2xl border border-orange-700/30 p-6 mb-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-orange-500/20 rounded-xl flex items-center justify-center">
              <MessageCircleQuestion className="w-5 h-5 text-orange-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Still Skeptical?</h2>
              <p className="text-sm text-gray-400">Addressing the deeper concerns</p>
            </div>
          </div>

          <div className="space-y-3">
            <ConcernItem
              question="This seems like a lot of overhead"
              answer="The overhead scales with project complexity. For a quick script? Skip it. For anything you'll maintain for months? The 30-minute setup saves hours of 're-explaining to Claude' and debugging untested code. Your Exercise 3 data shows exactly how much time context recovery alone saves."
            />
            <ConcernItem
              question="TDD slows me down - I just want to write code"
              answer="TDD feels slower at first, but look at your Exercise 2 metrics: did you have to go back and fix things? With test-first, bugs are caught immediately, not after you've built three features on top of broken code. The 'slowdown' is actually frontloading the debugging you'd do anyway."
            />
            <ConcernItem
              question="I already have my own workflow that works"
              answer="Perfect - keep it! This isn't about replacing what works. It's a menu, not a mandate. Maybe CLAUDE.md helps with context, maybe quality gates fit your CI, maybe none of it applies. Share what you learn with your team either way - your insights on what works (and doesn't) help everyone improve."
            />
            <ConcernItem
              question="Is AI going to replace me?"
              answer="No. AI is a force multiplier, not a replacement. Claude can write boilerplate, run tests, follow patterns - but YOU make the architectural decisions, define what 'good' looks like, and own the vision. The framework makes this explicit: you define the WHAT (in CLAUDE.md), Claude handles the HOW. Your expertise, judgment, and creativity are what guide the AI. The developers who thrive will be those who learn to collaborate effectively with AI - and that's exactly what you're learning here."
            />
            <ConcernItem
              question="This feels like just another process that will slow us down"
              answer="We get it - process fatigue is real. The difference: this framework emerged from actual work, not a methodology book. Every piece exists because it solved a real problem. But here's the key: if something doesn't help YOUR team, drop it. Keep what works, adapt what doesn't, throw out the rest. The goal is shipping better software together, not following rules for their own sake."
            />
          </div>

          <div className="mt-6 p-4 bg-black/20 rounded-xl border border-orange-500/20">
            <p className="text-gray-300 text-sm">
              <strong className="text-orange-300">The bottom line:</strong> This is about finding what works for you and your team.
              Try things, keep what helps, drop what doesn&apos;t. If something isn&apos;t working, talk about it - adapt the approach together.
              Your skills and expertise are what make any of this valuable. Claude is a powerful tool, but tools don&apos;t build the future.
              <strong className="text-white"> You and your team do.</strong>
            </p>
          </div>
        </div>

        {/* Mentoring & Juniors */}
        <div className="bg-gradient-to-r from-cyan-900/20 to-teal-900/20 rounded-2xl border border-cyan-700/30 p-6 mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-cyan-500/20 rounded-xl flex items-center justify-center">
              <span className="text-xl">🌱</span>
            </div>
            <div>
              <h2 className="text-xl font-bold">What About Juniors & Mentoring?</h2>
              <p className="text-sm text-gray-400">Won&apos;t this be too hard for less experienced developers?</p>
            </div>
          </div>

          <p className="text-gray-400 text-sm mb-4">
            Actually, this framework can be <strong className="text-cyan-400">especially valuable</strong> for juniors and the people who mentor them:
          </p>

          <div className="grid md:grid-cols-2 gap-4 mb-4">
            <div className="bg-black/20 rounded-xl p-4">
              <div className="text-cyan-400 font-medium mb-1">📋 Clear Expectations</div>
              <p className="text-sm text-gray-400">
                CLAUDE.md provides explicit specifications. Juniors know exactly what&apos;s expected - no guessing, no ambiguity.
                The spec becomes a learning resource they can reference anytime.
              </p>
            </div>
            <div className="bg-black/20 rounded-xl p-4">
              <div className="text-cyan-400 font-medium mb-1">🛡️ Safety Rails</div>
              <p className="text-sm text-gray-400">
                Quality gates catch mistakes early, before they compound. TDD teaches good habits from day one.
                Juniors learn to write tests first - a skill that will serve them their entire career.
              </p>
            </div>
            <div className="bg-black/20 rounded-xl p-4">
              <div className="text-cyan-400 font-medium mb-1">🔄 Context Never Lost</div>
              <p className="text-sm text-gray-400">
                When juniors get stuck or need to step away, they don&apos;t lose progress.
                The state file means they (or their mentor) can pick up exactly where they left off.
              </p>
            </div>
            <div className="bg-black/20 rounded-xl p-4">
              <div className="text-cyan-400 font-medium mb-1">🎓 Learning from AI</div>
              <p className="text-sm text-gray-400">
                Watching how Claude approaches problems is educational. Juniors see patterns, conventions,
                and best practices in action - like having a senior developer pair with them.
              </p>
            </div>
          </div>

          <div className="p-4 bg-black/20 rounded-xl border border-cyan-500/20">
            <p className="text-sm text-gray-300">
              <strong className="text-cyan-400">For mentors:</strong> Instead of reviewing just code, you can review the <em>specification</em> together.
              Discuss the CLAUDE.md before implementation starts. Guide the &quot;what&quot; and &quot;why&quot; - let the junior (with AI assistance) handle the &quot;how&quot;.
              This shifts mentoring from &quot;fixing code after the fact&quot; to &quot;shaping thinking before it starts&quot;.
            </p>
          </div>
        </div>

        {/* Team Refinements */}
        <div className="bg-gradient-to-r from-amber-900/20 to-yellow-900/20 rounded-2xl border border-amber-700/30 p-6 mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-amber-500/20 rounded-xl flex items-center justify-center">
              <span className="text-xl">💬</span>
            </div>
            <div>
              <h2 className="text-xl font-bold">Refinements Reimagined</h2>
              <p className="text-sm text-gray-400">Turn discussions into executable specifications</p>
            </div>
          </div>

          <p className="text-gray-400 text-sm mb-4">
            What if your next refinement session produced more than just a ticket?
          </p>

          <div className="bg-black/20 rounded-xl p-4 mb-4">
            <div className="text-amber-400 font-medium mb-2">🔄 The New Refinement Flow</div>
            <ol className="text-sm text-gray-400 space-y-2 list-decimal list-inside">
              <li>Team discusses the problem in refinement (as usual)</li>
              <li><strong className="text-white">Open Claude together</strong> - share screen, think out loud</li>
              <li>Ask Claude to help define the approach: <em>&quot;How should we solve this? What are the options?&quot;</em></li>
              <li>Discuss Claude&apos;s suggestions as a group, refine the direction</li>
              <li><strong className="text-amber-400">Output: A new stage in CLAUDE.md</strong> with clear deliverables and success criteria</li>
            </ol>
          </div>

          <div className="grid md:grid-cols-2 gap-3 mb-4">
            <div className="bg-black/20 rounded-lg p-3">
              <div className="text-green-400 text-sm font-medium">✓ More time for ideas</div>
              <p className="text-xs text-gray-500">Less documenting, more suggesting</p>
            </div>
            <div className="bg-black/20 rounded-lg p-3">
              <div className="text-green-400 text-sm font-medium">✓ Less Jira overhead</div>
              <p className="text-xs text-gray-500">The spec IS the documentation</p>
            </div>
            <div className="bg-black/20 rounded-lg p-3">
              <div className="text-green-400 text-sm font-medium">✓ Faster to outcomes</div>
              <p className="text-xs text-gray-500">From discussion to delivery</p>
            </div>
            <div className="bg-black/20 rounded-lg p-3">
              <div className="text-green-400 text-sm font-medium">✓ Push toward the future</div>
              <p className="text-xs text-gray-500">Spend energy on what&apos;s next, not what was said</p>
            </div>
          </div>

          <div className="p-4 bg-black/20 rounded-xl border border-amber-500/20">
            <p className="text-sm text-gray-300">
              <strong className="text-amber-400">The shift:</strong> Refinements become <em>collaborative design sessions</em> with AI.
              Instead of writing vague acceptance criteria, you write a complete stage specification together.
              The developer who picks it up has everything they need - context, approach, success criteria - all in one place.
              <strong className="text-white"> Less ceremony, more momentum.</strong>
            </p>
          </div>
        </div>

        {/* What's Next */}
        <div className="bg-gradient-to-r from-blue-900/30 to-cyan-900/30 rounded-2xl border border-blue-700/30 p-6 mb-8">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center">
              <Rocket className="w-6 h-6 text-blue-400" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold mb-2">What&apos;s Next?</h2>
              <p className="text-gray-400 mb-4">
                Ready to apply spec-driven development to your real projects? Check out these guides.
              </p>
              <div className="grid md:grid-cols-2 gap-4 mb-4">
                <button
                  onClick={() => router.push('/guides/creating-claude-md')}
                  className="flex items-center gap-3 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 p-4 rounded-xl transition-colors text-left"
                >
                  <FileText className="w-8 h-8 text-blue-400 flex-shrink-0" />
                  <div>
                    <div className="font-medium text-blue-400">Creating Your CLAUDE.md</div>
                    <div className="text-sm text-gray-400">Start new projects with the framework</div>
                  </div>
                  <ArrowRight className="w-5 h-5 text-blue-400 ml-auto" />
                </button>
                <button
                  onClick={() => router.push('/guides/integrating-existing-repos')}
                  className="flex items-center gap-3 bg-green-500/20 hover:bg-green-500/30 border border-green-500/30 p-4 rounded-xl transition-colors text-left"
                >
                  <GitBranch className="w-8 h-8 text-green-400 flex-shrink-0" />
                  <div>
                    <div className="font-medium text-green-400">Integrating with Existing Repos</div>
                    <div className="text-sm text-gray-400">Add to projects already in progress</div>
                  </div>
                  <ArrowRight className="w-5 h-5 text-green-400 ml-auto" />
                </button>
              </div>
              <div className="flex flex-wrap gap-3">
                <a
                  href="/downloads/STAGE_EXECUTION_FRAMEWORK.md"
                  download
                  className="inline-flex items-center gap-2 bg-gray-700 hover:bg-gray-600 text-white font-medium px-4 py-2 rounded-lg text-sm transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Framework Reference
                </a>
                <a
                  href="/downloads/CLAUDE.md"
                  download
                  className="inline-flex items-center gap-2 bg-gray-700 hover:bg-gray-600 text-white font-medium px-4 py-2 rounded-lg text-sm transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Example CLAUDE.md
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Learn the Theory - Only show if slides URL is configured */}
        {config.slidesUrl && (
          <div className="bg-gradient-to-r from-purple-900/30 to-pink-900/30 rounded-2xl border border-purple-700/30 p-6 mb-12">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center">
                <BookOpen className="w-6 h-6 text-purple-400" />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold mb-2">Learn the Theory</h2>
                <p className="text-gray-400 mb-4">
                  Want to understand why spec-driven development works? Check out the slides for the theory behind the framework.
                </p>
                <a
                  href={config.slidesUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-purple-500 hover:bg-purple-600 text-white font-medium px-5 py-2.5 rounded-xl transition-colors"
                >
                  <BookOpen className="w-4 h-4" />
                  {config.slidesTitle}
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>
          </div>
        )}

        {/* CTA */}
        <div className="text-center">
          {!certificateIssued ? (
            <button
              onClick={() => router.push('/certificate')}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-yellow-500 to-orange-500 text-black font-bold px-8 py-4 rounded-xl hover:opacity-90 transition-opacity shadow-lg shadow-yellow-500/25"
            >
              <Award className="w-5 h-5" />
              Claim Your Certificate
              <ArrowRight className="w-5 h-5" />
            </button>
          ) : (
            <button
              onClick={() => router.push('/certificate')}
              className="inline-flex items-center gap-2 text-yellow-400 hover:text-yellow-300 font-medium"
            >
              <Award className="w-5 h-5" />
              View Your Certificate
              <ArrowRight className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
