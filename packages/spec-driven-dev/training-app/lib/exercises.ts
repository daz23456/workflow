/**
 * Training Exercises Registry
 * Defines the 3 core exercises for spec-driven development training
 */

export interface Exercise {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  estimatedTime: number; // minutes
  order: number;
  objectives: string[];
  whatYoullProve: string;
  icon: string;
}

export const EXERCISE_BASELINE: Exercise = {
  id: 'baseline',
  title: 'The Baseline',
  subtitle: 'How you currently work',
  description:
    'Build a retry utility the way you normally would. No special instructions, no framework. Just your usual workflow - whether that\'s solo coding, pair programming, or using AI assistants.',
  estimatedTime: 30,
  order: 1,
  objectives: [
    'Build a retry utility with exponential backoff',
    'Track your natural workflow',
    'Record honest metrics about the experience',
  ],
  whatYoullProve: 'How you currently approach new coding tasks',
  icon: '📊',
};

export const EXERCISE_SPEC_DRIVEN: Exercise = {
  id: 'spec-driven',
  title: 'The Spec-Driven Way',
  subtitle: 'Same task, with the framework',
  description:
    'Build the exact same retry utility, but this time using spec-driven development. CLAUDE.md, TDD, quality gates. See how the experience differs.',
  estimatedTime: 60,
  order: 2,
  objectives: [
    'Set up CLAUDE.md with your constraints',
    'Follow TDD: RED → GREEN → REFACTOR',
    'Run quality gates and hit 90%+ coverage',
    'Compare metrics to your baseline',
  ],
  whatYoullProve: 'Whether the framework improves quality and speed',
  icon: '🎯',
};

export const EXERCISE_CONTEXT_RECOVERY: Exercise = {
  id: 'context-recovery',
  title: 'Context Recovery',
  subtitle: 'What happens when you lose context',
  description:
    'Simulate losing context mid-project. Close Claude, wait, restart. Compare how long it takes to recover with and without the framework.',
  estimatedTime: 30,
  order: 3,
  objectives: [
    'Simulate context loss (close and reopen Claude)',
    'Measure recovery time without framework',
    'Measure recovery time with state file',
    'Calculate the time savings',
  ],
  whatYoullProve: 'The value of persistent context via state files',
  icon: '🔄',
};

export const ALL_EXERCISES: Exercise[] = [
  EXERCISE_BASELINE,
  EXERCISE_SPEC_DRIVEN,
  EXERCISE_CONTEXT_RECOVERY,
];

export function getExerciseById(id: string): Exercise | undefined {
  return ALL_EXERCISES.find((e) => e.id === id);
}

export function getNextExercise(currentId: string): Exercise | undefined {
  const current = getExerciseById(currentId);
  if (!current) return undefined;
  return ALL_EXERCISES.find((e) => e.order === current.order + 1);
}

export function getTotalEstimatedTime(): number {
  return ALL_EXERCISES.reduce((sum, e) => sum + e.estimatedTime, 0);
}

// Exercise-specific content
export interface ExerciseContent {
  task: string;
  instructions: string[];
  metrics: MetricField[];
  tips?: string[];
}

export interface MetricField {
  key: string;
  label: string;
  type: 'number' | 'boolean' | 'rating' | 'text' | 'select';
  category: 'time' | 'context' | 'quality' | 'satisfaction' | 'workflow';
  suffix?: string;
  min?: number;
  max?: number;
  options?: string[]; // For 'select' type
}

export const exerciseContent: Record<string, ExerciseContent> = {
  baseline: {
    task: `Build a simple retry utility:
• Retry a function up to N times
• Exponential backoff between retries
• Return result on success, throw on final failure
• Include tests

Use whatever language/framework you're most comfortable with.`,
    instructions: [
      'Start the timer (top right) and begin building',
      'Build the retry utility however you normally would',
      'Use your usual tools - IDE, AI assistant, Stack Overflow, docs, pair programming, whatever',
      'No special instructions, no framework - just your natural workflow',
      'When done, stop the timer and fill in ALL the metrics honestly',
      "Save your code somewhere (you'll need it for Exercise 3)",
    ],
    metrics: [
      {
        key: 'primaryLanguage',
        label: 'What language did you use?',
        type: 'text',
        category: 'workflow',
      },
      {
        key: 'usedAI',
        label: 'Did you use an AI assistant (Claude, Copilot, ChatGPT, etc.)?',
        type: 'boolean',
        category: 'workflow',
      },
      {
        key: 'workflowStyle',
        label: 'How did you primarily work?',
        type: 'select',
        category: 'workflow',
        options: ['Solo coding', 'AI assistant', 'Pair programming', 'Stack Overflow / docs', 'Mix of approaches'],
      },
      {
        key: 'reExplanations',
        label: 'How many times did you re-explain or re-research requirements?',
        type: 'number',
        category: 'context',
      },
      {
        key: 'lostContext',
        label: 'Did you lose context and have to re-orient yourself?',
        type: 'boolean',
        category: 'context',
      },
      {
        key: 'hadToCorrect',
        label: 'Did you have to significantly change your approach mid-way?',
        type: 'boolean',
        category: 'context',
      },
      { key: 'hasTests', label: 'Does it have tests?', type: 'boolean', category: 'quality' },
      {
        key: 'testCoverage',
        label: 'Estimated test coverage (%)',
        type: 'number',
        category: 'quality',
        suffix: '%',
        min: 0,
        max: 100,
      },
      {
        key: 'testsFirst',
        label: 'Did tests come BEFORE the implementation code?',
        type: 'boolean',
        category: 'quality',
      },
      {
        key: 'confidence',
        label: 'How confident are you it works correctly? (1-5)',
        type: 'rating',
        category: 'satisfaction',
        min: 1,
        max: 5,
      },
      {
        key: 'productionReady',
        label: 'Would you ship this to production as-is?',
        type: 'boolean',
        category: 'satisfaction',
      },
    ],
    tips: [
      'Be honest - this data is for you, not us',
      'Use whatever tools you normally use',
      'Track everything, even small interruptions',
      "Save your code somewhere - you'll need it for Exercise 3",
    ],
  },
  'spec-driven': {
    task: `Build the exact same retry utility using the FULL stage execution framework:

SETUP:
  Download the Starter Kit (.zip) and extract to a new directory

THE WORKFLOW:
  1. Tell Claude to read CLAUDE.md and STAGE_EXECUTION_FRAMEWORK.md
  2. Ask Claude to initialize Stage 1.0
  3. Watch TDD: RED → GREEN → REFACTOR
  4. Ask Claude to run quality gates
  5. Ask Claude to complete the stage`,
    instructions: [
      'Download the Starter Kit zip (green section above) and extract to a new directory',
      'Run: chmod +x scripts/*.sh (to make scripts executable)',
      'Open Claude Code in that directory',
      'Start the timer (top right) when you begin',
      'Tell Claude: "Read CLAUDE.md - this is our project specification for a retry utility."',
      'Then tell Claude: "Now read STAGE_EXECUTION_FRAMEWORK.md - this is the stage execution protocol we follow."',
      'Tell Claude: "Initialize Stage 1.0 for the Retry Utility using the BACKEND profile"',
      'Watch Claude run init-stage.sh and create the stage-proofs directory',
      'Watch Claude read the requirements from CLAUDE.md and create a plan',
      'Watch Claude write failing tests first (RED phase)',
      'Watch Claude implement to pass tests (GREEN phase)',
      'When implementation is done, tell Claude: "Run quality gates for Stage 1.0"',
      'ALL 8 GATES MUST PASS - if any fail, Claude should fix and re-run',
      'Tell Claude: "Complete Stage 1.0"',
      'Verify: Claude should run complete-stage.sh, creating proof file and git tag',
    ],
    metrics: [
      {
        key: 'reExplanations',
        label: 'How many times did you re-explain requirements?',
        type: 'number',
        category: 'context',
      },
      {
        key: 'testsFirst',
        label: 'Did Claude write tests FIRST (before any implementation)?',
        type: 'boolean',
        category: 'quality',
      },
      {
        key: 'testCoverage',
        label: 'Test coverage from Gate 6 (%)',
        type: 'number',
        category: 'quality',
        suffix: '%',
        min: 0,
        max: 100,
      },
      {
        key: 'gatesPassed',
        label: 'Did ALL 8 quality gates pass?',
        type: 'boolean',
        category: 'quality',
      },
      {
        key: 'stageCompleted',
        label: 'Did complete-stage.sh succeed (git tag created)?',
        type: 'boolean',
        category: 'quality',
      },
      {
        key: 'proofFileExists',
        label: 'Does stage-proofs/stage-1.0/STAGE_1.0_PROOF.md exist?',
        type: 'boolean',
        category: 'quality',
      },
      {
        key: 'confidence',
        label: 'How confident are you it works? (1-5)',
        type: 'rating',
        category: 'satisfaction',
        min: 1,
        max: 5,
      },
      {
        key: 'productionReady',
        label: 'Would you ship this to production?',
        type: 'boolean',
        category: 'satisfaction',
      },
    ],
    tips: [
      'Setup takes 5-10 min - this is a ONE-TIME cost for any project',
      'If gates fail, FIX THE ISSUES - don\'t skip gates',
      'The proof file and git tag ARE the evidence of completion',
      'Notice: Claude follows the CLAUDE.md constraints without you repeating them',
      'NEXT STEP: For real projects, create your own CLAUDE.md with your tech stack, constraints, and stage roadmap',
    ],
  },
  'context-recovery': {
    task: `Simulate losing context and measure recovery time:

Part A (Without Framework - use Exercise 1 code):
• Close Claude Code completely
• Wait 5 minutes (set a timer!)
• Reopen and try to continue Exercise 1's code
• Ask Claude to "add a jitter option to the retry backoff"

Part B (With Framework - use Exercise 2 code):
• Close Claude Code completely
• Wait 5 minutes (set a timer!)
• Show Claude the state file: cat stage-proofs/stage-1.0/.stage-state.yaml
• Tell Claude: "Read STAGE_EXECUTION_FRAMEWORK.md and the state file. Continue Stage 1.0."
• Ask Claude to "add a jitter option to the retry backoff"`,
    instructions: [
      'PART A: Navigate to your Exercise 1 directory (no framework)',
      'Close Claude Code completely and wait 5 minutes',
      'Reopen Claude and start timer',
      'Try to get Claude to understand the project and add a jitter feature',
      'Stop timer when Claude produces working code with tests',
      'PART B: Navigate to your Exercise 2 directory (with framework)',
      'Close Claude Code completely and wait 5 minutes',
      'Reopen Claude and start timer',
      'Run: cat stage-proofs/stage-1.0/.stage-state.yaml',
      'Tell Claude: "Read STAGE_EXECUTION_FRAMEWORK.md and the state file above. We are continuing Stage 1.0. Add jitter to backoff."',
      'Stop timer when Claude produces working code with tests',
    ],
    metrics: [
      {
        key: 'contextRecoveryMinutes',
        label: 'Part A: Time until productive (minutes)',
        type: 'number',
        category: 'time',
      },
      {
        key: 'contextRecoverySeconds',
        label: 'Part B: Time until productive (seconds)',
        type: 'number',
        category: 'time',
      },
      {
        key: 'claudeForgot',
        label: 'Part A: Did Claude remember your tech stack/constraints?',
        type: 'boolean',
        category: 'context',
      },
      {
        key: 'hadToCorrect',
        label: 'Part B: Did Claude follow framework constraints automatically?',
        type: 'boolean',
        category: 'context',
      },
      {
        key: 'testsFirst',
        label: 'Part B: Did Claude write tests first (without being reminded)?',
        type: 'boolean',
        category: 'quality',
      },
    ],
    tips: [
      "Actually wait the 5 minutes - this simulates a real context switch",
      "Part A should feel frustrating - that's the pain you normally experience",
      "Part B should feel almost instant - that's the value of persistent context",
      "Calculate: if you context-switch 3x/day, how much time saved per week?",
    ],
  },
};
