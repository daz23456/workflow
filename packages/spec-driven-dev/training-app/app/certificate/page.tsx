'use client';

/**
 * Certificate Page - Issue and display completion certificate
 */

import { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Award,
  Download,
  Share2,
  CheckCircle2,
  Calendar,
  Hash,
  User,
  Loader2,
} from 'lucide-react';
import { useTrainingStore, areAllExercisesComplete } from '@/lib/store';
import { config } from '@/lib/config';

export default function CertificatePage() {
  const router = useRouter();
  const certificateRef = useRef<HTMLDivElement>(null);
  const [name, setName] = useState('');
  const [isIssuing, setIsIssuing] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const {
    certificateIssued,
    certificateDate,
    certificateName,
    certificateId,
    issueCertificate,
    exerciseMetrics,
  } = useTrainingStore();

  const allComplete = areAllExercisesComplete();

  if (!allComplete) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Complete All Exercises First</h1>
          <p className="text-gray-400 mb-6">
            You need to complete all 3 exercises to claim your certificate.
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

  const handleIssueCertificate = () => {
    if (!name.trim()) return;
    setIsIssuing(true);
    setTimeout(() => {
      issueCertificate(name.trim());
      setIsIssuing(false);
    }, 1000);
  };

  const handleDownload = useCallback(async () => {
    if (!certificateRef.current) return;

    setIsDownloading(true);

    try {
      // Dynamic imports to ensure client-side only loading
      const html2canvas = (await import('html2canvas')).default;
      const { jsPDF } = await import('jspdf');

      // Capture the certificate element as canvas
      const canvas = await html2canvas(certificateRef.current, {
        scale: 2, // Higher resolution
        backgroundColor: '#111827', // Match the dark background (gray-900)
        logging: false,
        useCORS: true,
        allowTaint: true,
        // Ignore elements that might cause rendering issues
        ignoreElements: (element) => {
          return element.tagName === 'NOSCRIPT';
        },
      });

      // Create PDF in landscape orientation for better certificate layout
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      // Calculate dimensions to fit the page with padding
      const padding = 10; // mm
      const maxWidth = pageWidth - (padding * 2);
      const maxHeight = pageHeight - (padding * 2);

      const imgRatio = canvas.width / canvas.height;
      const pageRatio = maxWidth / maxHeight;

      let imgWidth: number;
      let imgHeight: number;

      if (imgRatio > pageRatio) {
        // Image is wider than page ratio - fit to width
        imgWidth = maxWidth;
        imgHeight = maxWidth / imgRatio;
      } else {
        // Image is taller than page ratio - fit to height
        imgHeight = maxHeight;
        imgWidth = maxHeight * imgRatio;
      }

      // Center the image on the page
      const x = (pageWidth - imgWidth) / 2;
      const y = (pageHeight - imgHeight) / 2;

      // Add image to PDF
      const imgData = canvas.toDataURL('image/png');
      pdf.addImage(imgData, 'PNG', x, y, imgWidth, imgHeight);

      // Download the PDF
      pdf.save(`sdd-certificate-${certificateId}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      // Provide more helpful error message
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      alert(`Failed to generate PDF: ${errorMessage}\n\nTip: Try taking a screenshot instead.`);
    } finally {
      setIsDownloading(false);
    }
  }, [certificateId]);

  const handleShare = async () => {
    const shareText = `I just completed the Spec-Driven Development Training! 🎓

Certificate ID: ${certificateId}

Key learnings:
✅ Test-Driven Development with AI
✅ Quality Gates that enforce standards
✅ Context recovery in seconds

#SpecDrivenDev #TDD #AI #SoftwareEngineering`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Spec-Driven Development Certificate',
          text: shareText,
        });
      } catch {
        // User cancelled or error
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(shareText);
      alert('Certificate details copied to clipboard!');
    }
  };

  // If certificate not yet issued, show form
  if (!certificateIssued) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white">
        <div className="max-w-2xl mx-auto px-4 py-16">
          <button
            onClick={() => router.push('/')}
            className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-8"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Training
          </button>

          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-2xl mb-6">
              <Award className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-3xl font-bold mb-4">Claim Your Certificate</h1>
            <p className="text-gray-400">
              Congratulations on completing all 3 exercises! Enter your name to
              generate your certificate.
            </p>
          </div>

          <div className="bg-gray-800/50 rounded-2xl p-8 border border-gray-700/50">
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Your Full Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name as it should appear on the certificate"
                className="w-full bg-gray-700 border border-gray-600 rounded-xl px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-500"
              />
            </div>

            <button
              onClick={handleIssueCertificate}
              disabled={!name.trim() || isIssuing}
              className="w-full inline-flex items-center justify-center gap-2 bg-gradient-to-r from-yellow-500 to-orange-500 text-black font-bold py-4 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isIssuing ? (
                <>
                  <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                  Generating Certificate...
                </>
              ) : (
                <>
                  <Award className="w-5 h-5" />
                  Generate Certificate
                </>
              )}
            </button>
          </div>

          {/* Preview metrics */}
          <div className="mt-8 bg-gray-800/30 rounded-xl p-6 border border-gray-700/50">
            <h3 className="font-medium mb-4 text-gray-300">Your Training Summary</h3>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-green-400">3/3</div>
                <div className="text-xs text-gray-400">Exercises</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-400">
                  {exerciseMetrics['spec-driven']?.testCoverage ?? '—'}%
                </div>
                <div className="text-xs text-gray-400">Coverage</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-yellow-400">
                  {exerciseMetrics['context-recovery']?.contextRecoverySeconds ?? '—'}s
                </div>
                <div className="text-xs text-gray-400">Recovery</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Certificate display
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <button
          onClick={() => router.push('/')}
          className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Training
        </button>

        {/* Certificate - Using inline styles with hex colors for html2canvas compatibility */}
        <div
          ref={certificateRef}
          style={{
            background: 'linear-gradient(to bottom right, #1f2937, #111827)',
            borderRadius: '1.5rem',
            padding: '4px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          }}
        >
          <div
            style={{
              background: 'linear-gradient(to bottom right, rgba(120, 53, 15, 0.2), rgba(154, 52, 18, 0.2))',
              borderRadius: '1.5rem',
              padding: '3rem',
              border: '1px solid rgba(161, 98, 7, 0.3)',
            }}
          >
            {/* Header - Using emoji for PDF compatibility */}
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '4rem',
                  height: '4rem',
                  background: 'linear-gradient(to bottom right, #eab308, #f97316)',
                  borderRadius: '1rem',
                  marginBottom: '1rem',
                  fontSize: '2rem',
                }}
              >
                🏆
              </div>
              <h2
                style={{
                  fontSize: '0.875rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  color: '#facc15',
                  marginBottom: '0.5rem',
                }}
              >
                Certificate of Completion
              </h2>
              <h1
                style={{
                  fontSize: '2rem',
                  fontWeight: 'bold',
                  color: '#ffffff',
                }}
              >
                Spec-Driven Development Training
              </h1>
            </div>

            {/* Recipient */}
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
              <p style={{ color: '#9ca3af', marginBottom: '0.5rem' }}>This certifies that</p>
              <p
                style={{
                  fontSize: '2rem',
                  fontWeight: 'bold',
                  color: '#fbbf24',
                }}
              >
                {certificateName}
              </p>
            </div>

            {/* Description */}
            <div style={{ textAlign: 'center', marginBottom: '2rem', maxWidth: '32rem', marginLeft: 'auto', marginRight: 'auto' }}>
              <p style={{ color: '#9ca3af' }}>
                has successfully completed the Spec-Driven Development Training
                Program, demonstrating proficiency in test-driven development,
                quality gate enforcement, and AI-assisted development best practices.
              </p>
            </div>

            {/* Skills - Using table layout for consistent PDF rendering */}
            <table style={{ width: '100%', marginBottom: '2rem', borderCollapse: 'separate', borderSpacing: '0.5rem' }}>
              <tbody>
                <tr>
                  {[
                    'Test-Driven Development',
                    'Quality Gates',
                    'Context Recovery',
                    'AI Collaboration',
                  ].map((skill) => (
                    <td key={skill} style={{ textAlign: 'center', padding: '0' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          backgroundColor: '#3d2f0a',
                          color: '#facc15',
                          padding: '0.5rem 1rem',
                          borderRadius: '9999px',
                          fontSize: '0.875rem',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        ✓ {skill}
                      </span>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>

            {/* Footer - Using table layout for consistent PDF rendering */}
            <table style={{ width: '100%', fontSize: '0.875rem', color: '#9ca3af' }}>
              <tbody>
                <tr>
                  <td style={{ textAlign: 'center', padding: '0 1rem' }}>
                    # {certificateId}
                  </td>
                  <td style={{ textAlign: 'center', padding: '0 1rem' }}>
                    📅 {new Date(certificateDate || '').toLocaleDateString()}
                  </td>
                  <td style={{ textAlign: 'center', padding: '0 1rem' }}>
                    👤 {certificateName}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap justify-center gap-4 mb-8">
          <button
            onClick={handleDownload}
            disabled={isDownloading}
            className="inline-flex items-center gap-2 bg-gray-700 hover:bg-gray-600 text-white font-medium px-6 py-3 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isDownloading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Generating PDF...
              </>
            ) : (
              <>
                <Download className="w-5 h-5" />
                Download PDF
              </>
            )}
          </button>
          <button
            onClick={handleShare}
            className="inline-flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white font-medium px-6 py-3 rounded-xl transition-colors"
          >
            <Share2 className="w-5 h-5" />
            Share
          </button>
        </div>

        {/* Next Steps */}
        <div className="mt-12 bg-gray-800/50 rounded-2xl p-6 border border-gray-700/50">
          <h3 className="text-lg font-bold mb-4">Next Steps</h3>
          <ul className="space-y-3">
            <li className="flex items-start gap-3">
              <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
                1
              </div>
              <div>
                <span className="font-medium">Apply to a real project</span>
                <p className="text-sm text-gray-400">
                  Pick a task from your backlog and use spec-driven development
                </p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
                2
              </div>
              <div>
                <span className="font-medium">Document your findings</span>
                <p className="text-sm text-gray-400">
                  Track metrics and compare with your baseline
                </p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
                3
              </div>
              <div>
                <span className="font-medium">Share with your team</span>
                <p className="text-sm text-gray-400">
                  Present your results in a team meeting or Slack
                </p>
              </div>
            </li>
          </ul>
        </div>

        {/* What to Do With Your Time */}
        <div className="mt-6 bg-gradient-to-r from-green-900/30 to-emerald-900/30 rounded-2xl p-6 border border-green-700/30">
          <h3 className="text-lg font-bold mb-2">What Will You Do With the Time You Save?</h3>
          <p className="text-gray-400 text-sm mb-4">
            We expect your <strong className="text-white">velocity</strong> to improve - but that&apos;s not the goal.
            The goal is to also grow your <strong className="text-green-400">curiosity</strong>, your <strong className="text-blue-400">collaboration</strong>,
            your <strong className="text-yellow-400">passion</strong>, and your <strong className="text-purple-400">courage</strong>.
            Here&apos;s how you might invest that time:
          </p>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-black/20 rounded-xl p-4">
              <div className="text-green-400 font-medium mb-1">🔍 Curiosity</div>
              <p className="text-sm text-gray-400">
                Explore new technologies. Read documentation deeply. Prototype that idea you&apos;ve been thinking about.
                Ask &quot;why&quot; more often. Dig into how things actually work.
              </p>
            </div>
            <div className="bg-black/20 rounded-xl p-4">
              <div className="text-blue-400 font-medium mb-1">🤝 Collaboration</div>
              <p className="text-sm text-gray-400">
                Pair with teammates. Share what you&apos;ve learned. Help others level up.
                The best solutions come from diverse perspectives working together.
              </p>
            </div>
            <div className="bg-black/20 rounded-xl p-4">
              <div className="text-yellow-400 font-medium mb-1">🔥 Passion</div>
              <p className="text-sm text-gray-400">
                Work on engineering improvements, not just product features.
                Fix that thing that&apos;s been bugging you. Make the codebase better for everyone.
              </p>
            </div>
            <div className="bg-black/20 rounded-xl p-4">
              <div className="text-purple-400 font-medium mb-1">💪 Courage</div>
              <p className="text-sm text-gray-400">
                Propose bold ideas. Challenge assumptions. Use company resources to support your vision.
                The best improvements come from people brave enough to suggest them.
              </p>
            </div>
          </div>
          <div className="mt-4 p-4 bg-black/20 rounded-xl border border-green-500/20">
            <p className="text-sm text-gray-300">
              <strong className="text-green-400">Starter for ten:</strong> Design a solution that reduces the number of meetings your team needs.
              What if better async communication, clearer specs, or automated status updates meant fewer syncs?
            </p>
          </div>
        </div>

        {/* Claude Code Best Practices - Only show if URL is configured */}
        {config.bestPracticesUrl && (
          <div className="mt-6 bg-gradient-to-r from-blue-900/30 to-indigo-900/30 rounded-2xl p-6 border border-blue-700/30">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center">
                <span className="text-xl">📘</span>
              </div>
              <div>
                <h3 className="text-lg font-bold">{config.bestPracticesTitle}</h3>
                <p className="text-sm text-gray-400">Level up your AI collaboration skills</p>
              </div>
            </div>

            <p className="text-sm text-gray-400 mb-4">
              Want to get even more out of your AI coding tools? Check out the best practices guide for advanced techniques,
              configuration options, and tips for effective AI-assisted development.
            </p>

            <a
              href={config.bestPracticesUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white font-medium px-5 py-2.5 rounded-xl transition-colors"
            >
              <span>📖</span>
              {config.bestPracticesTitle}
              <span className="text-blue-200">→</span>
            </a>
          </div>
        )}

        {/* Feeling Bold */}
        <div className="mt-6 bg-gradient-to-r from-purple-900/30 to-pink-900/30 rounded-2xl p-6 border border-purple-700/30">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-purple-500/20 rounded-xl flex items-center justify-center">
              <span className="text-xl">🚀</span>
            </div>
            <div>
              <h3 className="text-lg font-bold">Feeling Bold?</h3>
              <p className="text-sm text-gray-400">For those ready to push further</p>
            </div>
          </div>

          <div className="bg-black/20 rounded-xl p-4 mb-4">
            <div className="text-purple-400 font-medium mb-2">⚡ Parallel Stages with Git Worktrees</div>
            <p className="text-sm text-gray-400 mb-3">
              Why work on one stage at a time? With git worktrees, you can have multiple Claude Code sessions
              working on <strong className="text-white">different stages simultaneously</strong> - each in its own directory,
              its own branch, its own context.
            </p>
            <div className="bg-black/30 rounded-lg p-3 font-mono text-xs text-gray-300 mb-3">
              <div className="text-gray-500"># Create a worktree for Stage 2 while Stage 1 is in progress</div>
              <div>git worktree add ../my-project-stage-2 -b stage-2</div>
              <div className="mt-2 text-gray-500"># Now you have two directories, two branches, two sessions</div>
              <div>cd ../my-project-stage-2</div>
              <div>claude  # Start a new Claude Code session here</div>
            </div>
            <p className="text-sm text-gray-400">
              Blocked waiting for a review? Start the next stage in a worktree.
              Got a quick bugfix? Spin up a worktree, fix it, merge it back.
              Each stage stays isolated until you&apos;re ready to integrate.
            </p>
          </div>

          <p className="text-sm text-gray-400">
            <strong className="text-purple-400">Pro tip:</strong> This works especially well when stages have clear boundaries.
            Your CLAUDE.md and stage state files mean each session knows exactly what it&apos;s working on - no cross-contamination.
          </p>
        </div>
      </div>
    </div>
  );
}
