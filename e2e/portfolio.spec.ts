import { expect, test } from '@playwright/test';

import { mockApi } from './fixtures/api';
import { PortfolioPageObject } from './pages/portfolio-page';

test.describe('portfolio', () => {
  test.beforeEach(async ({ page }) => {
    await mockApi(page);
  });

  test('shows six ranges, all at a 44px touch target', async ({ page }) => {
    const portfolio = new PortfolioPageObject(page);
    await portfolio.goto();

    await expect(portfolio.ranges).toHaveCount(6);

    const box = await portfolio.ranges.first().boundingBox();
    expect(box?.height).toBeGreaterThanOrEqual(44);
  });

  test('keeps the skip link reachable as the first tab stop', async ({ page }) => {
    await page.goto('/');

    // Tabbing before the shell has rendered lands on whatever an empty document offers, which is
    // why this raced: goto only waits for load, and Angular bootstraps after it.
    const skipLink = page.getByRole('link', { name: /skip|contenu/i });
    await expect(skipLink).toBeAttached();

    // A fresh page is not OS-focused yet: pressing on a locator focuses it first.
    await page.locator('body').press('Tab');

    await expect(skipLink).toBeFocused();
  });
});
