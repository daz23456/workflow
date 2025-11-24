import { test, expect } from '@playwright/test';

test.describe('Workflow List Visual Regression', () => {
  test('workflow list default state', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('[role="article"]');
    await expect(page).toHaveScreenshot('workflow-list-default.png');
  });

  test('workflow list with filters applied', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('[role="article"]');

    // Apply search filter
    await page.fill('input[placeholder*="Search"]', 'user');
    await page.waitForTimeout(500); // Wait for debounce

    await expect(page).toHaveScreenshot('workflow-list-filtered.png');
  });

  test('workflow card hover state', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('[role="article"]');

    const firstCard = page.locator('[role="article"]').first();
    await firstCard.hover();

    await expect(page).toHaveScreenshot('workflow-card-hover.png');
  });

  test('empty state', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('[role="article"]');

    // Search for something that doesn't exist
    await page.fill('input[placeholder*="Search"]', 'nonexistent-workflow-xyz');
    await page.waitForTimeout(500);

    await expect(page).toHaveScreenshot('workflow-list-empty.png');
  });
});
