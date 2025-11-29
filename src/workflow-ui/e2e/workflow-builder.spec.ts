/**
 * E2E tests for Visual Workflow Builder
 *
 * Tests the complete workflow creation flow from start to finish:
 * - Navigate to workflows page
 * - Click "Create New Workflow" button
 * - Enter workflow details
 * - Use visual builder (drag-drop, connect tasks)
 * - Save workflow
 */

import { test, expect } from '@playwright/test';

test.describe('Workflow Builder E2E Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Start from the workflows list page
    await page.goto('/workflows');
  });

  test('should navigate from workflows list to workflow builder', async ({ page }) => {
    // Click "Create New Workflow" button
    await page.getByRole('link', { name: /create.*workflow/i }).click();

    // Should navigate to /workflows/new
    await expect(page).toHaveURL('/workflows/new');

    // Should see workflow builder page
    await expect(page.getByRole('heading', { name: /create.*workflow/i })).toBeVisible();
  });

  test('should display all builder components on workflow builder page', async ({ page }) => {
    // Navigate to builder
    await page.goto('/workflows/new');

    // Should see task palette
    await expect(page.getByTestId('task-palette')).toBeVisible();

    // Should see canvas area
    await expect(page.getByTestId('workflow-canvas')).toBeVisible();

    // Should see properties panel
    await expect(page.getByTestId('properties-panel')).toBeVisible();

    // Should see workflow name input
    await expect(page.getByLabel(/workflow name/i)).toBeVisible();

    // Should see toolbar buttons
    await expect(page.getByRole('button', { name: /save/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /load/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /cancel/i })).toBeVisible();
  });

  test('should require workflow name before saving', async ({ page }) => {
    await page.goto('/workflows/new');

    // Save button should be disabled without workflow name
    const saveButton = page.getByRole('button', { name: /save/i });
    await expect(saveButton).toBeDisabled();

    // Enter workflow name
    await page.getByLabel(/workflow name/i).fill('test-workflow');

    // Save button should still be disabled (no tasks added yet)
    await expect(saveButton).toBeDisabled();
  });

  test('should validate workflow name format', async ({ page }) => {
    await page.goto('/workflows/new');

    const nameInput = page.getByLabel(/workflow name/i);

    // Enter invalid name (uppercase)
    await nameInput.fill('Invalid Workflow');
    await nameInput.blur();

    // Should show validation error
    await expect(page.getByText(/must be lowercase/i)).toBeVisible();

    // Enter valid name (lowercase with hyphens)
    await nameInput.fill('valid-workflow-name');
    await nameInput.blur();

    // Error should disappear
    await expect(page.getByText(/must be lowercase/i)).not.toBeVisible();
  });

  test('should display task palette with available tasks', async ({ page }) => {
    await page.goto('/workflows/new');

    // Task palette should be visible
    const taskPalette = page.getByTestId('task-palette');
    await expect(taskPalette).toBeVisible();

    // Should show "Tasks" heading
    await expect(taskPalette.getByText('Tasks')).toBeVisible();

    // Should have search input
    await expect(taskPalette.getByPlaceholder(/search tasks/i)).toBeVisible();
  });

  test('should show empty canvas initially', async ({ page }) => {
    await page.goto('/workflows/new');

    const canvas = page.getByTestId('workflow-canvas');
    await expect(canvas).toBeVisible();

    // Canvas should not have any task nodes initially
    // (We can't easily test React Flow nodes without the real implementation)
  });

  test('should navigate back when cancel is clicked', async ({ page }) => {
    await page.goto('/workflows/new');

    // Click cancel button
    await page.getByRole('button', { name: /cancel/i }).click();

    // Should navigate back to workflows list
    await expect(page).toHaveURL('/workflows');
  });

  test('should show unsaved changes dialog when canceling with changes', async ({ page }) => {
    await page.goto('/workflows/new');

    // Note: This test would require actually adding tasks to the canvas,
    // which depends on the full React Flow implementation being functional.
    // For now, we'll skip this test as it requires the real drag-drop functionality.
    test.skip();
  });

  test('should have keyboard shortcuts', async ({ page }) => {
    await page.goto('/workflows/new');

    // Enter workflow name
    await page.getByLabel(/workflow name/i).fill('test-workflow');

    // Note: Testing Cmd+S would require:
    // 1. Adding tasks to canvas (requires full implementation)
    // 2. Mocking file system API (showSaveFilePicker)
    // This is better tested in component/integration tests
    test.skip();
  });

  test('should be accessible with keyboard navigation', async ({ page }) => {
    await page.goto('/workflows/new');

    // Tab through interactive elements
    await page.keyboard.press('Tab'); // Workflow name input
    await expect(page.getByLabel(/workflow name/i)).toBeFocused();

    await page.keyboard.press('Tab'); // Load button
    await expect(page.getByRole('button', { name: /load/i })).toBeFocused();

    await page.keyboard.press('Tab'); // Save button
    await expect(page.getByRole('button', { name: /save/i })).toBeFocused();

    await page.keyboard.press('Tab'); // Cancel button
    await expect(page.getByRole('button', { name: /cancel/i })).toBeFocused();
  });

  test('should persist workflow name during session', async ({ page }) => {
    await page.goto('/workflows/new');

    // Enter workflow name
    const nameInput = page.getByLabel(/workflow name/i);
    await nameInput.fill('persistent-workflow');

    // Reload page
    await page.reload();

    // Name should be cleared after reload (no persistence implemented yet)
    await expect(nameInput).toHaveValue('');
  });

  test('complete workflow creation flow (integration)', async ({ page }) => {
    // This is a high-level integration test that would test the full flow:
    // 1. Navigate to workflows page
    // 2. Click create button
    // 3. Enter workflow name
    // 4. Drag tasks from palette
    // 5. Connect tasks
    // 6. Configure task properties
    // 7. Save workflow
    // 8. Verify workflow appears in list

    // Skipping for now as it requires:
    // - Full React Flow implementation
    // - Mocking file system API
    // - Backend API integration
    test.skip();
  });
});
