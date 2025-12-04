/**
 * Screenshot script for documentation
 * Run with: npx ts-node scripts/take-screenshots.ts
 */

import { chromium } from '@playwright/test';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const SCREENSHOTS_DIR = join(__dirname, '../../../docs/screenshots');

async function takeScreenshots() {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();

  // Homepage
  console.log('Capturing homepage...');
  await page.goto('http://localhost:3000');
  await page.waitForLoadState('networkidle');
  await page.screenshot({
    path: join(SCREENSHOTS_DIR, '01-homepage.png'),
    fullPage: false
  });

  // Workflows list
  console.log('Capturing workflows list...');
  await page.goto('http://localhost:3000/workflows');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);
  await page.screenshot({
    path: join(SCREENSHOTS_DIR, '02-workflows-list.png'),
    fullPage: false
  });

  // Visual workflow builder
  console.log('Capturing visual workflow builder...');
  await page.goto('http://localhost:3000/workflows/new');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);
  await page.screenshot({
    path: join(SCREENSHOTS_DIR, '03-workflow-builder.png'),
    fullPage: false
  });

  // Tasks library
  console.log('Capturing tasks library...');
  await page.goto('http://localhost:3000/tasks');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);
  await page.screenshot({
    path: join(SCREENSHOTS_DIR, '04-tasks-library.png'),
    fullPage: false
  });

  // Galaxy visualization
  console.log('Capturing galaxy visualization...');
  await page.goto('http://localhost:3000/visualization/galaxy');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000); // Extra time for 3D rendering
  await page.screenshot({
    path: join(SCREENSHOTS_DIR, '05-galaxy-visualization.png'),
    fullPage: false
  });

  // Tube map visualization
  console.log('Capturing tube map visualization...');
  await page.goto('http://localhost:3000/visualization/tube');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);
  await page.screenshot({
    path: join(SCREENSHOTS_DIR, '06-tube-visualization.png'),
    fullPage: false
  });

  // Dashboard (if exists)
  console.log('Capturing dashboard...');
  await page.goto('http://localhost:3000/dashboard');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);
  await page.screenshot({
    path: join(SCREENSHOTS_DIR, '07-dashboard.png'),
    fullPage: false
  });

  await browser.close();
  console.log(`\nScreenshots saved to: ${SCREENSHOTS_DIR}`);
}

takeScreenshots().catch(console.error);
