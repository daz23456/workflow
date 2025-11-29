import { test, expect, Page } from '@playwright/test';

// Helper function to set up mocked workflow API responses
async function mockWorkflowAPIs(page: Page, workflowName: string, options: {
  workflowData?: any;
  executionHistory?: any[];
  delay?: number;
} = {}) {
  const {
    workflowData = {
      name: workflowName,
      namespace: 'production',
      description: `${workflowName} workflow`,
      inputSchema: {
        type: 'object',
        properties: {
          email: { type: 'string', format: 'email' },
        },
        required: ['email'],
      },
      outputSchema: {},
      tasks: [
        {
          id: 'task-1',
          taskRef: 'test-task',
          description: 'Test task',
          dependencies: [],
        },
      ],
      graph: {
        nodes: [
          { id: 'task-1', label: 'Test Task', type: 'task' },
        ],
        edges: [],
        parallelGroups: [],
      },
      endpoints: {},
    },
    executionHistory = [],
    delay = 0,
  } = options;

  await page.route(`**/api/workflows/${workflowName}`, async (route) => {
    if (delay > 0) {
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(workflowData),
    });
  });

  await page.route(`**/api/workflows/${workflowName}/executions`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        executions: executionHistory,
        total: executionHistory.length,
        limit: 10,
        offset: 0,
      }),
    });
  });
}

test.describe('Workflow Detail Page', () => {
  test.describe('Basic Loading', () => {
    test('should load workflow detail page successfully', async ({ page }) => {
      await mockWorkflowAPIs(page, 'test-workflow');

      await page.goto('/workflows/test-workflow');

      // Should show workflow name
      await expect(page.getByText('test-workflow')).toBeVisible();

      // Should show Overview tab by default
      await expect(page.getByRole('tab', { name: /overview/i })).toHaveAttribute('aria-selected', 'true');
    });

    test('should show error state for 404', async ({ page }) => {
      await page.route('**/api/workflows/non-existent', async (route) => {
        await route.fulfill({
          status: 404,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Not found' }),
        });
      });

      await page.route('**/api/workflows/non-existent/executions', async (route) => {
        await route.fulfill({ status: 404 });
      });

      await page.goto('/workflows/non-existent');

      // Should show error message
      await expect(page.getByText('Workflow Not Found')).toBeVisible();
      await expect(page.getByRole('link', { name: /back to workflows/i })).toBeVisible();
    });
  });

  test.describe('Tab Navigation', () => {
    test.beforeEach(async ({ page }) => {
      await mockWorkflowAPIs(page, 'test-workflow');
      await page.goto('/workflows/test-workflow');
      await page.waitForLoadState('networkidle');
    });

    test('should switch between tabs', async ({ page }) => {
      // Start on Overview tab
      await expect(page.getByRole('tab', { name: /overview/i })).toHaveAttribute('aria-selected', 'true');

      // Switch to Execute tab
      await page.getByRole('tab', { name: /execute/i }).click();
      await expect(page.getByRole('tab', { name: /execute/i })).toHaveAttribute('aria-selected', 'true');

      // Should show execute form
      await expect(page.getByRole('button', { name: /execute/i })).toBeVisible();

      // Switch to History tab
      await page.getByRole('tab', { name: /history/i }).click();
      await expect(page.getByRole('tab', { name: /history/i })).toHaveAttribute('aria-selected', 'true');

      // Should show "Execution History" heading
      await expect(page.getByRole('heading', { name: /execution history/i })).toBeVisible();
    });
  });

  test.describe('Workflow Execution', () => {
    test.beforeEach(async ({ page }) => {
      await mockWorkflowAPIs(page, 'test-workflow');
      await page.goto('/workflows/test-workflow');
      await page.waitForLoadState('networkidle');
    });

    test('should execute workflow successfully', async ({ page }) => {
      // Mock execution endpoint
      await page.route('**/api/workflows/test-workflow/execute', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            executionId: 'exec-123',
            workflowName: 'test-workflow',
            success: true,
            output: { result: 'success' },
            tasks: [],
            executionTimeMs: 1000,
            startedAt: '2025-11-24T10:00:00Z',
          }),
        });
      });

      // Navigate to Execute tab
      await page.getByRole('tab', { name: /execute/i }).click();

      // Fill in email field
      await page.fill('input[name="email"]', 'test@example.com');

      // Click Execute button
      await page.getByRole('button', { name: /^execute$/i }).click();

      // Should show success message
      await expect(page.getByText(/execution completed/i)).toBeVisible({ timeout: 10000 });
    });

    test('should show validation error for empty required field', async ({ page }) => {
      // Navigate to Execute tab
      await page.getByRole('tab', { name: /execute/i }).click();

      // Try to execute without filling required field
      await page.getByRole('button', { name: /^execute$/i }).click();

      // Should show validation error
      await expect(page.getByText(/required/i)).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Execution History', () => {
    test('should display execution history', async ({ page }) => {
      const executionHistory = [
        {
          executionId: 'exec-1',
          workflowName: 'test-workflow',
          status: 'success',
          startedAt: '2025-11-24T10:00:00Z',
          completedAt: '2025-11-24T10:00:03Z',
          durationMs: 3000,
          inputSnapshot: { email: 'test@example.com' },
          outputSnapshot: { result: 'success' },
        },
        {
          executionId: 'exec-2',
          workflowName: 'test-workflow',
          status: 'failed',
          startedAt: '2025-11-24T09:30:00Z',
          completedAt: '2025-11-24T09:30:02Z',
          durationMs: 2000,
          error: 'Validation failed',
          inputSnapshot: { email: 'invalid' },
        },
      ];

      await mockWorkflowAPIs(page, 'test-workflow', { executionHistory });
      await page.goto('/workflows/test-workflow');
      await page.waitForLoadState('networkidle');

      // Navigate to History tab
      await page.getByRole('tab', { name: /history/i }).click();

      // Should show execution IDs
      await expect(page.getByText('exec-1')).toBeVisible();
      await expect(page.getByText('exec-2')).toBeVisible();

      // Should show duration
      await expect(page.getByText('3.0s')).toBeVisible();
      await expect(page.getByText('2.0s')).toBeVisible();
    });

    test('should filter execution history by status', async ({ page }) => {
      const executionHistory = [
        {
          executionId: 'exec-success',
          workflowName: 'test-workflow',
          status: 'success',
          startedAt: '2025-11-24T10:00:00Z',
          completedAt: '2025-11-24T10:00:03Z',
          durationMs: 3000,
          inputSnapshot: {},
        },
        {
          executionId: 'exec-failed',
          workflowName: 'test-workflow',
          status: 'failed',
          startedAt: '2025-11-24T09:30:00Z',
          completedAt: '2025-11-24T09:30:02Z',
          durationMs: 2000,
          error: 'Failed',
          inputSnapshot: {},
        },
      ];

      await mockWorkflowAPIs(page, 'test-workflow', { executionHistory });
      await page.goto('/workflows/test-workflow');
      await page.waitForLoadState('networkidle');

      // Navigate to History tab
      await page.getByRole('tab', { name: /history/i }).click();

      // Both should be visible initially
      await expect(page.getByText('exec-success')).toBeVisible();
      await expect(page.getByText('exec-failed')).toBeVisible();

      // Click "Success" filter
      const allButtons = page.getByRole('button');
      await allButtons.filter({ hasText: /^Success$/i }).first().click();

      // Only success execution should be visible
      await expect(page.getByText('exec-success')).toBeVisible();
      await expect(page.getByText('exec-failed')).not.toBeVisible();

      // Click "Failed" filter
      await allButtons.filter({ hasText: /^Failed$/i }).first().click();

      // Only failed execution should be visible
      await expect(page.getByText('exec-success')).not.toBeVisible();
      await expect(page.getByText('exec-failed')).toBeVisible();
    });

    test('should show execution details when clicking on execution', async ({ page }) => {
      const executionHistory = [
        {
          executionId: 'exec-1',
          workflowName: 'test-workflow',
          status: 'success',
          startedAt: '2025-11-24T10:00:00Z',
          completedAt: '2025-11-24T10:00:03Z',
          durationMs: 3000,
          inputSnapshot: {},
        },
      ];

      await mockWorkflowAPIs(page, 'test-workflow', { executionHistory });

      // Mock execution details endpoint
      await page.route('**/api/executions/exec-1', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            executionId: 'exec-1',
            workflowName: 'test-workflow',
            success: true,
            output: { result: 'success' },
            tasks: [],
            executionTimeMs: 3000,
            startedAt: '2025-11-24T10:00:00Z',
          }),
        });
      });

      await page.goto('/workflows/test-workflow');
      await page.waitForLoadState('networkidle');

      // Navigate to History tab
      await page.getByRole('tab', { name: /history/i }).click();

      // Click on execution
      await page.getByText('exec-1').click();

      // Should show execution result panel (may take a moment to fetch)
      await expect(page.getByText(/execution result/i)).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Accessibility', () => {
    test.beforeEach(async ({ page }) => {
      await mockWorkflowAPIs(page, 'test-workflow');
      await page.goto('/workflows/test-workflow');
      await page.waitForLoadState('networkidle');
    });

    test('should have proper ARIA attributes on tabs', async ({ page }) => {
      const overviewTab = page.getByRole('tab', { name: /overview/i });
      const executeTab = page.getByRole('tab', { name: /execute/i });
      const historyTab = page.getByRole('tab', { name: /history/i });

      // Overview should be selected by default
      await expect(overviewTab).toHaveAttribute('aria-selected', 'true');
      await expect(executeTab).toHaveAttribute('aria-selected', 'false');
      await expect(historyTab).toHaveAttribute('aria-selected', 'false');
    });

    test('should be keyboard navigable', async ({ page }) => {
      // Focus and activate Execute tab with keyboard
      await page.getByRole('tab', { name: /execute/i }).focus();
      await page.keyboard.press('Enter');

      // Execute tab should be active
      await expect(page.getByRole('tab', { name: /execute/i })).toHaveAttribute('aria-selected', 'true');
    });
  });

  test.describe('Workflow Duration Trends', () => {
    test('should display duration trends chart on workflow detail page', async ({ page }) => {
      await page.goto('/workflows/user-signup');

      // Wait for page to load
      await expect(page.getByRole('heading', { name: 'user-signup' })).toBeVisible();

      // Should show Duration Trends heading
      await expect(page.getByText('Duration Trends')).toBeVisible();

      // Should show metric toggle buttons
      await expect(page.getByRole('button', { name: /Average/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /Median \(P50\)/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /P95/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /Min-Max Range/i })).toBeVisible();
    });

    test('should toggle duration metrics on workflow page', async ({ page }) => {
      await page.goto('/workflows/user-signup');

      // Wait for page to load
      await expect(page.getByRole('heading', { name: 'user-signup' })).toBeVisible();

      const avgButton = page.getByRole('button', { name: /Average/i });
      const p95Button = page.getByRole('button', { name: /P95/i });

      // Average should be enabled by default
      await expect(avgButton).toHaveAttribute('aria-pressed', 'true');

      // P95 should be disabled by default
      await expect(p95Button).toHaveAttribute('aria-pressed', 'false');

      // Click P95 to enable it
      await p95Button.click();
      await expect(p95Button).toHaveAttribute('aria-pressed', 'true');
    });

    test('should display summary statistics on workflow page', async ({ page }) => {
      await page.goto('/workflows/user-signup');

      // Wait for duration trends to load
      await expect(page.getByText('Duration Trends')).toBeVisible();

      // Should show summary stats
      await expect(page.getByText('Total Executions')).toBeVisible();
      await expect(page.getByText('Overall Success Rate')).toBeVisible();
      await expect(page.getByText('Avg Duration (Period)')).toBeVisible();
      await expect(page.getByText('P95 Duration (Period)')).toBeVisible();
    });
  });
});
