/**
 * Screenshot script for documentation and stage artifacts
 *
 * Usage:
 *   npx ts-node scripts/take-screenshots.ts                    # Capture all docs screenshots
 *   npx ts-node scripts/take-screenshots.ts --stage 19.3       # Capture stage-specific screenshots
 *   npx ts-node scripts/take-screenshots.ts --routes /dashboard,/workflows/new
 *   npx ts-node scripts/take-screenshots.ts --stage 19.3 --states default,feature
 */

import { chromium, type Page } from 'playwright';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, '../../..');
const DOCS_SCREENSHOTS_DIR = join(PROJECT_ROOT, 'docs/screenshots');

// All available routes in the UI
const ALL_ROUTES: Record<string, { name: string; waitTime: number }> = {
  '/': { name: 'home', waitTime: 500 },
  '/dashboard': { name: 'dashboard', waitTime: 500 },
  '/workflows': { name: 'workflows', waitTime: 500 },
  '/workflows/new': { name: 'workflows-new', waitTime: 1000 },
  '/tasks': { name: 'tasks', waitTime: 500 },
  '/templates': { name: 'templates', waitTime: 500 },
  '/transforms': { name: 'transforms', waitTime: 500 },
  '/visualization': { name: 'visualization', waitTime: 500 },
  '/visualization/galaxy': { name: 'visualization-galaxy', waitTime: 2000 },
  '/visualization/traffic': { name: 'visualization-traffic', waitTime: 1000 },
  '/visualization/tube': { name: 'visualization-tube', waitTime: 1000 },
  '/playground': { name: 'playground', waitTime: 500 },
};

// Screenshot states
type ScreenshotState = 'default' | 'loading' | 'empty' | 'error' | 'feature';

const ALL_STATES: ScreenshotState[] = ['default', 'loading', 'empty', 'error', 'feature'];

interface Options {
  stage?: string;
  routes?: string[];
  states?: ScreenshotState[];
  baseUrl?: string;
  darkMode?: boolean;
}

function parseArgs(): Options {
  const args = process.argv.slice(2);
  const options: Options = {
    baseUrl: 'http://localhost:3000',
    states: ['default'], // Default to just default state for docs
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--stage':
        options.stage = args[++i];
        // For stage screenshots, capture all states
        options.states = ALL_STATES;
        break;
      case '--routes':
        options.routes = args[++i].split(',').map((r) => r.trim());
        break;
      case '--states':
        options.states = args[++i].split(',').map((s) => s.trim()) as ScreenshotState[];
        break;
      case '--base-url':
        options.baseUrl = args[++i];
        break;
      case '--dark-mode':
        options.darkMode = true;
        break;
      case '--help':
        console.log(`
Screenshot script for documentation and stage artifacts

Usage:
  npx ts-node scripts/take-screenshots.ts [options]

Options:
  --stage <number>       Stage number (outputs to stage-proofs/stage-X/screenshots/)
  --routes <routes>      Comma-separated routes to capture (default: all)
  --states <states>      Comma-separated states: default,loading,empty,error,feature
  --base-url <url>       Base URL (default: http://localhost:3000)
  --help                 Show this help

Examples:
  npx ts-node scripts/take-screenshots.ts
  npx ts-node scripts/take-screenshots.ts --stage 19.3
  npx ts-node scripts/take-screenshots.ts --routes /dashboard,/workflows/new
  npx ts-node scripts/take-screenshots.ts --stage 19.3 --states default,feature
`);
        process.exit(0);
    }
  }

  return options;
}

function getOutputDir(options: Options): string {
  let baseDir: string;
  if (options.stage) {
    baseDir = join(PROJECT_ROOT, `stage-proofs/stage-${options.stage}/screenshots`);
  } else {
    baseDir = DOCS_SCREENSHOTS_DIR;
  }
  // Add dark-mode subdirectory if dark mode is enabled
  if (options.darkMode) {
    return join(baseDir, 'dark-mode');
  }
  return baseDir;
}

function getRoutesFromManifest(stageNum: string): string[] {
  const manifestPath = join(PROJECT_ROOT, `stage-proofs/stage-${stageNum}/screenshots-required.txt`);

  if (!existsSync(manifestPath)) {
    console.log(`No manifest found at ${manifestPath}, using all routes`);
    return Object.keys(ALL_ROUTES);
  }

  const manifest = readFileSync(manifestPath, 'utf-8');
  const routeNames = new Set<string>();

  // Extract route names from manifest (format: route-name--state.png)
  for (const line of manifest.split('\n')) {
    if (line.startsWith('#') || !line.trim()) continue;

    // Extract route name from filename (e.g., "dashboard--default.png" -> "dashboard")
    const match = line.match(/^([^-]+(?:-[^-]+)*)--/);
    if (match) {
      const routeName = match[1];
      routeNames.add(routeName);
    }
  }

  // Map route names back to routes
  const routes: string[] = [];
  for (const routeName of routeNames) {
    for (const [route, info] of Object.entries(ALL_ROUTES)) {
      if (info.name === routeName || info.name === routeName.replace(/-/g, '/')) {
        routes.push(route);
        break;
      }
    }
  }

  return routes.length > 0 ? routes : Object.keys(ALL_ROUTES);
}

async function captureState(
  page: Page,
  route: string,
  state: ScreenshotState,
  outputDir: string
): Promise<void> {
  const routeInfo = ALL_ROUTES[route] || { name: route.replace(/\//g, '-').substring(1) || 'home', waitTime: 500 };
  const filename = `${routeInfo.name}--${state}.png`;

  console.log(`  Capturing ${route} (${state})...`);

  try {
    // Navigate to route
    await page.goto(`http://localhost:3000${route}`);

    // State-specific setup
    switch (state) {
      case 'default':
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(routeInfo.waitTime);
        break;

      case 'loading':
        // Intercept API calls to show loading state
        await page.route('**/api/**', async (route) => {
          await new Promise((resolve) => setTimeout(resolve, 10000));
          route.continue();
        });
        await page.reload();
        await page.waitForTimeout(500);
        // Remove route handler after screenshot
        await page.unroute('**/api/**');
        break;

      case 'empty':
        // Mock empty responses
        await page.route('**/api/**', async (route) => {
          route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ data: [], items: [], workflows: [], tasks: [] }),
          });
        });
        await page.reload();
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(500);
        await page.unroute('**/api/**');
        break;

      case 'error':
        // Mock error responses
        await page.route('**/api/**', async (route) => {
          route.fulfill({
            status: 500,
            contentType: 'application/json',
            body: JSON.stringify({ error: 'Internal Server Error', message: 'Something went wrong' }),
          });
        });
        await page.reload();
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(500);
        await page.unroute('**/api/**');
        break;

      case 'feature':
        // Default state with focus on new features
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(routeInfo.waitTime);
        // Could add annotations or highlights here for new features
        break;
    }

    // Take screenshot
    await page.screenshot({
      path: join(outputDir, filename),
      fullPage: false,
    });

    console.log(`    ✓ Saved: ${filename}`);
  } catch (error) {
    console.error(`    ✗ Failed to capture ${route} (${state}):`, error);
  }
}

async function takeScreenshots(options: Options): Promise<void> {
  const outputDir = getOutputDir(options);

  // Ensure output directory exists
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }

  console.log(`\nScreenshot capture starting...`);
  console.log(`  Output: ${outputDir}`);
  if (options.stage) {
    console.log(`  Stage: ${options.stage}`);
  }
  if (options.darkMode) {
    console.log(`  Mode: DARK MODE`);
  }

  // Determine routes to capture
  let routes: string[];
  if (options.routes) {
    routes = options.routes;
  } else if (options.stage) {
    routes = getRoutesFromManifest(options.stage);
  } else {
    routes = Object.keys(ALL_ROUTES);
  }

  console.log(`  Routes: ${routes.length}`);
  console.log(`  States: ${options.states?.join(', ')}`);
  console.log('');

  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    // Enable dark mode via media query emulation
    colorScheme: options.darkMode ? 'dark' : 'light',
  });
  const page = await context.newPage();

  let captured = 0;
  const total = routes.length * (options.states?.length || 1);

  for (const route of routes) {
    console.log(`\nRoute: ${route}`);

    for (const state of options.states || ['default']) {
      await captureState(page, route, state, outputDir);
      captured++;
    }
  }

  await browser.close();

  console.log(`\n✅ Screenshots captured: ${captured}/${total}`);
  console.log(`   Output directory: ${outputDir}`);

  // Generate manifest of captured screenshots
  if (options.stage) {
    const manifestPath = join(outputDir, '../screenshots-captured.txt');
    const files = routes.flatMap((route) =>
      (options.states || ['default']).map((state) => {
        const routeInfo = ALL_ROUTES[route] || { name: route.replace(/\//g, '-').substring(1) || 'home' };
        return `${routeInfo.name}--${state}.png`;
      })
    );
    writeFileSync(manifestPath, `# Captured screenshots for Stage ${options.stage}\n# Generated: ${new Date().toISOString()}\n\n${files.join('\n')}\n`);
    console.log(`   Manifest: ${manifestPath}`);
  }
}

// Run
const options = parseArgs();
takeScreenshots(options).catch(console.error);
