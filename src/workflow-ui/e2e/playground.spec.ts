/**
 * Playground E2E Tests
 * Stage 9.5: Interactive Documentation & Learning - Day 2
 */

import { test, expect } from '@playwright/test';

test.describe('Playground Page', () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage before each test
    await page.goto('/playground');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  test('should display playground header with title', async ({ page }) => {
    await page.goto('/playground');

    await expect(page.getByRole('heading', { name: /Interactive Playground/i })).toBeVisible();
    await expect(page.getByText(/Learn workflow orchestration/i)).toBeVisible();
  });

  test('should display completion stats', async ({ page }) => {
    await page.goto('/playground');

    // Should show 0/5 initially
    await expect(page.getByText('0/5')).toBeVisible();
    await expect(page.getByText(/Lessons Completed/i)).toBeVisible();

    // Progress bar should exist
    const progressBar = page.getByTestId('overall-progress-bar');
    await expect(progressBar).toBeVisible();
  });

  test('should display all 5 lessons', async ({ page }) => {
    await page.goto('/playground');

    const lessonsGrid = page.getByTestId('lessons-grid');
    await expect(lessonsGrid).toBeVisible();

    // Should show all 5 lessons
    const lessonCards = lessonsGrid.locator('[data-testid="lesson-card"]');
    await expect(lessonCards).toHaveCount(5);
  });

  test('should display difficulty filters', async ({ page }) => {
    await page.goto('/playground');

    await expect(page.getByTestId('filter-all')).toBeVisible();
    await expect(page.getByTestId('filter-beginner')).toBeVisible();
    await expect(page.getByTestId('filter-intermediate')).toBeVisible();
    await expect(page.getByTestId('filter-advanced')).toBeVisible();
  });

  test('should filter lessons by difficulty', async ({ page }) => {
    await page.goto('/playground');

    // Click beginner filter
    await page.getByTestId('filter-beginner').click();

    // Should show 2 beginner lessons
    const lessonsGrid = page.getByTestId('lessons-grid');
    const lessonCards = lessonsGrid.locator('[data-testid="lesson-card"]');
    await expect(lessonCards).toHaveCount(2);

    // Click intermediate filter
    await page.getByTestId('filter-intermediate').click();
    await expect(lessonCards).toHaveCount(2);

    // Click advanced filter
    await page.getByTestId('filter-advanced').click();
    await expect(lessonCards).toHaveCount(1);

    // Click all filter
    await page.getByTestId('filter-all').click();
    await expect(lessonCards).toHaveCount(5);
  });

  test('should highlight active filter', async ({ page }) => {
    await page.goto('/playground');

    // All filter should be active by default
    const allFilter = page.getByTestId('filter-all');
    await expect(allFilter).toHaveClass(/bg-blue-500/);

    // Click beginner filter
    const beginnerFilter = page.getByTestId('filter-beginner');
    await beginnerFilter.click();

    // Beginner filter should now be active
    await expect(beginnerFilter).toHaveClass(/bg-blue-500/);
    await expect(allFilter).not.toHaveClass(/bg-blue-500/);
  });

  test('should navigate to lesson detail when clicking a lesson card', async ({ page }) => {
    await page.goto('/playground');

    // Click on first lesson (Hello World)
    const firstLesson = page.locator('[data-testid="lesson-card"]').first();
    await firstLesson.click();

    // Should navigate to lesson detail page
    await expect(page).toHaveURL(/\/playground\/hello-world/);
  });
});

test.describe('Lesson Detail Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/playground/hello-world');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  test('should display lesson title and description', async ({ page }) => {
    await page.goto('/playground/hello-world');

    await expect(page.getByRole('heading', { name: /Hello World/i })).toBeVisible();
  });

  test('should display lesson viewer with split layout', async ({ page }) => {
    await page.goto('/playground/hello-world');

    // Should have left panel (instructions)
    await expect(page.getByText(/Introduction/i)).toBeVisible();

    // Should have right panel (code editor)
    const codeEditor = page.getByTestId('code-editor');
    await expect(codeEditor).toBeVisible();
  });

  test('should navigate between lesson steps', async ({ page }) => {
    await page.goto('/playground/hello-world');

    // Should start at step 1
    await expect(page.getByText(/Step 1/i)).toBeVisible();

    // Click Next button
    const nextButton = page.getByRole('button', { name: /Next/i });
    await nextButton.click();

    // Should move to step 2
    await expect(page.getByText(/Step 2/i)).toBeVisible();

    // Click Previous button
    const prevButton = page.getByRole('button', { name: /Previous/i });
    await prevButton.click();

    // Should go back to step 1
    await expect(page.getByText(/Step 1/i)).toBeVisible();
  });

  test('should display success criteria checklist', async ({ page }) => {
    await page.goto('/playground/hello-world');

    await expect(page.getByText(/Success Criteria/i)).toBeVisible();

    // Should have checkboxes for criteria
    const checkboxes = page.locator('input[type="checkbox"]');
    await expect(checkboxes.first()).toBeVisible();
  });

  test('should allow checking off success criteria', async ({ page }) => {
    await page.goto('/playground/hello-world');

    const firstCheckbox = page.locator('input[type="checkbox"]').first();

    // Should be unchecked initially
    await expect(firstCheckbox).not.toBeChecked();

    // Click checkbox
    await firstCheckbox.click();

    // Should now be checked
    await expect(firstCheckbox).toBeChecked();
  });

  test('should enable Complete button when all criteria checked', async ({ page }) => {
    await page.goto('/playground/hello-world');

    const completeButton = page.getByRole('button', { name: /Complete/i });

    // Should be disabled initially
    await expect(completeButton).toBeDisabled();

    // Check all criteria
    const checkboxes = page.locator('input[type="checkbox"]');
    const count = await checkboxes.count();
    for (let i = 0; i < count; i++) {
      await checkboxes.nth(i).click();
    }

    // Complete button should now be enabled
    await expect(completeButton).toBeEnabled();
  });

  test('should navigate back to playground on Exit', async ({ page }) => {
    await page.goto('/playground/hello-world');

    const exitButton = page.getByRole('button', { name: /Exit/i });
    await exitButton.click();

    // Should navigate back to playground
    await expect(page).toHaveURL('/playground');
  });

  test('should navigate back to playground on Complete', async ({ page }) => {
    await page.goto('/playground/hello-world');

    // Check all criteria
    const checkboxes = page.locator('input[type="checkbox"]');
    const count = await checkboxes.count();
    for (let i = 0; i < count; i++) {
      await checkboxes.nth(i).click();
    }

    // Click Complete
    const completeButton = page.getByRole('button', { name: /Complete/i });
    await completeButton.click();

    // Should navigate back to playground
    await expect(page).toHaveURL('/playground');
  });

  test('should show lesson as completed after completion', async ({ page }) => {
    await page.goto('/playground/hello-world');

    // Check all criteria and complete
    const checkboxes = page.locator('input[type="checkbox"]');
    const count = await checkboxes.count();
    for (let i = 0; i < count; i++) {
      await checkboxes.nth(i).click();
    }

    const completeButton = page.getByRole('button', { name: /Complete/i });
    await completeButton.click();

    // Should be back on playground
    await expect(page).toHaveURL('/playground');

    // Stats should show 1/5
    await expect(page.getByText('1/5')).toBeVisible();

    // First lesson should show completed badge
    const firstLesson = page.locator('[data-testid="lesson-card"]').first();
    await expect(firstLesson.getByText(/Completed/i)).toBeVisible();
  });

  test('should display 404 page for non-existent lesson', async ({ page }) => {
    await page.goto('/playground/non-existent-lesson');

    await expect(page.getByText(/Lesson Not Found/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /Back to Playground/i })).toBeVisible();
  });

  test('should navigate back from 404 page', async ({ page }) => {
    await page.goto('/playground/non-existent-lesson');

    const backButton = page.getByRole('button', { name: /Back to Playground/i });
    await backButton.click();

    await expect(page).toHaveURL('/playground');
  });
});

test.describe('Code Editor', () => {
  test('should display YAML code', async ({ page }) => {
    await page.goto('/playground/hello-world');

    const codeEditor = page.getByTestId('code-editor');

    // Should contain YAML content
    const editorContent = codeEditor.locator('.cm-content');
    await expect(editorContent).toBeVisible();

    // Should contain typical YAML keywords
    await expect(editorContent).toContainText('apiVersion');
    await expect(editorContent).toContainText('kind');
  });

  test('should allow editing YAML code', async ({ page }) => {
    await page.goto('/playground/hello-world');

    const codeEditor = page.getByTestId('code-editor');
    const editorContent = codeEditor.locator('.cm-content');

    // Click in editor and type
    await editorContent.click();
    await page.keyboard.press('End'); // Move to end of first line
    await page.keyboard.press('Enter');
    await page.keyboard.type('# My comment');

    // Should contain the new comment
    await expect(editorContent).toContainText('# My comment');
  });
});

test.describe('Progress Persistence', () => {
  test('should persist lesson completion across page reloads', async ({ page }) => {
    // Complete first lesson
    await page.goto('/playground/hello-world');

    const checkboxes = page.locator('input[type="checkbox"]');
    const count = await checkboxes.count();
    for (let i = 0; i < count; i++) {
      await checkboxes.nth(i).click();
    }

    await page.getByRole('button', { name: /Complete/i }).click();

    // Reload playground page
    await page.reload();

    // Should still show 1/5 completed
    await expect(page.getByText('1/5')).toBeVisible();
  });

  test('should persist lesson progress during lesson', async ({ page }) => {
    await page.goto('/playground/hello-world');

    // Navigate to step 2
    await page.getByRole('button', { name: /Next/i }).click();
    await expect(page.getByText(/Step 2/i)).toBeVisible();

    // Check first criterion
    const firstCheckbox = page.locator('input[type="checkbox"]').first();
    await firstCheckbox.click();

    // Reload page
    await page.reload();

    // Should still be on step 2
    await expect(page.getByText(/Step 2/i)).toBeVisible();

    // Checkbox should still be checked
    await expect(firstCheckbox).toBeChecked();
  });
});
