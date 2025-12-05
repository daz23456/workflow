'use client';

/**
 * Guide: Creating Your Own CLAUDE.md
 */

import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  FileText,
  CheckCircle,
  XCircle,
  Copy,
  Check,
  BookOpen,
  Folder,
  Settings,
  ListTodo,
  RefreshCw,
  Sparkles,
  Archive,
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

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-12">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center">
          <Icon className="w-5 h-5 text-blue-400" />
        </div>
        <h2 className="text-2xl font-bold">{title}</h2>
      </div>
      {children}
    </div>
  );
}

export default function CreatingClaudeMdPage() {
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
          <div className="inline-flex items-center gap-2 text-blue-400 text-sm font-medium mb-2">
            <FileText className="w-4 h-4" />
            Guide
          </div>
          <h1 className="text-4xl font-bold mb-4">Creating Your Own CLAUDE.md</h1>
          <p className="text-xl text-gray-400">
            After completing the training exercises, use this guide to create CLAUDE.md files for
            your real projects.
          </p>
        </div>

        {/* What is CLAUDE.md */}
        <Section icon={BookOpen} title="What is CLAUDE.md?">
          <p className="text-gray-300 mb-4">
            CLAUDE.md is your <strong>project specification file</strong>. Claude Code reads it
            automatically at the start of every session, giving it full context about:
          </p>
          <ul className="list-disc list-inside text-gray-300 space-y-2 mb-6">
            <li>What you&apos;re building</li>
            <li>Your technology stack and constraints</li>
            <li>Your quality standards</li>
            <li>Your current progress</li>
          </ul>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-red-900/20 border border-red-700/50 rounded-xl p-4">
              <div className="flex items-center gap-2 text-red-400 font-medium mb-2">
                <XCircle className="w-5 h-5" />
                Without CLAUDE.md
              </div>
              <p className="text-gray-400">You repeat yourself every session.</p>
            </div>
            <div className="bg-green-900/20 border border-green-700/50 rounded-xl p-4">
              <div className="flex items-center gap-2 text-green-400 font-medium mb-2">
                <CheckCircle className="w-5 h-5" />
                With CLAUDE.md
              </div>
              <p className="text-gray-400">Claude picks up exactly where you left off.</p>
            </div>
          </div>
        </Section>

        {/* Essential Sections */}
        <Section icon={Folder} title="The Essential Sections">
          <p className="text-gray-300 mb-6">Every CLAUDE.md should have these sections:</p>

          {/* Section 1: Project Overview */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold mb-3 text-blue-400">1. Project Overview (Required)</h3>
            <CodeBlock title="markdown">{`# CLAUDE.md - [Project Name]

## Project Overview

[2-3 sentences describing what you're building and why]

**Technology Stack:**
- [Language/Framework]
- [Testing framework]
- [Database if applicable]
- [Other key technologies]

**Non-Negotiable Requirements:**
- Test-first development (RED-GREEN-REFACTOR)
- ≥90% code coverage enforced
- [Your specific requirements]`}</CodeBlock>
          </div>

          {/* Section 2: Stage Execution Reference */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold mb-3 text-blue-400">
              2. Stage Execution Reference (Required)
            </h3>
            <CodeBlock title="markdown">{`## Stage Execution Protocol

**Read \`STAGE_EXECUTION_FRAMEWORK.md\` for the full protocol.**

Quick reference:
\`\`\`bash
# BEFORE: Initialize the stage
./scripts/init-stage.sh --stage X.X --name "Feature Name" --profile BACKEND

# DURING: Build with TDD (RED → GREEN → REFACTOR)

# AFTER: Verify and complete
./scripts/run-quality-gates.sh --stage X.X 1 2 3 4 5 6 7 8
./scripts/complete-stage.sh --stage X.X --name "Feature Name"
\`\`\``}</CodeBlock>
          </div>

          {/* Section 3: Stage Roadmap */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold mb-3 text-blue-400">3. Stage Roadmap (Required)</h3>
            <CodeBlock title="markdown">{`## Stage Roadmap

### Stage 1.0: [First Feature] 🔴 NOT STARTED
**Goal:** [What you're building]

**Deliverables:**
- [ ] Deliverable 1
- [ ] Deliverable 2
- [ ] Deliverable 3

**Success Criteria:**
- All tests passing
- Coverage ≥90%
- Quality gates pass

### Stage 2.0: [Second Feature] 🔴 NOT STARTED
...`}</CodeBlock>
            <p className="text-gray-400 mt-3">
              <strong>Status indicators:</strong> 🔴 NOT STARTED | 🟡 IN PROGRESS | 🟢 COMPLETE
            </p>
          </div>

          {/* Section 4: Feature Requirements */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold mb-3 text-blue-400">
              4. Feature Requirements (Recommended)
            </h3>
            <CodeBlock title="markdown">{`## Feature Requirements

### [Feature Name]

[Description of what the feature does]

\`\`\`typescript
// Interface or API signature
interface Example {
  property: type;
}
\`\`\`

### Behavior

1. Step 1
2. Step 2
3. Step 3

### Test Cases to Cover

- [ ] Test case 1
- [ ] Test case 2
- [ ] Test case 3`}</CodeBlock>
          </div>

          {/* Section 5: Context Recovery */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold mb-3 text-blue-400">
              5. Context Recovery (Recommended)
            </h3>
            <CodeBlock title="markdown">{`## Context Recovery

If your session resets, recover context:

\`\`\`bash
cat stage-proofs/stage-X.X/.stage-state.yaml
\`\`\`

Then tell Claude: "Read CLAUDE.md and the state file. Continue Stage X.X."`}</CodeBlock>
          </div>
        </Section>

        {/* Best Practices */}
        <Section icon={Settings} title="Best Practices">
          <div className="grid md:grid-cols-2 gap-6">
            {/* DO */}
            <div>
              <h3 className="text-lg font-semibold mb-4 text-green-400 flex items-center gap-2">
                <CheckCircle className="w-5 h-5" />
                DO
              </h3>
              <div className="space-y-4">
                <div className="bg-green-900/10 border border-green-700/30 rounded-lg p-4">
                  <p className="font-medium text-green-400 mb-2">Be specific about your tech stack</p>
                  <CodeBlock>{`**Technology Stack:**
- .NET 8 with ASP.NET Core
- xUnit, Moq, FluentAssertions for testing
- PostgreSQL 15 for storage
- System.Text.Json (not Newtonsoft)`}</CodeBlock>
                </div>
                <div className="bg-green-900/10 border border-green-700/30 rounded-lg p-4">
                  <p className="font-medium text-green-400 mb-2">List your constraints explicitly</p>
                  <CodeBlock>{`**Non-Negotiable Requirements:**
- Test-first development (RED-GREEN-REFACTOR)
- ≥90% code coverage enforced
- Zero tolerance for test failures
- All public methods must have XML documentation`}</CodeBlock>
                </div>
                <div className="bg-green-900/10 border border-green-700/30 rounded-lg p-4">
                  <p className="font-medium text-green-400 mb-2">Keep the stage roadmap updated</p>
                  <ul className="text-sm text-gray-400 space-y-1">
                    <li>• Mark stages complete as you finish them</li>
                    <li>• Update status indicators (🔴 → 🟡 → 🟢)</li>
                    <li>• Add new stages as scope evolves</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* DON'T */}
            <div>
              <h3 className="text-lg font-semibold mb-4 text-red-400 flex items-center gap-2">
                <XCircle className="w-5 h-5" />
                DON&apos;T
              </h3>
              <div className="space-y-4">
                <div className="bg-red-900/10 border border-red-700/30 rounded-lg p-4">
                  <p className="font-medium text-red-400 mb-2">Be vague about requirements</p>
                  <div className="text-sm">
                    <p className="text-gray-500 line-through mb-1"># Bad: Build a good API</p>
                    <p className="text-gray-300"># Good: Build a REST API with GET /users, POST /users...</p>
                  </div>
                </div>
                <div className="bg-red-900/10 border border-red-700/30 rounded-lg p-4">
                  <p className="font-medium text-red-400 mb-2">Include implementation details</p>
                  <ul className="text-sm text-gray-400 space-y-1">
                    <li>• CLAUDE.md is WHAT, not HOW</li>
                    <li>• Let Claude figure out the implementation</li>
                    <li>• Focus on requirements and constraints</li>
                  </ul>
                </div>
                <div className="bg-red-900/10 border border-red-700/30 rounded-lg p-4">
                  <p className="font-medium text-red-400 mb-2">Forget to update it</p>
                  <ul className="text-sm text-gray-400 space-y-1">
                    <li>• Stale CLAUDE.md = stale context</li>
                    <li>• Update after completing stages</li>
                    <li>• Add learnings and constraints as you discover them</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </Section>

        {/* Templates by Project Type */}
        <Section icon={ListTodo} title="Templates by Project Type">
          <div className="space-y-6">
            <div className="bg-gray-800/50 rounded-xl border border-gray-700/50 p-6">
              <h3 className="text-lg font-semibold mb-3">Backend API (REST/GraphQL)</h3>
              <CodeBlock>{`# CLAUDE.md - [API Name]

## Project Overview
REST API for [purpose].

**Technology Stack:**
- [Language] with [Framework]
- [Database]
- [Testing framework]

## Stage Roadmap

### Stage 1.0: Core Models & Database
### Stage 2.0: CRUD Endpoints
### Stage 3.0: Authentication
### Stage 4.0: Authorization
### Stage 5.0: Caching & Performance`}</CodeBlock>
            </div>

            <div className="bg-gray-800/50 rounded-xl border border-gray-700/50 p-6">
              <h3 className="text-lg font-semibold mb-3">Frontend Application</h3>
              <CodeBlock>{`# CLAUDE.md - [App Name]

## Project Overview
[Framework] application for [purpose].

**Technology Stack:**
- React/Vue/Angular with TypeScript
- [State management]
- [UI component library]
- [Testing: Jest, Playwright, etc.]

## Stage Roadmap

### Stage 1.0: Project Setup & Design System
### Stage 2.0: Core Components
### Stage 3.0: State Management
### Stage 4.0: API Integration
### Stage 5.0: Authentication UI`}</CodeBlock>
            </div>

            <div className="bg-gray-800/50 rounded-xl border border-gray-700/50 p-6">
              <h3 className="text-lg font-semibold mb-3">CLI Tool</h3>
              <CodeBlock>{`# CLAUDE.md - [Tool Name]

## Project Overview
CLI tool that [purpose].

**Technology Stack:**
- [Language]
- [CLI framework: Commander, Cobra, etc.]
- [Testing framework]

## Stage Roadmap

### Stage 1.0: Argument Parsing
### Stage 2.0: Core Commands
### Stage 3.0: Configuration
### Stage 4.0: Output Formatting`}</CodeBlock>
            </div>
          </div>
        </Section>

        {/* Pro Tip: Let Claude Help */}
        <div className="bg-gradient-to-r from-purple-900/30 to-pink-900/30 rounded-2xl border border-purple-700/30 p-6 mb-12">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-purple-400" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold mb-2">Pro Tip: Let Claude Help You Write It</h2>
              <p className="text-gray-300 mb-4">
                Here&apos;s a meta trick: <strong>use Claude to create your CLAUDE.md file</strong>.
                Just describe your project and constraints, and Claude will generate a well-structured
                spec for you to refine.
              </p>
              <p className="text-gray-400 text-sm mb-3">
                Try this prompt to get started:
              </p>
              <div className="bg-black/30 rounded-lg p-4 border border-purple-500/20">
                <pre className="text-sm text-gray-200 whitespace-pre-wrap font-mono">{`I'm starting a new [backend API / frontend app / CLI tool] project using [your tech stack].

Help me create a CLAUDE.md file following the spec-driven development framework. Include:
- Project overview with my tech stack
- Non-negotiable requirements (TDD, 90% coverage)
- A stage roadmap for [describe your feature goals]
- Context recovery instructions

My specific constraints:
- [List any architectural requirements]
- [List any testing requirements]
- [List any other constraints]`}</pre>
              </div>
              <p className="text-gray-400 text-sm mt-3">
                Claude will generate a complete CLAUDE.md that you can then customize. This is exactly
                how we&apos;ve been working throughout this training!
              </p>
            </div>
          </div>
        </div>

        {/* Context Recovery */}
        <Section icon={RefreshCw} title="Context Recovery">
          <p className="text-gray-300 mb-4">
            Add this section to your CLAUDE.md so you (and future-you) know how to recover context:
          </p>
          <CodeBlock title="markdown">{`## Context Recovery

\`\`\`bash
cat stage-proofs/stage-X.X/.stage-state.yaml
\`\`\`

Then: "Read CLAUDE.md and the state file. Continue Stage X.X."`}</CodeBlock>
        </Section>

        {/* Managing Over Time */}
        <Section icon={Archive} title="Managing Your CLAUDE.md Over Time">
          <p className="text-gray-300 mb-4">
            As your project grows, CLAUDE.md can get long. Here&apos;s how to keep it manageable:
          </p>

          <div className="space-y-4">
            <div className="bg-gray-800/50 rounded-xl border border-gray-700/50 p-4">
              <h4 className="font-semibold text-yellow-400 mb-2">Archive Completed Stages</h4>
              <p className="text-gray-400 text-sm mb-3">
                Move detailed specs for completed stages to a separate file. Keep just a summary in CLAUDE.md.
              </p>
              <CodeBlock title="CLAUDE.md (after archiving)">{`## Completed Stages

**Stages 1-5:** See \`COMPLETED_STAGES_ARCHIVE.md\` for detailed specs.

| Stage | Summary | Proof |
|-------|---------|-------|
| 1.0 | Core models & DB schema | STAGE_1.0_PROOF.md |
| 2.0 | CRUD endpoints | STAGE_2.0_PROOF.md |
| 3.0 | Authentication | STAGE_3.0_PROOF.md |
| 4.0 | Authorization | STAGE_4.0_PROOF.md |
| 5.0 | Caching | STAGE_5.0_PROOF.md |

## Active Roadmap

### Stage 6.0: Real-time Updates 🟡 IN PROGRESS
...`}</CodeBlock>
            </div>

            <div className="bg-gray-800/50 rounded-xl border border-gray-700/50 p-4">
              <h4 className="font-semibold text-green-400 mb-2">What to Keep vs Archive</h4>
              <div className="grid md:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-green-400 font-medium mb-2">Keep in CLAUDE.md:</p>
                  <ul className="text-gray-400 space-y-1">
                    <li>• Project overview & tech stack</li>
                    <li>• Non-negotiable requirements</li>
                    <li>• Current/next stage details</li>
                    <li>• Architecture notes (if still relevant)</li>
                    <li>• Context recovery instructions</li>
                  </ul>
                </div>
                <div>
                  <p className="text-blue-400 font-medium mb-2">Move to Archive:</p>
                  <ul className="text-gray-400 space-y-1">
                    <li>• Completed stage detailed specs</li>
                    <li>• Old feature requirements</li>
                    <li>• Superseded architecture decisions</li>
                    <li>• Historical test case lists</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="bg-gray-800/50 rounded-xl border border-gray-700/50 p-4">
              <h4 className="font-semibold text-purple-400 mb-2">When to Archive</h4>
              <p className="text-gray-400 text-sm">
                A good rule of thumb: archive when CLAUDE.md exceeds <strong className="text-white">~500 lines</strong> or
                when you have <strong className="text-white">5+ completed stages</strong>. The goal is to keep CLAUDE.md
                focused on <em>what&apos;s relevant now</em>, while the archive preserves the full history.
              </p>
            </div>

            <div className="bg-gradient-to-r from-cyan-900/20 to-blue-900/20 rounded-xl border border-cyan-700/30 p-4">
              <h4 className="font-semibold text-cyan-400 mb-2">💡 Separate Stage Plans for Complex Work</h4>
              <p className="text-gray-400 text-sm mb-3">
                Not everything has to live in CLAUDE.md! For complex stages, create a separate stage plan file
                that Claude can reference. This keeps your main spec clean while providing deep detail when needed.
              </p>
              <CodeBlock title="Example: stage-plans/STAGE_5_PLAN.md">{`# Stage 5: Authentication System - Detailed Plan

## Overview
This stage implements OAuth2 + JWT authentication.

## Technical Design
[Detailed architecture decisions, diagrams, etc.]

## Implementation Steps
1. Token service with refresh handling
2. OAuth2 provider integration (Google, GitHub)
3. Session management
4. Rate limiting on auth endpoints

## Test Scenarios
- Happy path flows
- Token expiry handling
- Concurrent session limits
- Attack vectors to test against

## Open Questions
- Redis vs in-memory for session store?
- Token expiry: 15min or 1hr?`}</CodeBlock>
              <p className="text-gray-400 text-sm mt-3">
                <strong className="text-white">When to use:</strong> Stages with complex architecture decisions,
                multiple sub-tasks, or when you want to preserve detailed planning notes that would clutter CLAUDE.md.
              </p>
              <p className="text-gray-400 text-sm mt-2">
                <strong className="text-cyan-400">Reference it:</strong> In CLAUDE.md, just add{' '}
                <code className="bg-gray-800 px-1 rounded">See stage-plans/STAGE_5_PLAN.md for detailed design</code>
              </p>
            </div>
          </div>
        </Section>

        {/* Quick Start Checklist */}
        <div className="bg-blue-900/20 border border-blue-700/50 rounded-2xl p-6 mb-8">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <CheckCircle className="w-6 h-6 text-blue-400" />
            Quick Start Checklist
          </h2>
          <div className="space-y-3">
            {[
              'Create CLAUDE.md in your project root',
              'Add Project Overview with tech stack',
              'Add Non-Negotiable Requirements',
              'Reference STAGE_EXECUTION_FRAMEWORK.md',
              'Create your Stage Roadmap',
              'Add feature requirements for Stage 1',
              'Include context recovery instructions',
              'Copy the stage execution scripts to scripts/',
            ].map((item, i) => (
              <label key={i} className="flex items-center gap-3 text-gray-300 cursor-pointer">
                <input type="checkbox" className="w-5 h-5 rounded bg-gray-700 border-gray-600" />
                {item}
              </label>
            ))}
          </div>
          <p className="text-gray-400 mt-4">
            <strong>Time to create:</strong> ~15-30 minutes
          </p>
        </div>

        {/* Footer message */}
        <div className="text-center text-gray-400 pb-8">
          <p className="text-lg">
            Your CLAUDE.md is your project&apos;s single source of truth.
            <br />
            <strong className="text-white">Keep it updated, and Claude will always know exactly where you are.</strong>
          </p>
        </div>
      </div>
    </div>
  );
}
