/**
 * Tube Map Visualization E2E Tests
 *
 * Tests for the London Underground-style tube map visualization page.
 * Stage 12.4: Tube Map View
 */

import { test, expect } from '@playwright/test';

test.describe('Tube Map Visualization', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3001/visualization/tube');
  });

  test('should display tube map page with title', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Workflow Tube Map');
  });

  test('should render SVG tube canvas', async ({ page }) => {
    await expect(page.locator('[data-testid="tube-canvas"]')).toBeVisible();
  });

  test('should display workflow lines legend', async ({ page }) => {
    await expect(page.getByText('Workflow Lines')).toBeVisible();

    // Check for demo workflow names
    await expect(page.getByText('User API Composition').first()).toBeVisible();
    await expect(page.getByText('Order Processing').first()).toBeVisible();
    await expect(page.getByText('Data ETL Pipeline').first()).toBeVisible();
  });

  test('should render tube lines with TfL colors', async ({ page }) => {
    // Check for tube line paths
    await expect(page.locator('[data-testid="tube-line-central"]')).toBeVisible();
    await expect(page.locator('[data-testid="tube-line-northern"]')).toBeVisible();
    await expect(page.locator('[data-testid="tube-line-victoria"]')).toBeVisible();
    await expect(page.locator('[data-testid="tube-line-district"]')).toBeVisible();
  });

  test('should render station markers', async ({ page }) => {
    // Check for station circles
    await expect(page.locator('[data-testid="input-1"]')).toBeVisible();
    await expect(page.locator('[data-testid="validate-1"]')).toBeVisible();
    await expect(page.locator('[data-testid="fetch-user"]')).toBeVisible();
  });

  test('should display control buttons', async ({ page }) => {
    const buttons = page.locator('button');
    const count = await buttons.count();
    expect(count).toBeGreaterThanOrEqual(4); // Play/Pause, Reset, Info, Download
  });

  test('should show station details when station is clicked', async ({ page }) => {
    // Click on a station
    const station = page.locator('[data-testid="validate-1"]');
    await station.click();

    // Selection panel should appear
    await expect(page.getByText('Station / Task')).toBeVisible();
    await expect(page.getByText(/Line:/)).toBeVisible();
  });

  test('should highlight workflow line when clicked in legend', async ({ page }) => {
    // Click on a workflow in the legend
    const legendItem = page.getByText('User API Composition').first();
    await legendItem.click();

    // Details panel should appear showing workflow info
    await expect(page.getByText('Workflow Line')).toBeVisible();
    await expect(page.getByText(/Stations:/)).toBeVisible();
  });

  test('should display station count in legend', async ({ page }) => {
    // Each workflow line shows station count
    await expect(page.getByText(/\d+ stops/).first()).toBeVisible();
  });

  test('should display TfL-style roundel logo', async ({ page }) => {
    // The roundel is a div with specific styling
    const roundel = page.locator('.rounded-full.bg-\\[\\#DC241F\\]');
    await expect(roundel).toBeVisible();
  });

  test('should display keyboard hint', async ({ page }) => {
    await expect(page.getByText(/Click to select/)).toBeVisible();
  });

  test('should reset selection when reset button is clicked', async ({ page }) => {
    // First select a station
    const station = page.locator('[data-testid="validate-1"]');
    await station.click();
    await expect(page.getByText('Station / Task')).toBeVisible();

    // Click reset button (RotateCcw icon)
    const resetButton = page.locator('button').nth(1); // Second button
    await resetButton.click();

    // Details panel should disappear
    await expect(page.getByText('Station / Task')).not.toBeVisible();
  });

  test('should display subtitle with interaction hint', async ({ page }) => {
    await expect(page.getByText(/Click lines or stations to explore/)).toBeVisible();
  });
});
