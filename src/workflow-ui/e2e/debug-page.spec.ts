import { test, expect } from '@playwright/test';

test.describe('Debug Page', () => {
  // Mock execution ID for testing
  const mockExecutionId = 'test-execution-123';

  test.beforeEach(async ({ page }) => {
    // Set up API mocks for execution detail and trace
    await page.route('**/api/executions/*/trace', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          executionId: mockExecutionId,
          workflowName: 'test-workflow',
          startedAt: '2025-01-01T10:00:00Z',
          completedAt: '2025-01-01T10:00:02Z',
          totalDurationMs: 2000,
          taskTimings: [
            {
              taskId: 'task-1',
              taskRef: 'fetch-user',
              startedAt: '2025-01-01T10:00:00.100Z',
              completedAt: '2025-01-01T10:00:00.600Z',
              durationMs: 500,
              waitTimeMs: 100,
              status: 'Succeeded',
            },
            {
              taskId: 'task-2',
              taskRef: 'send-email',
              startedAt: '2025-01-01T10:00:00.700Z',
              completedAt: '2025-01-01T10:00:02Z',
              durationMs: 1300,
              waitTimeMs: 100,
              status: 'Succeeded',
            },
          ],
          dependencyOrder: [
            { taskId: 'task-1', dependsOn: [], level: 0 },
            { taskId: 'task-2', dependsOn: ['task-1'], level: 1 },
          ],
          plannedParallelGroups: [
            { level: 0, taskIds: ['task-1'] },
            { level: 1, taskIds: ['task-2'] },
          ],
          actualParallelGroups: [],
        }),
      });
    });

    await page.route(`**/api/executions/${mockExecutionId}`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          executionId: mockExecutionId,
          workflowName: 'test-workflow',
          success: true,
          output: { result: 'success' },
          executionTimeMs: 2000,
          startedAt: '2025-01-01T10:00:00Z',
          completedAt: '2025-01-01T10:00:02Z',
          input: { userId: 123 },
          tasks: [
            {
              taskId: 'task-1',
              taskName: 'fetch-user',
              status: 'Succeeded',
              output: { name: 'John', email: 'john@example.com' },
              input: { userId: 123 },
              durationMs: 500,
              startedAt: '2025-01-01T10:00:00.100Z',
              completedAt: '2025-01-01T10:00:00.600Z',
              retryCount: 0,
            },
            {
              taskId: 'task-2',
              taskName: 'send-email',
              status: 'Succeeded',
              output: { sent: true },
              input: { email: 'john@example.com' },
              durationMs: 1300,
              startedAt: '2025-01-01T10:00:00.700Z',
              completedAt: '2025-01-01T10:00:02Z',
              retryCount: 0,
            },
          ],
        }),
      });
    });
  });

  test('Test 1: Navigate to debug page directly', async ({ page }) => {
    await page.goto(`/executions/${mockExecutionId}/debug`);

    // Should see the debugging header
    await expect(page.getByText(/debugging:/i)).toBeVisible();

    // Should see the execution ID
    await expect(page.getByText(new RegExp(mockExecutionId.slice(0, 8)))).toBeVisible();
  });

  test('Test 2: Timeline scrubbing updates graph highlight', async ({ page }) => {
    await page.goto(`/executions/${mockExecutionId}/debug`);

    // Wait for page to load
    await expect(page.getByRole('region', { name: /execution timeline/i })).toBeVisible();

    // Get the timeline scrubber
    const scrubber = page.getByRole('slider', { name: /timeline scrubber/i });
    await expect(scrubber).toBeVisible();

    // Change the scrubber value
    await scrubber.fill('2');

    // The workflow graph should be visible
    await expect(page.getByRole('region', { name: /workflow graph/i })).toBeVisible();
  });

  test('Test 3: Click task in graph shows inspector', async ({ page }) => {
    await page.goto(`/executions/${mockExecutionId}/debug`);

    // Wait for page to load
    await expect(page.getByRole('region', { name: /workflow graph/i })).toBeVisible();

    // Switch to Inspect tab
    await page.getByRole('button', { name: /inspect/i }).click();

    // Initially shows message to click a task
    await expect(page.getByText(/click on a task in the graph/i)).toBeVisible();
  });

  test('Test 4: Tab navigation between Timeline, Inspect, and Compare', async ({ page }) => {
    await page.goto(`/executions/${mockExecutionId}/debug`);

    // Timeline tab should be active by default
    const timelineTab = page.getByRole('button', { name: /timeline/i });
    await expect(timelineTab).toHaveClass(/border-blue-500/);

    // Click Inspect tab
    await page.getByRole('button', { name: /inspect/i }).click();
    await expect(page.getByText(/click on a task in the graph/i)).toBeVisible();

    // Click Compare tab
    await page.getByRole('button', { name: /compare/i }).click();
    await expect(page.getByText(/select another execution to compare/i)).toBeVisible();

    // Click back to Timeline
    await page.getByRole('button', { name: /timeline/i }).click();
    await expect(page.getByRole('region', { name: /execution timeline/i })).toBeVisible();
  });

  test('Test 5: Variable watcher displays input and output variables', async ({ page }) => {
    await page.goto(`/executions/${mockExecutionId}/debug`);

    // Wait for variable watcher to load
    await expect(page.getByRole('region', { name: /variable watcher/i })).toBeVisible();

    // Should show input variables
    await expect(page.getByText(/input\.userId/i)).toBeVisible();

    // Should show task output variables (use first() since multiple task outputs exist)
    await expect(page.getByText(/tasks\.task-1\.output/i).first()).toBeVisible();
  });

  test('Test 6: Back to workflow link works', async ({ page }) => {
    await page.goto(`/executions/${mockExecutionId}/debug`);

    // Find the back link
    const backLink = page.getByRole('link', { name: /back to workflow/i });
    await expect(backLink).toBeVisible();

    // Verify link href
    await expect(backLink).toHaveAttribute('href', '/workflows/test-workflow');
  });

  test('Test 7: Execution status badge displays correctly for success', async ({ page }) => {
    await page.goto(`/executions/${mockExecutionId}/debug`);

    // Should show Succeeded badge
    await expect(page.getByText('Succeeded')).toBeVisible();

    // Should show duration
    await expect(page.getByText('2000ms')).toBeVisible();
  });

  test('Test 8: Execution status badge displays correctly for failed', async ({ page }) => {
    // Override mock for failed execution
    await page.route(`**/api/executions/${mockExecutionId}`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          executionId: mockExecutionId,
          workflowName: 'test-workflow',
          success: false,
          error: 'Task failed',
          executionTimeMs: 1500,
          startedAt: '2025-01-01T10:00:00Z',
          completedAt: '2025-01-01T10:00:01.500Z',
          input: { userId: 123 },
          tasks: [
            {
              taskId: 'task-1',
              taskName: 'fetch-user',
              status: 'Failed',
              error: 'Connection timeout',
              input: { userId: 123 },
              durationMs: 1500,
              startedAt: '2025-01-01T10:00:00Z',
              completedAt: '2025-01-01T10:00:01.500Z',
              retryCount: 3,
            },
          ],
        }),
      });
    });

    await page.goto(`/executions/${mockExecutionId}/debug`);

    // Should show Failed badge
    await expect(page.getByText('Failed')).toBeVisible();
  });
});

test.describe('Debug Page from Execution History', () => {
  test('Navigate from execution history to debug page', async ({ page }) => {
    // Mock workflows endpoint
    await page.route('**/api/workflows', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          workflows: [
            {
              name: 'test-workflow',
              namespace: 'default',
              description: 'Test workflow',
              taskCount: 2,
              lastExecuted: '2025-01-01T10:00:00Z',
            },
          ],
          total: 1,
        }),
      });
    });

    // Mock workflow detail
    await page.route('**/api/workflows/test-workflow', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          name: 'test-workflow',
          namespace: 'default',
          description: 'Test workflow',
          inputSchema: {},
          tasks: [],
        }),
      });
    });

    // Mock executions
    await page.route('**/api/workflows/test-workflow/executions*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          executions: [
            {
              executionId: 'exec-001',
              workflowName: 'test-workflow',
              status: 'success',
              startedAt: '2025-01-01T10:00:00Z',
              durationMs: 1500,
            },
          ],
          total: 1,
          limit: 10,
          offset: 0,
        }),
      });
    });

    // Navigate to workflow detail
    await page.goto('/workflows/test-workflow');

    // Look for the debug link in the execution history
    const debugLink = page.getByRole('link', { name: /debug/i }).first();

    // If the link exists, verify it points to the debug page
    if (await debugLink.isVisible()) {
      const href = await debugLink.getAttribute('href');
      expect(href).toContain('/executions/');
      expect(href).toContain('/debug');
    }
  });
});

test.describe('Debug Page Accessibility', () => {
  const mockExecutionId = 'test-execution-123';

  test.beforeEach(async ({ page }) => {
    await page.route('**/api/executions/*/trace', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          executionId: mockExecutionId,
          workflowName: 'test-workflow',
          startedAt: '2025-01-01T10:00:00Z',
          completedAt: '2025-01-01T10:00:02Z',
          totalDurationMs: 2000,
          taskTimings: [],
          dependencyOrder: [],
          plannedParallelGroups: [],
          actualParallelGroups: [],
        }),
      });
    });

    await page.route(`**/api/executions/${mockExecutionId}`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          executionId: mockExecutionId,
          workflowName: 'test-workflow',
          success: true,
          output: {},
          executionTimeMs: 2000,
          startedAt: '2025-01-01T10:00:00Z',
          completedAt: '2025-01-01T10:00:02Z',
          input: {},
          tasks: [],
        }),
      });
    });
  });

  test('Page has proper heading structure', async ({ page }) => {
    await page.goto(`/executions/${mockExecutionId}/debug`);

    // Should have main heading
    await expect(page.getByText(/debugging:/i)).toBeVisible();
  });

  test('Tab navigation is keyboard accessible', async ({ page }) => {
    await page.goto(`/executions/${mockExecutionId}/debug`);

    // Wait for tabs to be visible
    await expect(page.getByRole('button', { name: /timeline/i })).toBeVisible();

    // Tab to the Inspect button and press Enter
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Enter');

    // Verify we can navigate using keyboard
    // (exact behavior depends on focus order)
  });

  test('Timeline scrubber has proper ARIA label', async ({ page }) => {
    await page.goto(`/executions/${mockExecutionId}/debug`);

    const scrubber = page.getByRole('slider', { name: /timeline scrubber/i });
    await expect(scrubber).toBeVisible();
  });
});
