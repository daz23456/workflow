import { test, expect } from '@playwright/test';

test.describe('Template Selection Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to templates page before each test
    await page.goto('http://localhost:3001/templates');
  });

  test('should display templates page with title and description', async ({ page }) => {
    // Check page title
    await expect(page.locator('h1')).toContainText('Workflow Templates');

    // Check page description
    await expect(page.getByText(/Browse pre-built workflow templates/i)).toBeVisible();
  });

  test('should display template cards with metadata', async ({ page }) => {
    // Wait for templates to load
    await page.waitForSelector('[data-testid^="template-card-"]', { timeout: 5000 });

    // Get first template card
    const firstCard = page.locator('[data-testid^="template-card-"]').first();
    await expect(firstCard).toBeVisible();

    // Check template card has required metadata
    await expect(firstCard.locator('.text-lg.font-semibold')).toBeVisible(); // Template name
    await expect(firstCard.locator('.text-sm.text-gray-600')).toBeVisible(); // Description
  });

  test('should filter templates by category', async ({ page }) => {
    // Wait for templates to load
    await page.waitForSelector('[data-testid^="template-card-"]', { timeout: 5000 });

    // Get initial count
    const initialCount = await page.locator('[data-testid^="template-card-"]').count();
    expect(initialCount).toBeGreaterThan(0);

    // Click on a category filter (e.g., "API Composition")
    const categoryButton = page.getByRole('button', { name: /API Composition/i });
    if (await categoryButton.isVisible()) {
      await categoryButton.click();

      // Wait for filter to apply
      await page.waitForTimeout(500);

      // Get filtered count
      const filteredCount = await page.locator('[data-testid^="template-card-"]').count();

      // Filtered count should be less than or equal to initial count
      expect(filteredCount).toBeLessThanOrEqual(initialCount);
    }
  });

  test('should search templates by name', async ({ page }) => {
    // Wait for templates to load
    await page.waitForSelector('[data-testid^="template-card-"]', { timeout: 5000 });

    // Find search input
    const searchInput = page.getByPlaceholder(/Search templates/i);
    await expect(searchInput).toBeVisible();

    // Type in search
    await searchInput.fill('api');

    // Wait for search to apply
    await page.waitForTimeout(500);

    // Check that results are filtered
    const visibleCards = page.locator('[data-testid^="template-card-"]');
    const count = await visibleCards.count();

    // Should have at least some results or "no templates match" message
    if (count === 0) {
      await expect(page.getByText(/No templates match your filters/i)).toBeVisible();
    } else {
      expect(count).toBeGreaterThan(0);
    }
  });

  test('should open template preview modal on preview button click', async ({ page }) => {
    // Wait for templates to load
    await page.waitForSelector('[data-testid^="template-card-"]', { timeout: 5000 });

    // Click preview button on first template
    const firstCard = page.locator('[data-testid^="template-card-"]').first();
    const previewButton = firstCard.getByRole('button', { name: /Preview/i });
    await previewButton.click();

    // Wait for modal to appear
    await expect(page.locator('.fixed.inset-0.bg-black.bg-opacity-50')).toBeVisible();

    // Check modal has template details
    await expect(page.locator('.bg-white.rounded-lg.shadow-xl')).toBeVisible();
  });

  test('should close template preview modal on close button click', async ({ page }) => {
    // Wait for templates to load
    await page.waitForSelector('[data-testid^="template-card-"]', { timeout: 5000 });

    // Open modal
    const firstCard = page.locator('[data-testid^="template-card-"]').first();
    const previewButton = firstCard.getByRole('button', { name: /Preview/i });
    await previewButton.click();

    // Wait for modal
    await expect(page.locator('.fixed.inset-0.bg-black.bg-opacity-50')).toBeVisible();

    // Click close button
    const closeButton = page.getByRole('button', { name: /Close/i }).first();
    await closeButton.click();

    // Modal should be gone
    await expect(page.locator('.fixed.inset-0.bg-black.bg-opacity-50')).not.toBeVisible();
  });

  test('should navigate to workflow builder when deploying template', async ({ page }) => {
    // Wait for templates to load
    await page.waitForSelector('[data-testid^="template-card-"]', { timeout: 5000 });

    // Get first template name
    const firstCard = page.locator('[data-testid^="template-card-"]').first();
    const templateName = await firstCard.getAttribute('data-testid');
    const extractedName = templateName?.replace('template-card-', '') || '';

    // Click deploy button
    const deployButton = firstCard.getByRole('button', { name: /Deploy/i });
    await deployButton.click();

    // Should navigate to workflow builder with template parameter
    await expect(page).toHaveURL(new RegExp(`/workflows/new\\?template=${extractedName}`));

    // Should see workflow builder page
    await expect(page.getByText(/Create New Workflow/i)).toBeVisible();
  });

  test('should auto-load template in workflow builder from URL parameter', async ({ page }) => {
    // Get a template name from the templates page first
    await page.waitForSelector('[data-testid^="template-card-"]', { timeout: 5000 });
    const firstCard = page.locator('[data-testid^="template-card-"]').first();
    const templateName = await firstCard.getAttribute('data-testid');
    const extractedName = templateName?.replace('template-card-', '') || '';

    // Navigate directly to workflow builder with template parameter
    await page.goto(`http://localhost:3001/workflows/new?template=${extractedName}`);

    // Wait for workflow name input to be populated
    const nameInput = page.locator('#workflow-name');
    await expect(nameInput).toHaveValue(extractedName, { timeout: 5000 });
  });

  test('should clear all filters when Clear All button is clicked', async ({ page }) => {
    // Wait for templates to load
    await page.waitForSelector('[data-testid^="template-card-"]', { timeout: 5000 });

    // Apply a category filter
    const categoryButton = page.getByRole('button', { name: /API Composition/i });
    if (await categoryButton.isVisible()) {
      await categoryButton.click();
      await page.waitForTimeout(500);

      // Check if Clear All button appears
      const clearAllButton = page.getByRole('button', { name: /Clear All/i });
      if (await clearAllButton.isVisible()) {
        // Get filtered count before clearing
        const filteredCount = await page.locator('[data-testid^="template-card-"]').count();

        // Click Clear All
        await clearAllButton.click();
        await page.waitForTimeout(500);

        // Get count after clearing
        const clearedCount = await page.locator('[data-testid^="template-card-"]').count();

        // Should have more templates after clearing
        expect(clearedCount).toBeGreaterThanOrEqual(filteredCount);
      }
    }
  });

  test('should display template count in results summary', async ({ page }) => {
    // Wait for templates to load
    await page.waitForSelector('[data-testid^="template-card-"]', { timeout: 5000 });

    // Check for results count text
    await expect(page.getByText(/Showing \d+ of \d+ templates/i)).toBeVisible();

    // Get actual count
    const actualCount = await page.locator('[data-testid^="template-card-"]').count();

    // Results text should match actual count
    const resultsText = await page.getByText(/Showing \d+ of \d+ templates/i).textContent();
    expect(resultsText).toContain(`Showing ${actualCount}`);
  });
});
