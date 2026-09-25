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

  test('shows the hero, the envelope tiles and the curve', async ({ page }) => {
    const portfolio = new PortfolioPageObject(page);
    await portfolio.goto();

    await expect(portfolio.heroValue).toBeVisible();
    await expect(portfolio.tiles.first()).toBeVisible();
    await expect(portfolio.chart).toBeVisible();
  });

  test('reloads the performance and the history when the range changes', async ({ page }) => {
    const portfolio = new PortfolioPageObject(page);
    await portfolio.goto();
    await expect(portfolio.heroValue).toBeVisible();

    const performanceRequest = page.waitForRequest((request) => request.url().includes('/api/portfolio/performance'));
    const historyRequest = page.waitForRequest((request) => request.url().includes('/api/history'));

    await portfolio.pickRange('Max');

    const [performance, history] = await Promise.all([performanceRequest, historyRequest]);

    expect(performance.url()).toContain('range=max');
    expect(history.url()).toContain('/api/history?');
  });

  test('shows a tooltip on the curve when hovering it', async ({ page }) => {
    const portfolio = new PortfolioPageObject(page);
    await portfolio.goto();
    await expect(portfolio.chart).toBeVisible();

    const box = await portfolio.chart.boundingBox();
    if (!box) {
      throw new Error('the chart has no bounding box');
    }

    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);

    await expect(portfolio.tooltip).toBeVisible();
  });

  test('shows a tooltip on the curve when it has keyboard focus', async ({ page }) => {
    const portfolio = new PortfolioPageObject(page);
    await portfolio.goto();
    await expect(portfolio.chart).toBeVisible();

    await portfolio.chart.focus();
    await page.keyboard.press('ArrowRight');

    await expect(portfolio.tooltip).toBeVisible();

    await page.keyboard.press('Escape');

    await expect(portfolio.tooltip).not.toBeVisible();
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
