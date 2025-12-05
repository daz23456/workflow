'use client';

/**
 * Guide: Integrating with Existing Repos
 */

import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  GitBranch,
  CheckCircle,
  Clock,
  Folder,
  FileText,
  Shield,
  Settings,
  Copy,
  Check,
  AlertTriangle,
  Lightbulb,
  Sparkles,
  Search,
} from 'lucide-react';
import { useState } from 'react';

function CodeBlock({ children, title }: { children: string; title?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(children);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-gray-900 rounded-xl border border-gray-700 overflow-hidden my-4">
      {title && (
        <div className="flex items-center justify-between px-4 py-2 bg-gray-800/50 border-b border-gray-700">
          <span className="text-sm text-gray-400">{title}</span>
          <button
            onClick={handleCopy}
            className="text-gray-400 hover:text-white transition-colors"
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>
      )}
      <pre className="p-4 overflow-x-auto text-sm text-gray-300">
        <code>{children}</code>
      </pre>
    </div>
  );
}

function StepCard({
  step,
  title,
  time,
  children,
}: {
  step: number;
  title: string;
  time: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-gray-800/50 rounded-2xl border border-gray-700/50 p-6 mb-6">
      <div className="flex items-start gap-4 mb-4">
        <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-lg font-bold flex-shrink-0">
          {step}
        </div>
        <div className="flex-1">
          <h3 className="text-xl font-bold">{title}</h3>
          <div className="flex items-center gap-2 text-gray-400 text-sm">
            <Clock className="w-4 h-4" />
            {time}
          </div>
        </div>
      </div>
      {children}
    </div>
  );
}

export default function IntegratingExistingReposPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <button
          onClick={() => router.push('/results')}
          className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Results
        </button>

        {/* Header */}
        <div className="mb-12">
          <div className="inline-flex items-center gap-2 text-green-400 text-sm font-medium mb-2">
            <GitBranch className="w-4 h-4" />
            Guide
          </div>
          <h1 className="text-4xl font-bold mb-4">Integrating with Existing Repos</h1>
          <p className="text-xl text-gray-400">
            You don&apos;t have to start from scratch. Here&apos;s how to add spec-driven development
            to a project that&apos;s already in progress.
          </p>
        </div>

        {/* Overview */}
        <div className="bg-green-900/20 border border-green-700/50 rounded-2xl p-6 mb-8">
          <p className="text-lg">
            Adding spec-driven development to an existing repo takes about{' '}
            <strong className="text-green-400">30 minutes</strong> and doesn&apos;t require
            refactoring existing code. You&apos;re adding structure going forward, not rewriting
            history.
          </p>
        </div>

        {/* Step 1 */}
        <StepCard step={1} title="Add the Framework Files" time="5 min">
          <p className="text-gray-300 mb-4">Copy these files to your project root:</p>
          <CodeBlock title="Project Structure">{`your-project/
├── CLAUDE.md                        # Your project spec (create this)
├── STAGE_EXECUTION_FRAMEWORK.md     # The execution protocol
├── STAGE_PROOF_TEMPLATE.md          # Proof file template
└── scripts/
    ├── init-stage.sh
    ├── run-quality-gates.sh
    └── complete-stage.sh`}</CodeBlock>
          <p className="text-gray-300 mt-4">Make scripts executable:</p>
          <CodeBlock title="Terminal">{`chmod +x scripts/*.sh`}</CodeBlock>
        </StepCard>

        {/* Step 2 */}
        <StepCard step={2} title="Create Your CLAUDE.md" time="15 min">
          <p className="text-gray-300 mb-4">
            Start with this template and customize for your project:
          </p>
          <CodeBlock title="CLAUDE.md">{`# CLAUDE.md - [Your Project Name]

## Project Overview

[2-3 sentences about what this project does]

**Technology Stack:**
- [Your language/framework]
- [Your database]
- [Your testing framework]
- [Other key dependencies]

**Non-Negotiable Requirements:**
- Test-first development for new features (RED-GREEN-REFACTOR)
- ≥90% coverage for new code
- [Your team's specific requirements]

---

## Stage Execution Protocol

**Read \`STAGE_EXECUTION_FRAMEWORK.md\` for the full protocol.**

---

## Current State

**Existing codebase:** [Brief description]
**Test coverage:** [Current %]
**Known tech debt:** [Brief list]

---

## Stage Roadmap

### Stage 1.0: [Your Next Feature] 🔴 NOT STARTED
**Goal:** [What you're building]

**Deliverables:**
- [ ] Deliverable 1
- [ ] Deliverable 2

**Success Criteria:**
- New code has tests
- Coverage ≥90% for new files
- Quality gates pass

---

## Architecture Notes

[Key architectural decisions Claude should know about]

### Project Structure
\`\`\`
src/
├── [folder]/ - [purpose]
├── [folder]/ - [purpose]
└── [folder]/ - [purpose]
\`\`\`

### Key Patterns
- [Pattern 1 and where it's used]
- [Pattern 2 and where it's used]

### Things to Avoid
- [Anti-pattern or legacy approach to avoid]
- [Files/areas that shouldn't be touched]

---

## Context Recovery

\`\`\`bash
cat stage-proofs/stage-X.X/.stage-state.yaml
\`\`\`

Then: "Read CLAUDE.md and the state file. Continue Stage X.X."`}</CodeBlock>
        </StepCard>

        {/* Step 3 */}
        <StepCard step={3} title="Decide Your Coverage Strategy" time="5 min">
          <p className="text-gray-300 mb-4">You have three options for handling existing code:</p>

          <div className="space-y-4">
            {/* Option A */}
            <div className="bg-green-900/20 border border-green-700/50 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center text-sm font-bold">
                  A
                </div>
                <h4 className="font-semibold text-green-400">New Code Only (Recommended Start)</h4>
              </div>
              <ul className="text-gray-300 text-sm space-y-1 mb-3">
                <li>• Apply TDD and 90% coverage to NEW code only</li>
                <li>• Existing code stays as-is</li>
                <li>• Gradually improve coverage over time</li>
              </ul>
              <CodeBlock>{`**Non-Negotiable Requirements:**
- ≥90% coverage for NEW files and functions
- Existing code: maintain current coverage, don't decrease`}</CodeBlock>
            </div>

            {/* Option B */}
            <div className="bg-blue-900/20 border border-blue-700/50 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-sm font-bold">
                  B
                </div>
                <h4 className="font-semibold text-blue-400">Touch It, Test It</h4>
              </div>
              <ul className="text-gray-300 text-sm space-y-1 mb-3">
                <li>• Any file you modify must have tests added</li>
                <li>• Coverage requirement applies to modified files</li>
              </ul>
              <CodeBlock>{`**Non-Negotiable Requirements:**
- ≥90% coverage for any file modified in this stage
- Don't modify files unless you're adding tests`}</CodeBlock>
            </div>

            {/* Option C */}
            <div className="bg-yellow-900/20 border border-yellow-700/50 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 bg-yellow-500 rounded-full flex items-center justify-center text-sm font-bold">
                  C
                </div>
                <h4 className="font-semibold text-yellow-400">Full Retrofit (Big Investment)</h4>
              </div>
              <ul className="text-gray-300 text-sm space-y-1 mb-3">
                <li>• Add tests to existing code as separate stages</li>
                <li>• Stage 1: Add tests to Module A</li>
                <li>• Stage 2: Add tests to Module B</li>
                <li>• Then continue with new features</li>
              </ul>
              <CodeBlock>{`### Stage 1.0: Retrofit Tests for Auth Module 🔴
**Goal:** Add test coverage to existing authentication code

**Deliverables:**
- [ ] Unit tests for AuthService
- [ ] Integration tests for login flow
- [ ] Coverage ≥90% for src/auth/`}</CodeBlock>
            </div>
          </div>
        </StepCard>

        {/* Step 4 */}
        <StepCard step={4} title="Configure Quality Gates" time="5 min">
          <p className="text-gray-300 mb-4">Adjust gate thresholds for your situation:</p>

          <div className="space-y-4">
            <div className="bg-gray-700/30 rounded-xl p-4">
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <Settings className="w-4 h-4 text-gray-400" />
                For Gradual Adoption
              </h4>
              <p className="text-gray-400 text-sm mb-3">
                Edit <code className="bg-gray-800 px-1.5 py-0.5 rounded">scripts/run-quality-gates.sh</code> to focus on new code:
              </p>
              <CodeBlock title="bash">{`# Gate 6: Coverage - check only new/modified files
COVERAGE_THRESHOLD=90
COVERAGE_SCOPE="--changedSince=main"  # Or your base branch`}</CodeBlock>
            </div>

            <div className="bg-gray-700/30 rounded-xl p-4">
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-yellow-400" />
                For Legacy Codebases
              </h4>
              <p className="text-gray-400 text-sm mb-3">You might need to:</p>
              <ul className="text-gray-400 text-sm space-y-1 mb-3">
                <li>• Skip certain gates initially (document why)</li>
                <li>• Set lower thresholds and increase over time</li>
                <li>• Exclude legacy directories from coverage checks</li>
              </ul>
              <CodeBlock title="bash">{`# Example: Exclude legacy code from coverage
COVERAGE_EXCLUDE="--exclude=src/legacy/**"`}</CodeBlock>
            </div>
          </div>
        </StepCard>

        {/* Step 5 */}
        <StepCard step={5} title="Initialize Your First Stage" time="2 min">
          <p className="text-gray-300 mb-4">Pick your first feature and initialize:</p>
          <CodeBlock title="Terminal">{`./scripts/init-stage.sh --stage 1.0 --name "Your Feature" --profile BACKEND`}</CodeBlock>
          <p className="text-gray-300 mt-4">This creates:</p>
          <ul className="text-gray-300 space-y-1">
            <li>
              • <code className="bg-gray-800 px-1.5 py-0.5 rounded">stage-proofs/stage-1.0/</code>{' '}
              directory
            </li>
            <li>• State tracking file</li>
            <li>• Proof file template</li>
          </ul>
        </StepCard>

        {/* Common Scenarios */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-purple-500/20 rounded-xl flex items-center justify-center">
              <Lightbulb className="w-5 h-5 text-purple-400" />
            </div>
            <h2 className="text-2xl font-bold">Common Scenarios</h2>
          </div>

          <div className="space-y-6">
            {/* Scenario 1 */}
            <div className="bg-gray-800/50 rounded-xl border border-gray-700/50 p-6">
              <h3 className="font-semibold mb-3 text-purple-400">
                Scenario: Adding a Feature to Legacy Code
              </h3>
              <CodeBlock>{`### Stage 2.0: User Preferences API 🔴 NOT STARTED

**Context:** Adding to existing user module (low test coverage)

**Approach:**
1. Add tests for existing UserService methods we'll use
2. TDD for new PreferencesService
3. Integration tests for new endpoints

**Deliverables:**
- [ ] Tests for UserService.getById() and .update()
- [ ] PreferencesService with full TDD
- [ ] GET/PUT /api/users/{id}/preferences endpoints
- [ ] ≥90% coverage for new code`}</CodeBlock>
            </div>

            {/* Scenario 2 */}
            <div className="bg-gray-800/50 rounded-xl border border-gray-700/50 p-6">
              <h3 className="font-semibold mb-3 text-purple-400">Scenario: Fixing a Bug</h3>
              <CodeBlock>{`### Stage 1.5: Fix Payment Retry Bug 🔴 NOT STARTED

**Bug:** Payments fail silently after 3rd retry

**Approach:**
1. Write failing test that reproduces bug
2. Fix the bug
3. Verify test passes

**Deliverables:**
- [ ] Test case reproducing the bug
- [ ] Fix in PaymentService.processWithRetry()
- [ ] Regression test to prevent recurrence`}</CodeBlock>
            </div>

            {/* Scenario 3 */}
            <div className="bg-gray-800/50 rounded-xl border border-gray-700/50 p-6">
              <h3 className="font-semibold mb-3 text-purple-400">Scenario: Refactoring</h3>
              <CodeBlock>{`### Stage 3.0: Extract Notification Service 🔴 NOT STARTED

**Goal:** Move notification logic from OrderService to dedicated service

**Approach:**
1. Write characterization tests for current behavior
2. Extract NotificationService
3. Verify all tests still pass
4. Add new tests for edge cases

**Deliverables:**
- [ ] Characterization tests for current notification behavior
- [ ] NotificationService extracted
- [ ] OrderService updated to use new service
- [ ] No behavior changes (all tests green)`}</CodeBlock>
            </div>
          </div>
        </div>

        {/* What About Existing Tests */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-orange-500/20 rounded-xl flex items-center justify-center">
              <Shield className="w-5 h-5 text-orange-400" />
            </div>
            <h2 className="text-2xl font-bold">What About Existing Tests?</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <div className="bg-green-900/20 border border-green-700/50 rounded-xl p-4">
              <h4 className="font-semibold text-green-400 mb-2">If You Have Tests</h4>
              <ul className="text-gray-300 text-sm space-y-1">
                <li>• Great! Keep them running</li>
                <li>• Add them to quality gates</li>
                <li>• New code follows TDD; existing tests stay as-is</li>
              </ul>
            </div>

            <div className="bg-yellow-900/20 border border-yellow-700/50 rounded-xl p-4">
              <h4 className="font-semibold text-yellow-400 mb-2">If You Have Few/No Tests</h4>
              <ul className="text-gray-300 text-sm space-y-1">
                <li>• Don&apos;t try to retrofit everything at once</li>
                <li>• Start with: &quot;new code gets tests&quot;</li>
                <li>• Add tests to old code when you touch it</li>
              </ul>
            </div>

            <div className="bg-red-900/20 border border-red-700/50 rounded-xl p-4">
              <h4 className="font-semibold text-red-400 mb-2">If Tests Are Flaky</h4>
              <ul className="text-gray-300 text-sm space-y-1">
                <li>• Fix or quarantine flaky tests before starting</li>
                <li>• Flaky tests break the feedback loop</li>
                <li>• One stage could be: &quot;Stabilize test suite&quot;</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Pro Tip: Let Claude Analyze Your Repo */}
        <div className="bg-gradient-to-r from-purple-900/30 to-pink-900/30 rounded-2xl border border-purple-700/30 p-6 mb-8">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-purple-400" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold mb-2">Pro Tip: Let Claude Analyze Your Repo First</h2>
              <p className="text-gray-300 mb-4">
                Before writing your CLAUDE.md, ask Claude to <strong>explore your existing codebase</strong> and
                suggest a modernization roadmap. Claude will ask clarifying questions and identify opportunities
                you might have missed.
              </p>
              <p className="text-gray-400 text-sm mb-3">
                Try this starter prompt:
              </p>
              <div className="bg-black/30 rounded-lg p-4 border border-purple-500/20 mb-4">
                <pre className="text-sm text-gray-200 whitespace-pre-wrap font-mono">{`I want to adopt spec-driven development for this existing project.

Please explore this codebase and help me understand:
1. What's the current project structure and tech stack?
2. What's the test coverage situation? Are tests in a separate directory or co-located?
3. Are there E2E or integration tests located elsewhere I should know about?
4. What patterns and conventions are already established?
5. What's the current state of documentation?

Then suggest:
- A coverage strategy (new code only, touch-it-test-it, or retrofit)
- 3-5 potential stages to modernize/improve the codebase
- Any quick wins we could tackle first
- Areas that need the most attention

Ask me clarifying questions if you need more context.`}</pre>
              </div>
              <div className="bg-black/20 rounded-lg p-3 border border-purple-500/10">
                <div className="flex items-start gap-2">
                  <Search className="w-4 h-4 text-purple-400 mt-0.5 flex-shrink-0" />
                  <p className="text-gray-400 text-sm">
                    <strong className="text-purple-300">Claude will explore</strong> your project structure,
                    find existing tests, identify patterns, and suggest practical next steps tailored to
                    your specific codebase. This gives you a head start on your CLAUDE.md.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tips for Success */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-blue-400" />
            </div>
            <h2 className="text-2xl font-bold">Tips for Success</h2>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-semibold mb-4 text-green-400 flex items-center gap-2">
                <CheckCircle className="w-5 h-5" />
                DO
              </h3>
              <ul className="space-y-2 text-gray-300">
                <li className="flex items-start gap-2">
                  <span className="text-green-400">✓</span>
                  Start small - pick one feature for your first stage
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-400">✓</span>
                  Document your existing architecture in CLAUDE.md
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-400">✓</span>
                  Be explicit about what coverage rules apply where
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-400">✓</span>
                  Update CLAUDE.md as you learn more about the codebase
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-400">✓</span>
                  Use stages to gradually improve test coverage
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-4 text-red-400 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                DON&apos;T
              </h3>
              <ul className="space-y-2 text-gray-300">
                <li className="flex items-start gap-2">
                  <span className="text-red-400">✗</span>
                  Try to retrofit tests for everything at once
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-400">✗</span>
                  Set unrealistic coverage targets for legacy code
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-400">✗</span>
                  Skip documenting architectural decisions
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-400">✗</span>
                  Forget to update CLAUDE.md after each stage
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Quick Start Checklist */}
        <div className="bg-blue-900/20 border border-blue-700/50 rounded-2xl p-6 mb-8">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <CheckCircle className="w-6 h-6 text-blue-400" />
            Quick Start Checklist
          </h2>
          <div className="space-y-3">
            {[
              'Copy framework files to your project',
              'Create CLAUDE.md with your project details',
              'Document current state (coverage, tech debt)',
              'Decide coverage strategy (new only vs touch-it-test-it)',
              'Configure quality gates for your situation',
              'Initialize your first stage',
              'Tell Claude to read CLAUDE.md and start',
            ].map((item, i) => (
              <label key={i} className="flex items-center gap-3 text-gray-300 cursor-pointer">
                <input type="checkbox" className="w-5 h-5 rounded bg-gray-700 border-gray-600" />
                {item}
              </label>
            ))}
          </div>
          <p className="text-gray-400 mt-4">
            <strong>Time to integrate:</strong> ~30 minutes
          </p>
        </div>

        {/* Footer message */}
        <div className="text-center text-gray-400 pb-8">
          <p className="text-lg">
            You don&apos;t need a greenfield project.
            <br />
            <strong className="text-white">
              Start where you are, apply the framework to what&apos;s next, and gradually improve
              the codebase over time.
            </strong>
          </p>
        </div>
      </div>
    </div>
  );
}
