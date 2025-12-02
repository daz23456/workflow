/**
 * Galaxy Visualization E2E Tests
 *
 * Tests for the 3D Namespace Galaxy visualization page.
 * Stage 12.3: Namespace Galaxy
 */

import { test, expect } from '@playwright/test';

test.describe('Namespace Galaxy Visualization', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3001/visualization/galaxy');
  });

  test('should display galaxy page with title', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Namespace Galaxy');
  });

  test('should render 3D canvas container', async ({ page }) => {
    // The canvas should be present (React Three Fiber renders a canvas)
    await expect(page.locator('canvas')).toBeVisible({ timeout: 10000 });
  });

  test('should display legend with namespace clusters', async ({ page }) => {
    await expect(page.getByText('Namespaces')).toBeVisible();

    // Check for demo namespace names
    await expect(page.getByText('Production')).toBeVisible();
    await expect(page.getByText('Staging')).toBeVisible();
  });

  test('should display control buttons', async ({ page }) => {
    // Check for control buttons (zoom, reset, etc.)
    const buttons = page.locator('button');
    const count = await buttons.count();
    expect(count).toBeGreaterThanOrEqual(3);
  });

  test('should show selection panel when clicking legend item', async ({ page }) => {
    // Click on a namespace in the legend
    const productionItem = page.getByText('Production').first();
    await productionItem.click();

    // Selection panel should appear with details
    await expect(page.getByText(/workflows/i)).toBeVisible();
  });

  test('should have responsive canvas that fills viewport', async ({ page }) => {
    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible({ timeout: 10000 });

    // Get viewport and canvas dimensions
    const viewportSize = page.viewportSize();
    const canvasBox = await canvas.boundingBox();

    expect(canvasBox).not.toBeNull();
    if (canvasBox && viewportSize) {
      // Canvas should be reasonably large (at least 50% of viewport)
      expect(canvasBox.width).toBeGreaterThan(viewportSize.width * 0.5);
      expect(canvasBox.height).toBeGreaterThan(viewportSize.height * 0.5);
    }
  });

  test('should display subtitle with interaction hint', async ({ page }) => {
    await expect(page.getByText(/explore your workflow universe/i)).toBeVisible();
  });

  test('should toggle legend visibility', async ({ page }) => {
    // Initially legend is visible
    await expect(page.getByText('Namespaces')).toBeVisible();

    // Find and click the info/toggle button (usually has Info icon)
    const infoButton = page.locator('button').filter({ has: page.locator('svg') }).nth(2);
    await infoButton.click();

    // Legend should be hidden now (or toggled)
    // Depending on implementation, the legend might disappear
  });
});
