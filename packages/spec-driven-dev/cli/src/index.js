#!/usr/bin/env node

import chalk from 'chalk';
import Enquirer from 'enquirer';
import ora from 'ora';

const { prompt } = Enquirer;
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Banner
console.log(chalk.cyan.bold(`
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║   ${chalk.white.bold('Spec-Driven Development Setup')}                            ║
║   ${chalk.gray('with Claude Code + Stage Execution Framework')}               ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
`));

console.log(chalk.gray('This CLI will help you set up your repository for spec-driven development.\n'));

async function main() {
  try {
    // ==================== PROJECT BASICS ====================
    console.log(chalk.cyan.bold('\n📋 Project Basics\n'));

    const basics = await prompt([
      {
        type: 'input',
        name: 'projectName',
        message: 'Project name:',
        initial: path.basename(process.cwd()),
      },
      {
        type: 'input',
        name: 'projectDescription',
        message: 'Brief project description (1-2 sentences):',
        validate: (v) => v.length > 10 || 'Please provide a meaningful description',
      },
      {
        type: 'select',
        name: 'projectType',
        message: 'What type of project is this?',
        choices: [
          { name: 'api', message: 'Backend API / Service' },
          { name: 'fullstack', message: 'Full-Stack Application' },
          { name: 'frontend', message: 'Frontend Only (SPA/PWA)' },
          { name: 'library', message: 'Library / Package' },
          { name: 'cli', message: 'CLI Tool' },
          { name: 'other', message: 'Other' },
        ],
      },
      {
        type: 'confirm',
        name: 'isMonorepo',
        message: 'Is this a monorepo (multiple packages/apps)?',
        initial: false,
      },
    ]);

    // Monorepo follow-up
    let monorepoConfig = {};
    if (basics.isMonorepo) {
      console.log(chalk.cyan.bold('\n📦 Monorepo Configuration\n'));
      monorepoConfig = await prompt([
        {
          type: 'select',
          name: 'monorepoTool',
          message: 'Monorepo tooling:',
          choices: [
            { name: 'turborepo', message: 'Turborepo' },
            { name: 'nx', message: 'Nx' },
            { name: 'lerna', message: 'Lerna' },
            { name: 'pnpm', message: 'pnpm workspaces' },
            { name: 'yarn', message: 'Yarn workspaces' },
            { name: 'npm', message: 'npm workspaces' },
            { name: 'dotnet', message: '.NET Solution' },
            { name: 'other', message: 'Other' },
          ],
        },
        {
          type: 'input',
          name: 'packagesDir',
          message: 'Packages directory (e.g., packages/, apps/, src/):',
          initial: 'packages/',
        },
      ]);
    }

    // ==================== TECH STACK ====================
    console.log(chalk.cyan.bold('\n🛠️  Technology Stack\n'));

    const techStack = await prompt([
      {
        type: 'select',
        name: 'primaryLanguage',
        message: 'Primary programming language:',
        choices: [
          { name: 'typescript', message: 'TypeScript' },
          { name: 'javascript', message: 'JavaScript' },
          { name: 'csharp', message: 'C# (.NET)' },
          { name: 'python', message: 'Python' },
          { name: 'go', message: 'Go' },
          { name: 'rust', message: 'Rust' },
          { name: 'java', message: 'Java' },
          { name: 'other', message: 'Other' },
        ],
      },
      {
        type: 'input',
        name: 'framework',
        message: 'Primary framework/runtime (e.g., Next.js, Express, ASP.NET Core, FastAPI):',
      },
      {
        type: 'input',
        name: 'additionalTech',
        message: 'Other key technologies (comma-separated, e.g., PostgreSQL, Redis, Docker):',
      },
    ]);

    // ==================== FRONTEND DETAILS ====================
    let frontendConfig = {};
    if (basics.projectType === 'frontend' || basics.projectType === 'fullstack') {
      console.log(chalk.cyan.bold('\n🎨 Frontend Configuration\n'));
      frontendConfig = await prompt([
        {
          type: 'select',
          name: 'uiFramework',
          message: 'UI Framework:',
          choices: [
            { name: 'react', message: 'React' },
            { name: 'nextjs', message: 'Next.js' },
            { name: 'vue', message: 'Vue.js' },
            { name: 'nuxt', message: 'Nuxt' },
            { name: 'angular', message: 'Angular' },
            { name: 'svelte', message: 'Svelte / SvelteKit' },
            { name: 'solid', message: 'SolidJS' },
            { name: 'astro', message: 'Astro' },
            { name: 'other', message: 'Other' },
          ],
        },
        {
          type: 'select',
          name: 'styling',
          message: 'Styling approach:',
          choices: [
            { name: 'tailwind', message: 'Tailwind CSS' },
            { name: 'css-modules', message: 'CSS Modules' },
            { name: 'styled-components', message: 'Styled Components' },
            { name: 'emotion', message: 'Emotion' },
            { name: 'sass', message: 'Sass/SCSS' },
            { name: 'vanilla', message: 'Vanilla CSS' },
            { name: 'other', message: 'Other' },
          ],
        },
        {
          type: 'select',
          name: 'stateManagement',
          message: 'State management:',
          choices: [
            { name: 'none', message: 'None / React hooks only' },
            { name: 'zustand', message: 'Zustand' },
            { name: 'redux', message: 'Redux Toolkit' },
            { name: 'jotai', message: 'Jotai' },
            { name: 'recoil', message: 'Recoil' },
            { name: 'pinia', message: 'Pinia (Vue)' },
            { name: 'ngrx', message: 'NgRx (Angular)' },
            { name: 'other', message: 'Other' },
          ],
        },
        {
          type: 'select',
          name: 'componentLibrary',
          message: 'Component library (optional):',
          choices: [
            { name: 'none', message: 'None / Custom components' },
            { name: 'shadcn', message: 'shadcn/ui' },
            { name: 'radix', message: 'Radix UI' },
            { name: 'mui', message: 'Material UI (MUI)' },
            { name: 'chakra', message: 'Chakra UI' },
            { name: 'antd', message: 'Ant Design' },
            { name: 'headless', message: 'Headless UI' },
            { name: 'other', message: 'Other' },
          ],
        },
        {
          type: 'confirm',
          name: 'useStorybook',
          message: 'Include Storybook for component development?',
          initial: true,
        },
        {
          type: 'confirm',
          name: 'useAccessibility',
          message: 'Include accessibility (a11y) testing?',
          initial: true,
        },
      ]);
    }

    // ==================== BACKEND DETAILS ====================
    let backendConfig = {};
    if (basics.projectType === 'api' || basics.projectType === 'fullstack') {
      console.log(chalk.cyan.bold('\n⚙️  Backend Configuration\n'));
      backendConfig = await prompt([
        {
          type: 'select',
          name: 'apiStyle',
          message: 'API style:',
          choices: [
            { name: 'rest', message: 'REST' },
            { name: 'graphql', message: 'GraphQL' },
            { name: 'grpc', message: 'gRPC' },
            { name: 'trpc', message: 'tRPC' },
            { name: 'mixed', message: 'Mixed' },
          ],
        },
        {
          type: 'select',
          name: 'database',
          message: 'Primary database:',
          choices: [
            { name: 'postgres', message: 'PostgreSQL' },
            { name: 'mysql', message: 'MySQL / MariaDB' },
            { name: 'mongodb', message: 'MongoDB' },
            { name: 'sqlite', message: 'SQLite' },
            { name: 'sqlserver', message: 'SQL Server' },
            { name: 'dynamodb', message: 'DynamoDB' },
            { name: 'none', message: 'None / External' },
            { name: 'other', message: 'Other' },
          ],
        },
        {
          type: 'confirm',
          name: 'useDocker',
          message: 'Include Docker configuration?',
          initial: true,
        },
      ]);
    }

    // ==================== TESTING ====================
    console.log(chalk.cyan.bold('\n🧪 Testing Strategy\n'));

    const testing = await prompt([
      {
        type: 'input',
        name: 'testFramework',
        message: 'Test framework (e.g., Jest, Vitest, xUnit, pytest):',
        initial: getDefaultTestFramework(techStack.primaryLanguage),
      },
      {
        type: 'numeral',
        name: 'coverageTarget',
        message: 'Target code coverage percentage:',
        initial: 90,
        min: 50,
        max: 100,
      },
      {
        type: 'confirm',
        name: 'mutationTesting',
        message: 'Include mutation testing (Stryker/mutmut)?',
        initial: false,
      },
      {
        type: 'confirm',
        name: 'e2eTesting',
        message: 'Include E2E testing (Playwright/Cypress)?',
        initial: basics.projectType === 'frontend' || basics.projectType === 'fullstack',
      },
    ]);

    // ==================== QUALITY STANDARDS ====================
    console.log(chalk.cyan.bold('\n✅ Quality Standards\n'));

    const quality = await prompt([
      {
        type: 'multiselect',
        name: 'nonNegotiables',
        message: 'Select non-negotiable requirements:',
        choices: [
          { name: 'tdd', message: 'Test-first development (TDD)', value: 'tdd' },
          { name: 'coverage', message: `Code coverage ≥${testing.coverageTarget}%`, value: 'coverage' },
          { name: 'noWarnings', message: 'Zero compiler warnings', value: 'noWarnings' },
          { name: 'linting', message: 'Linting must pass', value: 'linting' },
          { name: 'security', message: 'Zero security vulnerabilities', value: 'security' },
          { name: 'noSkippedTests', message: 'No skipped tests allowed', value: 'noSkippedTests' },
        ],
        initial: ['tdd', 'coverage', 'linting', 'security'],
      },
      {
        type: 'confirm',
        name: 'strictMode',
        message: 'Enable strict mode (fail-fast on any gate failure)?',
        initial: true,
      },
    ]);

    // ==================== STAGES ====================
    console.log(chalk.cyan.bold('\n📦 Initial Stage Planning\n'));

    const stages = await prompt([
      {
        type: 'input',
        name: 'firstStageName',
        message: 'Name of your first stage (e.g., "Foundation", "Core Models", "Authentication"):',
        initial: 'Foundation',
      },
      {
        type: 'input',
        name: 'firstStageGoal',
        message: 'What will Stage 1 deliver?',
        validate: (v) => v.length > 5 || 'Please describe what Stage 1 will deliver',
      },
      {
        type: 'list',
        name: 'firstStageDeliverables',
        message: 'Stage 1 deliverables (comma-separated):',
      },
      {
        type: 'input',
        name: 'futureStages',
        message: 'Briefly describe 2-3 future stages (optional):',
      },
    ]);

    // ==================== AI PREFERENCES ====================
    console.log(chalk.cyan.bold('\n🤖 Claude Code Preferences\n'));

    const aiPrefs = await prompt([
      {
        type: 'multiselect',
        name: 'aiGuidelines',
        message: 'Select AI coding guidelines:',
        choices: [
          { name: 'testsFirst', message: 'Always write tests before implementation' },
          { name: 'smallCommits', message: 'Prefer small, focused commits' },
          { name: 'explainDecisions', message: 'Explain architectural decisions' },
          { name: 'askBeforeRefactor', message: 'Ask before major refactoring' },
          { name: 'preferSimple', message: 'Prefer simple solutions over clever ones' },
          { name: 'documentPublicAPIs', message: 'Document all public APIs' },
        ],
        initial: ['testsFirst', 'smallCommits', 'preferSimple'],
      },
      {
        type: 'input',
        name: 'customConstraints',
        message: 'Any custom constraints for Claude (e.g., "no ORM", "avoid classes"):',
      },
    ]);

    // ==================== GENERATE FILES ====================
    console.log(chalk.cyan.bold('\n🚀 Generating Files\n'));

    const spinner = ora('Creating spec-driven setup...').start();

    // Collect all answers
    const config = {
      ...basics,
      ...monorepoConfig,
      ...techStack,
      ...frontendConfig,
      ...backendConfig,
      ...testing,
      ...quality,
      ...stages,
      ...aiPrefs,
    };

    // Create directories
    const dirs = [
      'scripts',
      'stage-proofs',
      '.claude',
    ];

    for (const dir of dirs) {
      const dirPath = path.join(process.cwd(), dir);
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }
    }

    spinner.text = 'Generating CLAUDE.md...';

    // Generate CLAUDE.md
    const claudeMd = generateClaudeMd(config);
    fs.writeFileSync(path.join(process.cwd(), 'CLAUDE.md'), claudeMd);

    spinner.text = 'Generating STAGE_EXECUTION_FRAMEWORK.md...';

    // Generate Stage Execution Framework
    const stageFramework = generateStageFramework(config);
    fs.writeFileSync(path.join(process.cwd(), 'STAGE_EXECUTION_FRAMEWORK.md'), stageFramework);

    spinner.text = 'Generating STAGE_PROOF_TEMPLATE.md...';

    // Generate Proof Template
    const proofTemplate = generateProofTemplate(config);
    fs.writeFileSync(path.join(process.cwd(), 'STAGE_PROOF_TEMPLATE.md'), proofTemplate);

    spinner.text = 'Generating scripts...';

    // Generate scripts
    const initStageScript = generateInitStageScript(config);
    fs.writeFileSync(path.join(process.cwd(), 'scripts', 'init-stage.sh'), initStageScript);
    fs.chmodSync(path.join(process.cwd(), 'scripts', 'init-stage.sh'), '755');

    const runGatesScript = generateRunGatesScript(config);
    fs.writeFileSync(path.join(process.cwd(), 'scripts', 'run-quality-gates.sh'), runGatesScript);
    fs.chmodSync(path.join(process.cwd(), 'scripts', 'run-quality-gates.sh'), '755');

    const completeStageScript = generateCompleteStageScript(config);
    fs.writeFileSync(path.join(process.cwd(), 'scripts', 'complete-stage.sh'), completeStageScript);
    fs.chmodSync(path.join(process.cwd(), 'scripts', 'complete-stage.sh'), '755');

    spinner.text = 'Generating .claude/settings.json...';

    // Generate Claude settings
    const claudeSettings = generateClaudeSettings(config);
    fs.writeFileSync(path.join(process.cwd(), '.claude', 'settings.json'), JSON.stringify(claudeSettings, null, 2));

    spinner.succeed(chalk.green('Setup complete!'));

    // ==================== SUMMARY ====================
    console.log(chalk.cyan.bold('\n✨ Files Created:\n'));
    console.log(chalk.white('  📄 CLAUDE.md                      - Project specification'));
    console.log(chalk.white('  📄 STAGE_EXECUTION_FRAMEWORK.md   - Stage workflow protocol'));
    console.log(chalk.white('  📄 STAGE_PROOF_TEMPLATE.md        - Template for completion proofs'));
    console.log(chalk.white('  📁 scripts/'));
    console.log(chalk.white('     ├── init-stage.sh              - Initialize a new stage'));
    console.log(chalk.white('     ├── run-quality-gates.sh       - Run quality gates'));
    console.log(chalk.white('     └── complete-stage.sh          - Complete and tag a stage'));
    console.log(chalk.white('  📁 .claude/'));
    console.log(chalk.white('     └── settings.json              - Claude Code settings'));
    console.log(chalk.white('  📁 stage-proofs/                  - Stage completion artifacts'));

    console.log(chalk.cyan.bold('\n🎯 Next Steps:\n'));
    console.log(chalk.white('  1. Review and customize CLAUDE.md'));
    console.log(chalk.white('  2. Open Claude Code in this directory'));
    console.log(chalk.white(`  3. Tell Claude: "Read CLAUDE.md - we're starting Stage 1: ${stages.firstStageName}"`));
    console.log(chalk.white('  4. Follow TDD: RED → GREEN → REFACTOR'));
    console.log(chalk.white('  5. Run quality gates: ./scripts/run-quality-gates.sh --stage 1'));
    console.log(chalk.white('  6. Complete stage: ./scripts/complete-stage.sh --stage 1 --name "' + stages.firstStageName + '"'));

    console.log(chalk.gray('\n─────────────────────────────────────────────────────────────────'));
    console.log(chalk.cyan('Happy spec-driven development! 🚀\n'));

  } catch (error) {
    if (error.message === '') {
      // User cancelled
      console.log(chalk.yellow('\n\nSetup cancelled.\n'));
    } else {
      console.error(chalk.red('\nError:'), error.message);
    }
    process.exit(1);
  }
}

// ==================== HELPER FUNCTIONS ====================

function getDefaultTestFramework(language) {
  const defaults = {
    typescript: 'Vitest',
    javascript: 'Jest',
    csharp: 'xUnit',
    python: 'pytest',
    go: 'go test',
    rust: 'cargo test',
    java: 'JUnit',
  };
  return defaults[language] || 'Jest';
}

function generateClaudeMd(config) {
  const nonNegotiables = config.nonNegotiables.map((n) => {
    const labels = {
      tdd: 'Test-first development (RED-GREEN-REFACTOR)',
      coverage: `Code coverage ≥${config.coverageTarget}% enforced`,
      noWarnings: 'Zero compiler warnings',
      linting: 'Linting must pass (0 errors)',
      security: 'Zero security vulnerabilities',
      noSkippedTests: 'No skipped tests allowed',
    };
    return `- ✅ ${labels[n]}`;
  }).join('\n');

  const aiGuidelines = config.aiGuidelines.map((g) => {
    const labels = {
      testsFirst: 'Always write tests BEFORE implementation code',
      smallCommits: 'Prefer small, focused commits over large changes',
      explainDecisions: 'Explain architectural decisions in comments or docs',
      askBeforeRefactor: 'Ask before major refactoring',
      preferSimple: 'Prefer simple, readable solutions over clever ones',
      documentPublicAPIs: 'Document all public APIs with clear descriptions',
    };
    return `- ${labels[g]}`;
  }).join('\n');

  const deliverables = config.firstStageDeliverables.map((d) => `- [ ] ${d.trim()}`).join('\n');

  // Build frontend section if applicable
  const frontendSection = config.uiFramework ? `
### Frontend
- **UI Framework:** ${config.uiFramework}
- **Styling:** ${config.styling}
- **State Management:** ${config.stateManagement}
- **Component Library:** ${config.componentLibrary || 'Custom'}
${config.useStorybook ? '- **Storybook:** Enabled' : ''}
${config.useAccessibility ? '- **Accessibility Testing:** Enabled' : ''}` : '';

  // Build backend section if applicable
  const backendSection = config.apiStyle ? `
### Backend
- **API Style:** ${config.apiStyle}
- **Database:** ${config.database}
${config.useDocker ? '- **Docker:** Enabled' : ''}` : '';

  // Build monorepo section if applicable
  const monorepoSection = config.isMonorepo ? `
### Monorepo
- **Tooling:** ${config.monorepoTool}
- **Packages Directory:** ${config.packagesDir}` : '';

  return `# CLAUDE.md - ${config.projectName}

## Project Overview

${config.projectDescription}

**Project Type:** ${config.projectType}${config.isMonorepo ? ' (Monorepo)' : ''}

---

## Technology Stack

### Core
- **Language:** ${config.primaryLanguage}
- **Framework:** ${config.framework}
- **Additional:** ${config.additionalTech || 'N/A'}
- **Testing:** ${config.testFramework}
${config.mutationTesting ? '- **Mutation Testing:** Enabled' : ''}
${config.e2eTesting ? '- **E2E Testing:** Enabled' : ''}
${frontendSection}${backendSection}${monorepoSection}

---

## Non-Negotiable Requirements

${nonNegotiables}

---

## Stage Execution Protocol (MANDATORY)

> **Read STAGE_EXECUTION_FRAMEWORK.md before starting any stage.**

### Every Stage: 3 Commands

\`\`\`bash
# 1. BEFORE: Initialize stage
./scripts/init-stage.sh --stage 1 --name "Stage Name"

# 2. DURING: Implement with TDD (RED → GREEN → REFACTOR)

# 3. AFTER: Run gates then complete
./scripts/run-quality-gates.sh --stage 1
./scripts/complete-stage.sh --stage 1 --name "Stage Name"
\`\`\`

---

## Claude Code Guidelines

${aiGuidelines}
${config.customConstraints ? `\n**Custom Constraints:**\n- ${config.customConstraints}` : ''}

---

## Stage Roadmap

### Stage 1: ${config.firstStageName} 🔴 NOT STARTED

**Goal:** ${config.firstStageGoal}

**Deliverables:**
${deliverables}

**Success Criteria:**
- All tests passing
- Coverage ≥${config.coverageTarget}%
- Quality gates pass

${config.futureStages ? `---

### Future Stages (Planned)

${config.futureStages}
` : ''}
---

## Development Workflow

### TDD Cycle (RED-GREEN-REFACTOR)

\`\`\`
┌───────────────────────────────────────┐
│  RED → GREEN → REFACTOR → COMMIT      │
│         ↑_____________________↓       │
└───────────────────────────────────────┘
\`\`\`

1. **RED:** Write a failing test
2. **GREEN:** Write minimum code to pass
3. **REFACTOR:** Improve while keeping tests green
4. **COMMIT:** Only when tests pass

---

## Quality Gates

| Gate | Check | Fail Condition |
|------|-------|----------------|
| 1 | No Template Files | Boilerplate files found |
| 2 | Linting | Style violations |
| 3 | Clean Build | Errors or warnings |
| 4 | Type Safety | Type errors |
| 5 | All Tests Pass | Failures or skips |
| 6 | Coverage ≥${config.coverageTarget}% | Below threshold |
| 7 | Security Scan | Vulnerabilities found |
| 8 | Proof Complete | [TBD] placeholders remain |

---

**This is your specification. Claude Code reads it and follows it. Quality is enforced, not hoped for.**
`;
}

function generateStageFramework(config) {
  return `# Stage Execution Framework

## Overview

This document defines the stage execution protocol for spec-driven development.
Every stage follows the same workflow: **BEFORE → DURING → AFTER**.

---

## Stage Lifecycle

### BEFORE: Initialize

\`\`\`bash
./scripts/init-stage.sh --stage <number> --name "Stage Name"
\`\`\`

This creates:
- \`stage-proofs/stage-<N>/\` directory
- Proof file template
- State tracking file (\`.stage-state.yaml\`)

### DURING: Build with TDD

Follow the RED → GREEN → REFACTOR cycle:

1. **RED:** Write a failing test first
2. **GREEN:** Write minimum code to make it pass
3. **REFACTOR:** Improve code while keeping tests green
4. **REPEAT:** Until all deliverables complete

Claude Code assists here - it knows to write tests first because CLAUDE.md says so.

### AFTER: Verify and Complete

\`\`\`bash
./scripts/run-quality-gates.sh --stage <number>
./scripts/complete-stage.sh --stage <number> --name "Stage Name"
\`\`\`

This:
- Runs all quality gates (fails fast on first failure)
- Updates the proof file with metrics
- Creates a git tag: \`stage-<N>-complete\`
- Updates CHANGELOG.md (if exists)

---

## Context Recovery

Lost context? Session reset? Recover instantly:

\`\`\`bash
cat stage-proofs/stage-<N>/.stage-state.yaml
\`\`\`

This shows:
- Current phase (BEFORE/DURING/AFTER)
- Deliverable status
- Last activity timestamp

Tell Claude: "Read STAGE_EXECUTION_FRAMEWORK.md and the state file. Continue Stage <N>."

---

## Quality Gates

Gates run in order. First failure stops execution.

| Gate | Check | ${config.primaryLanguage === 'typescript' || config.primaryLanguage === 'javascript' ? 'TS/JS' : config.primaryLanguage} |
|------|-------|-----|
| 1 | No Template Files | ✓ |
| 2 | Linting & Style | ✓ |
| 3 | Clean Build | ✓ |
| 4 | Type Safety | ${config.primaryLanguage === 'typescript' ? '✓' : 'N/A'} |
| 5 | All Tests Pass | ✓ |
| 6 | Coverage ≥${config.coverageTarget}% | ✓ |
| 7 | Security Scan | ✓ |
| 8 | Proof Complete | ✓ |
${config.mutationTesting ? '| 9 | Mutation Score ≥80% | ✓ |' : ''}
${config.e2eTesting ? '| 15 | E2E Tests Pass | ✓ |' : ''}

---

## Stage Numbering

- Major stages: 1, 2, 3, ...
- Sub-stages: 1.1, 1.2, 2.1, ...
- Parallel stages: Use git worktrees

---

## Proof Files

Every completed stage has a proof file documenting:
- Tests passed/total
- Coverage percentage
- Vulnerabilities found
- Gate results
- Deliverables completed

No more "I think it's done" - **metrics prove completion**.

---

## Non-Negotiable Rules

1. **No stage starts without \`init-stage.sh\`**
2. **Tests are written BEFORE implementation**
3. **All gates must pass before completion**
4. **Proof files document everything**
5. **Git tag marks stage completion**

---

**Follow this protocol. Every stage. No exceptions.**
`;
}

function generateProofTemplate(config) {
  return `# Stage [NUMBER] Completion Proof: [STAGE_NAME]

## TL;DR
> [One sentence summary of what was delivered]

## Deliverables

| Deliverable | Status | Notes |
|-------------|--------|-------|
| [TBD] | [TBD] | [TBD] |

## Key Metrics

- **Tests:** [X]/[X] passing (100%)
- **Coverage:** [X]% statements, [X]% branches
- **Vulnerabilities:** [X] production, [X] dev
${config.mutationTesting ? '- **Mutation Score:** [X]%' : ''}

## Quality Gates

| Gate | Result | Notes |
|------|--------|-------|
| 1 - No Templates | [TBD] | |
| 2 - Linting | [TBD] | |
| 3 - Build | [TBD] | |
| 4 - Types | [TBD] | |
| 5 - Tests | [TBD] | |
| 6 - Coverage | [TBD] | |
| 7 - Security | [TBD] | |
| 8 - Proof | [TBD] | |

## Files Changed

\`\`\`
[TBD] - list key files added/modified
\`\`\`

## What's Next

[TBD] - Brief description of next stage

---

**Status:** [TBD] ✅ READY FOR NEXT STAGE / ❌ BLOCKED

**Completed:** [DATE]
**Git Tag:** \`stage-[NUMBER]-complete\`
`;
}

function generateInitStageScript(config) {
  return `#!/usr/bin/env bash

###############################################################################
# Stage Initialization Script
#
# Usage:
#   ./scripts/init-stage.sh --stage <number> --name "Stage Name"
#
###############################################################################

set -euo pipefail

RED='\\033[0;31m'
GREEN='\\033[0;32m'
BLUE='\\033[0;34m'
BOLD='\\033[1m'
NC='\\033[0m'

STAGE_NUM=""
STAGE_NAME=""

while [[ $# -gt 0 ]]; do
  case $1 in
    --stage) STAGE_NUM="$2"; shift 2 ;;
    --name) STAGE_NAME="$2"; shift 2 ;;
    *) echo -e "\${RED}Unknown option: $1\${NC}"; exit 1 ;;
  esac
done

if [[ -z "$STAGE_NUM" || -z "$STAGE_NAME" ]]; then
  echo -e "\${RED}Usage: $0 --stage <number> --name \\"Stage Name\\"\${NC}"
  exit 1
fi

STAGE_DIR="stage-proofs/stage-\${STAGE_NUM}"

echo -e "\${BLUE}\${BOLD}Initializing Stage \${STAGE_NUM}: \${STAGE_NAME}\${NC}"

# Create stage directory
mkdir -p "\${STAGE_DIR}/reports/gates"

# Create state file
cat > "\${STAGE_DIR}/.stage-state.yaml" <<EOF
stage: "\${STAGE_NUM}"
name: "\${STAGE_NAME}"
phase: "DURING"
started_at: "$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
current_task: "Starting implementation"
deliverables: []
EOF

# Copy proof template
if [[ -f "STAGE_PROOF_TEMPLATE.md" ]]; then
  sed -e "s/\\[NUMBER\\]/\${STAGE_NUM}/g" -e "s/\\[STAGE_NAME\\]/\${STAGE_NAME}/g" \\
    STAGE_PROOF_TEMPLATE.md > "\${STAGE_DIR}/STAGE_\${STAGE_NUM}_PROOF.md"
fi

echo -e "\${GREEN}✅ Stage \${STAGE_NUM} initialized\${NC}"
echo -e "   📁 \${STAGE_DIR}/"
echo -e "   📄 \${STAGE_DIR}/STAGE_\${STAGE_NUM}_PROOF.md"
echo -e "   📄 \${STAGE_DIR}/.stage-state.yaml"
echo ""
echo -e "\${BOLD}Next: Implement with TDD (RED → GREEN → REFACTOR)\${NC}"
`;
}

function generateRunGatesScript(config) {
  const coverageThreshold = config.coverageTarget;
  const language = config.primaryLanguage;

  let testCommand = 'npm test';
  let coverageCommand = 'npm run test:coverage';
  let lintCommand = 'npm run lint';
  let buildCommand = 'npm run build';
  let typeCheckCommand = 'npm run type-check';
  let securityCommand = 'npm audit --audit-level=high';

  if (language === 'csharp') {
    testCommand = 'dotnet test';
    coverageCommand = 'dotnet test --collect:"XPlat Code Coverage"';
    lintCommand = 'dotnet format --verify-no-changes';
    buildCommand = 'dotnet build --warnaserror';
    typeCheckCommand = 'echo "N/A for .NET"';
    securityCommand = 'dotnet list package --vulnerable';
  } else if (language === 'python') {
    testCommand = 'pytest';
    coverageCommand = 'pytest --cov --cov-report=term-missing';
    lintCommand = 'ruff check .';
    buildCommand = 'echo "N/A for Python"';
    typeCheckCommand = 'mypy .';
    securityCommand = 'pip-audit';
  } else if (language === 'go') {
    testCommand = 'go test ./...';
    coverageCommand = 'go test -coverprofile=coverage.out ./...';
    lintCommand = 'golangci-lint run';
    buildCommand = 'go build ./...';
    typeCheckCommand = 'echo "N/A for Go"';
    securityCommand = 'govulncheck ./...';
  }

  return `#!/usr/bin/env bash

###############################################################################
# Quality Gate Runner Script
#
# Usage:
#   ./scripts/run-quality-gates.sh --stage <number>
#   ./scripts/run-quality-gates.sh --stage <number> 1 2 3 4 5 6 7 8
#
###############################################################################

set -euo pipefail

RED='\\033[0;31m'
GREEN='\\033[0;32m'
YELLOW='\\033[1;33m'
BLUE='\\033[0;34m'
BOLD='\\033[1m'
NC='\\033[0m'

STAGE_NUM=""
GATES=()

while [[ $# -gt 0 ]]; do
  case $1 in
    --stage) STAGE_NUM="$2"; shift 2 ;;
    [0-9]*) GATES+=("$1"); shift ;;
    *) shift ;;
  esac
done

if [[ -z "$STAGE_NUM" ]]; then
  echo -e "\${RED}Usage: $0 --stage <number> [gate numbers]\${NC}"
  exit 1
fi

# Default to all gates if none specified
if [[ \${#GATES[@]} -eq 0 ]]; then
  GATES=(1 2 3 4 5 6 7 8)
fi

STAGE_DIR="stage-proofs/stage-\${STAGE_NUM}"
REPORT_DIR="\${STAGE_DIR}/reports/gates"
mkdir -p "\${REPORT_DIR}"

PASSED=0
FAILED=0

run_gate() {
  local gate_num=$1
  local gate_name=$2
  local gate_cmd=$3

  echo -e "\\n\${BLUE}\${BOLD}Gate $gate_num: $gate_name\${NC}"

  if eval "$gate_cmd" > "\${REPORT_DIR}/gate-\${gate_num}.log" 2>&1; then
    echo -e "\${GREEN}✅ PASSED\${NC}"
    ((PASSED++))
    return 0
  else
    echo -e "\${RED}❌ FAILED\${NC}"
    echo -e "\${YELLOW}See: \${REPORT_DIR}/gate-\${gate_num}.log\${NC}"
    ((FAILED++))
    return 1
  fi
}

echo -e "\${BOLD}Running Quality Gates for Stage \${STAGE_NUM}\${NC}"
echo -e "Gates: \${GATES[*]}"

for gate in "\${GATES[@]}"; do
  case $gate in
    1) run_gate 1 "No Template Files" "! find . -name 'Class1.cs' -o -name 'UnitTest1.cs' | grep -q ." || exit 1 ;;
    2) run_gate 2 "Linting" "${lintCommand}" || exit 1 ;;
    3) run_gate 3 "Clean Build" "${buildCommand}" || exit 1 ;;
    4) run_gate 4 "Type Safety" "${typeCheckCommand}" || exit 1 ;;
    5) run_gate 5 "All Tests Pass" "${testCommand}" || exit 1 ;;
    6) run_gate 6 "Coverage ≥${coverageThreshold}%" "${coverageCommand}" || exit 1 ;;
    7) run_gate 7 "Security Scan" "${securityCommand}" || exit 1 ;;
    8) run_gate 8 "Proof Complete" "! grep -q '\\[TBD\\]' '\${STAGE_DIR}/STAGE_\${STAGE_NUM}_PROOF.md'" || exit 1 ;;
  esac
done

echo -e "\\n\${BOLD}═══════════════════════════════════════\${NC}"
echo -e "\${GREEN}✅ Passed: \${PASSED}\${NC}"
echo -e "\${RED}❌ Failed: \${FAILED}\${NC}"
echo -e "\${BOLD}═══════════════════════════════════════\${NC}"

if [[ $FAILED -gt 0 ]]; then
  exit 1
fi
`;
}

function generateCompleteStageScript(config) {
  return `#!/usr/bin/env bash

###############################################################################
# Stage Completion Script
#
# Usage:
#   ./scripts/complete-stage.sh --stage <number> --name "Stage Name"
#
###############################################################################

set -euo pipefail

RED='\\033[0;31m'
GREEN='\\033[0;32m'
BLUE='\\033[0;34m'
BOLD='\\033[1m'
NC='\\033[0m'

STAGE_NUM=""
STAGE_NAME=""

while [[ $# -gt 0 ]]; do
  case $1 in
    --stage) STAGE_NUM="$2"; shift 2 ;;
    --name) STAGE_NAME="$2"; shift 2 ;;
    *) shift ;;
  esac
done

if [[ -z "$STAGE_NUM" || -z "$STAGE_NAME" ]]; then
  echo -e "\${RED}Usage: $0 --stage <number> --name \\"Stage Name\\"\${NC}"
  exit 1
fi

STAGE_DIR="stage-proofs/stage-\${STAGE_NUM}"
TAG_NAME="stage-\${STAGE_NUM}-complete"

echo -e "\${BLUE}\${BOLD}Completing Stage \${STAGE_NUM}: \${STAGE_NAME}\${NC}"

# Update state file
cat > "\${STAGE_DIR}/.stage-state.yaml" <<EOF
stage: "\${STAGE_NUM}"
name: "\${STAGE_NAME}"
phase: "COMPLETE"
started_at: "$(grep 'started_at' "\${STAGE_DIR}/.stage-state.yaml" 2>/dev/null | cut -d'"' -f2 || date -u +"%Y-%m-%dT%H:%M:%SZ")"
completed_at: "$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
EOF

# Create git tag
if git rev-parse --git-dir > /dev/null 2>&1; then
  git add "\${STAGE_DIR}"
  git commit -m "✅ Stage \${STAGE_NUM} Complete: \${STAGE_NAME}" || true
  git tag -a "\${TAG_NAME}" -m "Stage \${STAGE_NUM}: \${STAGE_NAME}" || echo "Tag already exists"
fi

echo -e "\${GREEN}✅ Stage \${STAGE_NUM} completed!\${NC}"
echo -e "   📄 Proof: \${STAGE_DIR}/STAGE_\${STAGE_NUM}_PROOF.md"
echo -e "   🏷️  Tag: \${TAG_NAME}"
`;
}

function generateClaudeSettings(config) {
  return {
    permissions: {
      allow: [
        "Bash(npm test:*)",
        "Bash(npm run:*)",
        config.primaryLanguage === 'csharp' ? "Bash(dotnet:*)" : null,
        config.primaryLanguage === 'python' ? "Bash(pytest:*)" : null,
        config.primaryLanguage === 'go' ? "Bash(go:*)" : null,
        "Bash(git add:*)",
        "Bash(git commit:*)",
        "Bash(git tag:*)",
      ].filter(Boolean),
      deny: [],
    },
  };
}

// Run the CLI
main();
