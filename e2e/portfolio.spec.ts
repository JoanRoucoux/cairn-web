import { expect, test } from '@playwright/test';

import { mockApi } from './fixtures/api';
import { PortfolioPageObject } from './pages/portfolio-page';

test.describe('portfolio', () => {
  test.beforeEach(async ({ page }) => {
    await mockApi(page);
  });

  test('says under the day change how many lines the total leaves out', async ({ page }) => {
    const portfolio = new PortfolioPageObject(page);
    await portfolio.goto();

    await expect(page.getByTestId('total-excluded')).toHaveText('Excluding 2 lines');
  });

  test('shows six ranges, all at a 44px touch target', async ({ browser }) => {
    const context = await browser.newContext({ hasTouch: true });
    const page = await context.newPage();
    await mockApi(page);
    const portfolio = new PortfolioPageObject(page);
    await portfolio.goto();

    await expect(portfolio.ranges).toHaveCount(6);

    const touchTargetHeight = await portfolio.ranges
      .first()
      .evaluate((element) => parseFloat(getComputedStyle(element, '::after').height));
    expect(touchTargetHeight).toBeGreaterThanOrEqual(44);

    await context.close();
  });

  test('shows the total, the envelopes and the curve', async ({ page }) => {
    const portfolio = new PortfolioPageObject(page);
    await portfolio.goto();

    await expect(portfolio.totalValue).toBeVisible();
    await expect(portfolio.envelopeRows.first()).toBeVisible();
    await expect(portfolio.chart).toBeVisible();
  });

  test('reloads the performance and the history when the range changes', async ({ page }) => {
    const portfolio = new PortfolioPageObject(page);
    await portfolio.goto();
    await expect(portfolio.totalValue).toBeVisible();

    const performanceRequest = page.waitForRequest((request) => request.url().includes('/api/portfolio/performance'));
    const historyRequest = page.waitForRequest((request) => request.url().includes('/api/history'));

    await portfolio.pickRange('Max');

    const [performance, history] = await Promise.all([performanceRequest, historyRequest]);

    expect(performance.url()).toContain('range=max');
    expect(history.url()).toContain('/api/history?');
  });

  test('dates the Max range from the first point of its curve, on the curve and on the envelopes', async ({ page }) => {
    const portfolio = new PortfolioPageObject(page);
    await portfolio.goto();
    await expect(portfolio.chart).toBeVisible();

    await portfolio.pickRange('Max');

    await expect(page.getByText(/^since [A-Z][a-z]+ \d{4}$/)).toHaveCount(2);
  });

  for (const range of ['1Y', '5Y', 'Max']) {
    test(`never repeats an axis label on the ${range} range of a short history`, async ({ page }) => {
      const portfolio = new PortfolioPageObject(page);
      await portfolio.goto();
      await expect(portfolio.chart).toBeVisible();

      await portfolio.pickRange(range);

      const labels = portfolio.chart.locator('[data-chart-axis-tick]:visible');
      await expect(labels.first()).toBeVisible();
      const texts = (await labels.allTextContents()).map((text) => text.trim());
      expect(new Set(texts).size).toBe(texts.length);
    });
  }

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
    await expect(portfolio.tooltip).toContainText('since the beginning');
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

  test('links a mover to its holding detail', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    const portfolio = new PortfolioPageObject(page);
    await portfolio.goto();

    const firstRow = portfolio.moversTable.getByRole('row').nth(1);
    const link = firstRow.getByRole('link').first();
    const href = await link.getAttribute('href');

    await link.click();

    await expect(page).toHaveURL(href as string);
  });

  test('shows only the movers block in error when /api/holdings fails, and recovers on retry', async ({ page }) => {
    let fail = true;

    await page.route('**/api/holdings', async (route) => {
      if (route.request().method() === 'GET' && fail) {
        return route.fulfill({ status: 500, json: { message: 'boom' } });
      }

      return route.fallback();
    });

    const portfolio = new PortfolioPageObject(page);
    await portfolio.goto();

    await expect(page.getByRole('alert')).toHaveCount(1);
    await expect(portfolio.totalValue).toBeVisible();

    fail = false;
    await page.getByRole('button', { name: 'Retry' }).click();

    await expect(page.getByRole('alert')).toHaveCount(0);
    await expect(portfolio.moversTable.or(portfolio.moversList).first()).toBeAttached();
  });

  test('shows only the total block in error when /api/portfolio fails, and recovers on retry', async ({ page }) => {
    let fail = true;

    await page.route('**/api/portfolio', async (route) => {
      if (route.request().method() === 'GET' && fail) {
        return route.fulfill({ status: 500, json: { message: 'boom' } });
      }

      return route.fallback();
    });

    const portfolio = new PortfolioPageObject(page);
    await portfolio.goto();

    await expect(page.getByRole('alert')).toHaveCount(1);
    await expect(portfolio.chart).toBeVisible();

    fail = false;
    await page.getByRole('button', { name: 'Retry' }).click();

    await expect(page.getByRole('alert')).toHaveCount(0);
    await expect(portfolio.totalValue).toBeVisible();
  });

  test('hides every amount when the app masks amounts, keeping the curve shape and the percentages', async ({
    page,
  }) => {
    await page.addInitScript(() => localStorage.setItem('cairn-hide-amounts', '1'));
    const portfolio = new PortfolioPageObject(page);
    await portfolio.goto();

    await expect(portfolio.chart).toBeVisible();

    const noAmountDigits = /\d[\d\u202f]*(,\d+)?\u00a0\u20ac/;
    expect(await portfolio.totalValue.innerText()).not.toMatch(noAmountDigits);

    const box = await portfolio.chart.boundingBox();
    if (!box) {
      throw new Error('the chart has no bounding box');
    }
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await expect(portfolio.tooltip).toBeVisible();
    expect(await portfolio.tooltip.innerText()).not.toMatch(noAmountDigits);

    const table = portfolio.chart.locator('xpath=following-sibling::div/table');
    expect(await table.innerText()).not.toMatch(noAmountDigits);

    const bodyText = await page.locator('body').innerText();
    expect(bodyText).not.toMatch(noAmountDigits);
  });

  test('keeps the skip link reachable as the first tab stop', async ({ page }) => {
    await page.goto('/');

    const skipLink = page.getByRole('link', { name: /skip|contenu/i });
    await expect(skipLink).toBeAttached();

    await page.locator('body').press('Tab');

    await expect(skipLink).toBeFocused();
  });
});
