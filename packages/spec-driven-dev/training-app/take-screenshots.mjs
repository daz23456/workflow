import { chromium } from 'playwright';
import { mkdir } from 'fs/promises';

const BASE_URL = 'http://localhost:3002';

const pages = [
  { path: '/', name: '01-home' },
  { path: '/exercise/baseline', name: '02-exercise-baseline' },
  { path: '/exercise/spec-driven', name: '03-exercise-spec-driven' },
  { path: '/exercise/context-recovery', name: '04-exercise-context-recovery' },
  { path: '/results', name: '05-results' },
  { path: '/certificate', name: '06-certificate' },
  { path: '/guides/creating-claude-md', name: '07-guide-creating-claude-md' },
  { path: '/guides/integrating-existing-repos', name: '08-guide-integrating-existing-repos' },
];

const mockState = {
  state: {
    completedExercises: ['baseline', 'spec-driven', 'context-recovery'],
    exerciseMetrics: {
      baseline: {
        // Workflow
        primaryLanguage: 'TypeScript',
        usedAI: true,
        workflowStyle: 'AI assistant',
        // Context
        reExplanations: 3,
        lostContext: true,
        hadToCorrect: true,
        // Quality
        hasTests: true,
        testCoverage: 45,
        testsFirst: false,
        // Satisfaction
        confidence: 3,
        productionReady: false,
        // Timer
        totalMinutes: 32,
      },
      'spec-driven': {
        // Context
        reExplanations: 0,
        // Quality
        testsFirst: true,
        testCoverage: 94,
        gatesPassed: true,
        stageCompleted: true,
        proofFileExists: true,
        // Satisfaction
        confidence: 5,
        productionReady: true,
        // Timer
        totalMinutes: 18,
      },
      'context-recovery': {
        // Time
        contextRecoveryMinutes: 12,
        contextRecoverySeconds: 45,
        // Context
        claudeForgot: false,
        hadToCorrect: true,
        // Quality
        testsFirst: true,
      },
    },
    certificateIssued: true,
    certificateName: 'Alex Developer',
    certificateId: 'SDD-DEMO12345-ABC',
    certificateDate: new Date().toISOString(),
  },
  version: 1,
};

async function takeScreenshots() {
  await mkdir('./screenshots', { recursive: true });

  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 2,
  });

  for (const { path, name } of pages) {
    console.log(`Capturing ${name}...`);
    const page = await context.newPage();

    // Set localStorage before navigating (must match store's persist name)
    await page.addInitScript((state) => {
      localStorage.setItem('sdd-training-storage', JSON.stringify(state));
    }, mockState);

    await page.goto(`${BASE_URL}${path}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000); // Let hydration and animations settle

    await page.screenshot({
      path: `./screenshots/${name}.png`,
      fullPage: true,
    });

    await page.close();
    console.log(`  ✓ Saved screenshots/${name}.png`);
  }

  await browser.close();
  console.log('\nAll screenshots saved to ./screenshots/');
}

takeScreenshots().catch(console.error);
