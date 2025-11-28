import { test, expect } from '@playwright/test';

test.describe('Tasks Pages', () => {
  test.describe('Tasks List Page', () => {
    test('should display list of tasks', async ({ page }) => {
      await page.goto('/tasks');

      // Wait for tasks to load
      await expect(page.getByRole('heading', { name: 'Tasks' })).toBeVisible();

      // Should show task count (backend has 14 tasks)
      await expect(page.getByText(/Available workflow tasks \(\d+\)/)).toBeVisible();

      // Should display task cards from real backend
      await expect(page.getByText('fetch-user')).toBeVisible();
      await expect(page.getByText('create-post')).toBeVisible();
    });

    test('should navigate to task detail page', async ({ page }) => {
      await page.goto('/tasks');

      // Click on a task card
      await page.getByText('fetch-user').first().click();

      // Should navigate to task detail page
      await expect(page).toHaveURL('/tasks/fetch-user');
    });
  });

  test.describe('Task Detail Page', () => {
    test('should display task details', async ({ page }) => {
      await page.goto('/tasks/fetch-user');

      // Should show task name
      await expect(page.getByRole('heading', { name: 'fetch-user' })).toBeVisible();

      // Should show stats (even if they're 0)
      await expect(page.getByText('Used By')).toBeVisible();
      await expect(page.getByText('Executions')).toBeVisible();
      await expect(page.getByText('Avg Duration')).toBeVisible();
      await expect(page.getByText('Success Rate')).toBeVisible();
    });

    test('should display schemas', async ({ page }) => {
      await page.goto('/tasks/fetch-user');

      // Should show input schema
      await expect(page.getByText('Input Schema')).toBeVisible();

      // Should show output schema
      await expect(page.getByText('Output Schema')).toBeVisible();

      // Should show userId property in input schema
      await expect(page.getByText(/userId/)).toBeVisible();
    });

    test('should display workflows using task', async ({ page }) => {
      await page.goto('/tasks/fetch-user');

      // Should show usage section
      await expect(page.getByText('Workflows Using This Task')).toBeVisible();

      // Should list workflows from real backend (fetch-user is used by several workflows)
      // Just verify the section exists, don't check specific workflow names as they may change
      await expect(page.locator('text=total')).toBeVisible();
    });

    test('should display recent executions', async ({ page }) => {
      await page.goto('/tasks/fetch-user');

      // Should show executions section
      await expect(page.getByText('Recent Executions')).toBeVisible();

      // Should show average duration
      await expect(page.getByText(/Avg:/)).toBeVisible();
    });

    test('should handle task not found', async ({ page }) => {
      await page.goto('/tasks/non-existent-task-xyz');

      // Should show error message
      await expect(page.getByText(/Task not found|not found/i)).toBeVisible();
    });
  });

  test.describe('Navigation', () => {
    test('should navigate from task detail back to tasks list', async ({ page }) => {
      await page.goto('/tasks/fetch-user');

      // Wait for page to load
      await expect(page.getByRole('heading', { name: 'fetch-user' })).toBeVisible();

      // Click breadcrumb link
      await page.getByRole('link', { name: 'Tasks' }).click();

      // Should navigate back to tasks list
      await expect(page).toHaveURL('/tasks');
    });

    test('should navigate from task to workflow', async ({ page }) => {
      await page.goto('/tasks/fetch-user');

      // Wait for workflows to load
      await expect(page.getByText('Workflows Using This Task')).toBeVisible();

      // Find and click the first workflow link (using real workflow from backend)
      const workflowLinks = page.locator('a[href^="/workflows/"]');
      const firstLink = workflowLinks.first();

      if (await firstLink.count() > 0) {
        const href = await firstLink.getAttribute('href');
        await firstLink.click();
        await expect(page).toHaveURL(href!);
      }
    });
  });
});
