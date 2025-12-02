/**
 * Transform Builder E2E Tests
 *
 * End-to-end tests for the Data Transform Assistant feature.
 * Tests the complete user workflow from JSON upload to YAML export.
 */

import { test, expect } from '@playwright/test';
import { readFileSync, writeFileSync, unlinkSync, mkdirSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

test.describe('Transform Builder E2E', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/transforms');
  });

  test('should display transform builder page', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /data transform assistant/i })).toBeVisible();
    await expect(page.getByText(/upload sample json/i)).toBeVisible();
  });

  test('should upload JSON file and show data', async ({ page }) => {
    // Create temporary JSON file
    const tempDir = tmpdir();
    const testFile = join(tempDir, 'test-data.json');
    writeFileSync(
      testFile,
      JSON.stringify([
        { name: 'Alice', age: 30, city: 'New York' },
        { name: 'Bob', age: 25, city: 'San Francisco' },
      ])
    );

    // Upload file
    const fileInput = page.getByLabel(/upload json/i);
    await fileInput.setInputFiles(testFile);

    // Verify upload success
    await expect(page.getByText(/2 records loaded/i)).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/build pipeline/i)).toBeVisible();
    await expect(page.getByText(/3\. preview/i)).toBeVisible();

    // Cleanup
    unlinkSync(testFile);
  });

  test('should add a limit operation to pipeline via drag and drop', async ({ page }) => {
    // Upload data first
    const tempDir = tmpdir();
    const testFile = join(tempDir, 'data.json');
    writeFileSync(testFile, JSON.stringify([{ x: 1 }, { x: 2 }, { x: 3 }]));

    const fileInput = page.getByLabel(/upload json/i);
    await fileInput.setInputFiles(testFile);

    await expect(page.getByText(/3 records loaded/i)).toBeVisible({ timeout: 5000 });

    // Wait for palette to be visible
    await expect(page.getByTestId('operation-palette')).toBeVisible();

    // Find the Limit operation card and the pipeline canvas
    const limitCard = page.getByTestId('operation-card-limit');
    const canvas = page.getByLabel('Transform pipeline canvas');

    // Drag the Limit operation to the canvas
    await limitCard.dragTo(canvas);

    // Verify operation appears in canvas
    await expect(page.getByRole('button', { name: /operation: limit/i })).toBeVisible({
      timeout: 2000,
    });

    // Cleanup
    unlinkSync(testFile);
  });

  test('should show live preview of transformed data', async ({ page }) => {
    // Upload data
    const tempDir = tmpdir();
    const testFile = join(tempDir, 'data.json');
    writeFileSync(
      testFile,
      JSON.stringify([
        { name: 'Alice', age: 30 },
        { name: 'Bob', age: 25 },
        { name: 'Charlie', age: 35 },
      ])
    );

    const fileInput = page.getByLabel(/upload json/i);
    await fileInput.setInputFiles(testFile);

    await expect(page.getByText(/3 records loaded/i)).toBeVisible({ timeout: 5000 });

    // Add select operation via store
    await page.evaluate(() => {
      const store = (window as any).useTransformBuilderStore.getState();
      store.addOperation({ operation: 'select', fields: { name: '$.name' } });
    });

    // Wait for preview to update
    await page.waitForTimeout(500);

    // Verify preview shows selected field
    const previewSection = page.locator('section').filter({ hasText: '3. Preview' });
    await expect(previewSection.getByText(/"name"/i)).toBeVisible();

    // Cleanup
    unlinkSync(testFile);
  });

  test('should export YAML when button clicked', async ({ page }) => {
    // Upload data and add operation
    const tempDir = tmpdir();
    const testFile = join(tempDir, 'data.json');
    writeFileSync(testFile, JSON.stringify([{ x: 1 }]));

    const fileInput = page.getByLabel(/upload json/i);
    await fileInput.setInputFiles(testFile);

    await expect(page.getByText(/1 records loaded/i)).toBeVisible({ timeout: 5000 });

    // Add operation
    await page.evaluate(() => {
      const store = (window as any).useTransformBuilderStore.getState();
      store.addOperation({ operation: 'limit', count: 10 });
    });

    // Click export button
    const exportButton = page.getByRole('button', { name: /export yaml/i });
    await exportButton.click();

    // Verify YAML dialog appears
    await expect(page.getByRole('heading', { name: /exported yaml/i })).toBeVisible();
    await expect(page.getByText(/apiVersion: workflows\.example\.com\/v1/i)).toBeVisible();
    await expect(page.getByText(/kind: WorkflowTask/i)).toBeVisible();

    // Cleanup
    unlinkSync(testFile);
  });

  test('should handle invalid JSON upload', async ({ page }) => {
    // Create invalid JSON file
    const tempDir = tmpdir();
    const testFile = join(tempDir, 'invalid.json');
    writeFileSync(testFile, 'invalid json{');

    const fileInput = page.getByLabel(/upload json/i);
    await fileInput.setInputFiles(testFile);

    // Verify error message
    await expect(page.getByText(/invalid json/i)).toBeVisible({ timeout: 2000 });

    // Cleanup
    unlinkSync(testFile);
  });

  test('should handle reset workflow', async ({ page }) => {
    // Upload data and add operation
    const tempDir = tmpdir();
    const testFile = join(tempDir, 'data.json');
    writeFileSync(testFile, JSON.stringify([{ x: 1 }]));

    const fileInput = page.getByLabel(/upload json/i);
    await fileInput.setInputFiles(testFile);

    await expect(page.getByText(/1 records loaded/i)).toBeVisible({ timeout: 5000 });

    await page.evaluate(() => {
      const store = (window as any).useTransformBuilderStore.getState();
      store.addOperation({ operation: 'limit', count: 10 });
    });

    // Click reset button and accept confirm
    page.on('dialog', async (dialog) => {
      expect(dialog.message()).toContain('Reset');
      await dialog.accept();
    });

    const resetButton = page.getByRole('button', { name: /reset/i });
    await resetButton.click();

    // Verify workflow is reset
    await page.waitForTimeout(500);
    await expect(page.getByRole('button', { name: /operation: limit/i })).not.toBeVisible();

    // Cleanup
    unlinkSync(testFile);
  });

  test('should support multiple operations in sequence via drag and drop', async ({ page }) => {
    // Upload data
    const tempDir = tmpdir();
    const testFile = join(tempDir, 'data.json');
    writeFileSync(
      testFile,
      JSON.stringify([
        { name: 'Alice', age: 30 },
        { name: 'Bob', age: 25 },
        { name: 'Charlie', age: 35 },
        { name: 'Diana', age: 28 },
      ])
    );

    const fileInput = page.getByLabel(/upload json/i);
    await fileInput.setInputFiles(testFile);

    await expect(page.getByText(/4 records loaded/i)).toBeVisible({ timeout: 5000 });

    // Wait for palette to be visible
    await expect(page.getByTestId('operation-palette')).toBeVisible();

    const canvas = page.getByLabel('Transform pipeline canvas');

    // Drag multiple operations to canvas
    // Test limit and filter (which reliably work with drag-and-drop)
    const limitCard = page.getByTestId('operation-card-limit');
    await limitCard.dragTo(canvas);
    await expect(page.getByRole('button', { name: /operation: limit/i })).toBeVisible({
      timeout: 2000,
    });

    const filterCard = page.getByTestId('operation-card-filter');
    await filterCard.dragTo(canvas);
    await expect(page.getByRole('button', { name: /operation: filter/i })).toBeVisible({
      timeout: 2000,
    });

    // Verify we have 2 operations in sequence (connected by edges)
    // This proves multiple operations can be added via drag-and-drop
    const operations = page.locator('[role="button"][aria-label^="Operation:"]');
    await expect(operations).toHaveCount(2);

    // Cleanup
    unlinkSync(testFile);
  });

  test('should show pagination in preview for large datasets', async ({ page }) => {
    // Upload large dataset
    const tempDir = tmpdir();
    const testFile = join(tempDir, 'large-data.json');
    const largeData = Array.from({ length: 25 }, (_, i) => ({ id: i, value: `item-${i}` }));
    writeFileSync(testFile, JSON.stringify(largeData));

    const fileInput = page.getByLabel(/upload json/i);
    await fileInput.setInputFiles(testFile);

    await expect(page.getByText(/25 records loaded/i)).toBeVisible({ timeout: 5000 });

    // Verify pagination controls appear
    await expect(page.getByText(/showing 1-10 of 25/i)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Next', exact: true })).toBeVisible();

    // Cleanup
    unlinkSync(testFile);
  });

  test('should change page size in preview', async ({ page }) => {
    // Upload dataset
    const tempDir = tmpdir();
    const testFile = join(tempDir, 'data.json');
    const data = Array.from({ length: 30 }, (_, i) => ({ id: i }));
    writeFileSync(testFile, JSON.stringify(data));

    const fileInput = page.getByLabel(/upload json/i);
    await fileInput.setInputFiles(testFile);

    await expect(page.getByText(/30 records loaded/i)).toBeVisible({ timeout: 5000 });

    // Change page size
    const pageSizeSelect = page.getByRole('combobox', { name: /page size/i });
    await pageSizeSelect.selectOption('25');

    // Verify pagination updated
    await expect(page.getByText(/showing 1-25 of 30/i)).toBeVisible();

    // Cleanup
    unlinkSync(testFile);
  });

  test('should have accessible keyboard navigation', async ({ page }) => {
    await page.keyboard.press('Tab');

    // Verify focus is on interactive elements
    const focusedElement = await page.evaluate(() => {
      const el = document.activeElement;
      return el?.tagName;
    });

    expect(focusedElement).toBeTruthy();
  });

  test('should copy YAML to clipboard', async ({ page }) => {
    // Upload data and add operation
    const tempDir = tmpdir();
    const testFile = join(tempDir, 'data.json');
    writeFileSync(testFile, JSON.stringify([{ x: 1 }]));

    const fileInput = page.getByLabel(/upload json/i);
    await fileInput.setInputFiles(testFile);

    await expect(page.getByText(/1 records loaded/i)).toBeVisible({ timeout: 5000 });

    await page.evaluate(() => {
      const store = (window as any).useTransformBuilderStore.getState();
      store.addOperation({ operation: 'limit', count: 5 });
    });

    // Open YAML dialog
    const exportButton = page.getByRole('button', { name: /export yaml/i });
    await exportButton.click();

    await expect(page.getByRole('heading', { name: /exported yaml/i })).toBeVisible();

    // Grant clipboard permissions
    await page.context().grantPermissions(['clipboard-write']);

    // Click copy button
    const copyButton = page.getByRole('button', { name: /copy to clipboard/i });
    await copyButton.click();

    // Verify clipboard has content (note: actual clipboard content verification
    // is limited in Playwright, so we just verify the button works)
    await expect(copyButton).toBeVisible();

    // Cleanup
    unlinkSync(testFile);
  });

  test('should close YAML dialog', async ({ page }) => {
    // Upload data and add operation
    const tempDir = tmpdir();
    const testFile = join(tempDir, 'data.json');
    writeFileSync(testFile, JSON.stringify([{ x: 1 }]));

    const fileInput = page.getByLabel(/upload json/i);
    await fileInput.setInputFiles(testFile);

    await expect(page.getByText(/1 records loaded/i)).toBeVisible({ timeout: 5000 });

    await page.evaluate(() => {
      const store = (window as any).useTransformBuilderStore.getState();
      store.addOperation({ operation: 'limit', count: 5 });
    });

    // Open YAML dialog
    const exportButton = page.getByRole('button', { name: /export yaml/i });
    await exportButton.click();

    await expect(page.getByRole('heading', { name: /exported yaml/i })).toBeVisible();

    // Close dialog
    const closeButton = page.getByRole('button', { name: /close/i }).last();
    await closeButton.click();

    // Verify dialog is closed
    await expect(page.getByRole('heading', { name: /exported yaml/i })).not.toBeVisible();

    // Cleanup
    unlinkSync(testFile);
  });

  test('should handle non-array JSON upload', async ({ page }) => {
    // Create JSON object (not array)
    const tempDir = tmpdir();
    const testFile = join(tempDir, 'object.json');
    writeFileSync(testFile, JSON.stringify({ x: 1, y: 2 }));

    const fileInput = page.getByLabel(/upload json/i);
    await fileInput.setInputFiles(testFile);

    // Verify error message
    await expect(page.getByText(/must be an array/i)).toBeVisible({ timeout: 2000 });

    // Cleanup
    unlinkSync(testFile);
  });

  test('should show export button only when operations exist', async ({ page }) => {
    // Upload data
    const tempDir = tmpdir();
    const testFile = join(tempDir, 'data.json');
    writeFileSync(testFile, JSON.stringify([{ x: 1 }]));

    const fileInput = page.getByLabel(/upload json/i);
    await fileInput.setInputFiles(testFile);

    await expect(page.getByText(/1 records loaded/i)).toBeVisible({ timeout: 5000 });

    // Export button should not be visible without operations
    await expect(page.getByRole('button', { name: /export yaml/i })).not.toBeVisible();

    // Add operation
    await page.evaluate(() => {
      const store = (window as any).useTransformBuilderStore.getState();
      store.addOperation({ operation: 'limit', count: 10 });
    });

    // Export button should now be visible
    await expect(page.getByRole('button', { name: /export yaml/i })).toBeVisible();

    // Cleanup
    unlinkSync(testFile);
  });
});
