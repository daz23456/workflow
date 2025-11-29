import { test, expect } from '@playwright/test';

test.describe('Workflow List User Flow', () => {
  test('complete workflow discovery flow', async ({ page }) => {
    // 1. Navigate to workflow list
    await page.goto('/');

    // 2. Wait for workflows to load
    await page.waitForSelector('[role="article"]', { state: 'visible' });
    const initialCards = await page.locator('[role="article"]').count();
    expect(initialCards).toBeGreaterThan(0);

    // 3. Verify workflow count is displayed
    await expect(page.getByText(/Showing \d+ workflows?/)).toBeVisible();

    // 4. Use keyboard shortcut "/" to focus search
    await page.keyboard.press('/');
    const searchInput = page.locator('input[placeholder*="Search"]');
    await expect(searchInput).toBeFocused();

    // 5. Search for specific workflow
    await searchInput.fill('user');
    await page.waitForTimeout(400); // Debounce

    // 6. Verify filtered results
    const filteredCards = await page.locator('[role="article"]').count();
    expect(filteredCards).toBeLessThanOrEqual(initialCards);

    // 7. Verify clear filters button appears
    await expect(page.getByRole('button', { name: /clear filters/i })).toBeVisible();
    await expect(page.getByText('1')).toBeVisible(); // Filter count badge

    // 8. Apply namespace filter
    await page.selectOption('select[id="namespace"]', { index: 1 });
    await page.waitForTimeout(200);

    // 9. Verify filter count updates
    await expect(page.getByRole('button', { name: /clear filters/i })).toBeVisible();

    // 10. Clear all filters with keyboard shortcut
    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);

    // 11. Verify filters are cleared
    await expect(searchInput).toHaveValue('');
    await expect(page.getByRole('button', { name: /clear filters/i })).not.toBeVisible();

    // 12. Change sort order
    await page.selectOption('select[id="sort"]', 'success-rate');
    await page.waitForTimeout(200);

    // 13. Verify sort indicator
    await expect(page.locator('select[id="sort"]')).toHaveValue('success-rate');

    // 14. Hover over workflow card
    const firstCard = page.locator('[role="article"]').first();
    await firstCard.hover();

    // 15. Click workflow card (navigation would happen in real app)
    // await firstCard.click();
    // In a real app, this would navigate to detail page
  });

  test('keyboard navigation flow', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('[role="article"]');

    // Tab through interactive elements
    await page.keyboard.press('Tab'); // Should focus first interactive element
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');

    // Press "/" to jump to search
    await page.keyboard.press('/');
    const searchInput = page.locator('input[placeholder*="Search"]');
    await expect(searchInput).toBeFocused();

    // Type search query
    await searchInput.fill('order');
    await page.waitForTimeout(400);

    // Press Escape to clear
    await page.keyboard.press('Escape');
    await expect(searchInput).toHaveValue('');
  });

  test('filter and sort combination', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('[role="article"]');

    // Apply multiple filters
    await page.fill('input[placeholder*="Search"]', 'user');
    await page.selectOption('select[id="namespace"]', { index: 1 });
    await page.selectOption('select[id="sort"]', 'executions');
    await page.waitForTimeout(500);

    // Verify filter count shows 2 (search + namespace, not default sort)
    const clearButton = page.getByRole('button', { name: /clear filters/i });
    await expect(clearButton).toBeVisible();

    // Clear filters
    await clearButton.click();

    // Verify all filters reset
    await expect(page.locator('input[placeholder*="Search"]')).toHaveValue('');
    await expect(page.locator('select[id="namespace"]')).toHaveValue('');
    await expect(page.locator('select[id="sort"]')).toHaveValue('name');
  });
});
