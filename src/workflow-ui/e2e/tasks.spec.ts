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

      if ((await firstLink.count()) > 0) {
        const href = await firstLink.getAttribute('href');
        await firstLink.click();
        await expect(page).toHaveURL(href!);
      }
    });
  });

  test.describe('Task Duration Trends', () => {
    test('should display duration trends chart on task detail page', async ({ page }) => {
      await page.goto('/tasks/fetch-todos');

      // Wait for page to load
      await expect(page.getByRole('heading', { name: 'fetch-todos' })).toBeVisible();

      // Should show Duration Trends heading
      await expect(page.getByText('Duration Trends')).toBeVisible();

      // Should show metric toggle buttons
      await expect(page.getByRole('button', { name: /Average/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /Median \(P50\)/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /P95/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /Min-Max Range/i })).toBeVisible();
    });

    test('should toggle duration metrics', async ({ page }) => {
      await page.goto('/tasks/fetch-todos');

      // Wait for page to load
      await expect(page.getByRole('heading', { name: 'fetch-todos' })).toBeVisible();

      const avgButton = page.getByRole('button', { name: /Average/i });
      const p50Button = page.getByRole('button', { name: /Median \(P50\)/i });

      // Average should be enabled by default
      await expect(avgButton).toHaveAttribute('aria-pressed', 'true');

      // P50 should be disabled by default
      await expect(p50Button).toHaveAttribute('aria-pressed', 'false');

      // Click P50 to enable it
      await p50Button.click();
      await expect(p50Button).toHaveAttribute('aria-pressed', 'true');

      // Click Average to disable it
      await avgButton.click();
      await expect(avgButton).toHaveAttribute('aria-pressed', 'false');
    });

    test('should display summary statistics', async ({ page }) => {
      await page.goto('/tasks/fetch-todos');

      // Wait for duration trends to load
      await expect(page.getByText('Duration Trends')).toBeVisible();

      // Should show summary stats
      await expect(page.getByText('Total Executions')).toBeVisible();
      await expect(page.getByText('Overall Success Rate')).toBeVisible();
      await expect(page.getByText('Avg Duration (Period)')).toBeVisible();
      await expect(page.getByText('P95 Duration (Period)')).toBeVisible();
    });

    test('should handle task with no execution data', async ({ page }) => {
      // Navigate to a task that likely has no executions
      await page.goto('/tasks/complex-aggregation');

      // Wait for page to load
      await expect(page.getByRole('heading', { name: 'complex-aggregation' })).toBeVisible();

      // Should show empty state message
      await expect(
        page.getByText(/No execution data available|Execute the task to see trends/i)
      ).toBeVisible();
    });
  });
});
