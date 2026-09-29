import { expect, test } from '@playwright/test';

import { mockApi } from './fixtures/api';
import { AllocationPageObject } from './pages/allocation-page';

test.describe('allocation', () => {
  test.beforeEach(async ({ page }) => {
    await mockApi(page);
  });

  test('shows both donuts with their legend', async ({ page }) => {
    const allocation = new AllocationPageObject(page);
    await allocation.goto();

    await expect(page.getByRole('heading', { name: 'By asset class' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'By account' })).toBeVisible();
    await expect(allocation.donuts).toHaveCount(2);
  });

  test('shows exactly six account rows with no Others slice', async ({ page }) => {
    const allocation = new AllocationPageObject(page);
    await allocation.goto();

    await expect(page.getByText('PEA Boursorama')).toBeVisible();
    await expect(page.getByText('Others')).toHaveCount(0);
  });

  test('navigates to the filtered holdings when an asset-class row is activated', async ({ page }) => {
    const allocation = new AllocationPageObject(page);
    await allocation.goto();

    await page.getByRole('button', { name: /Tracker/ }).click();
    await page.waitForURL('**/holdings?**');

    const url = new URL(page.url());
    expect(url.pathname).toBe('/holdings');
    expect(url.searchParams.get('assetClass')).toBe('ETF');
  });

  test('navigates to the filtered holdings when an account row is activated', async ({ page }) => {
    const allocation = new AllocationPageObject(page);
    await allocation.goto();

    await page.getByRole('button', { name: /PEA Boursorama/ }).click();
    await page.waitForURL('**/holdings?**');

    const url = new URL(page.url());
    expect(url.pathname).toBe('/holdings');
    expect(url.searchParams.get('account')).toBe('PEA Boursorama');
  });

  test('shows an error with a retry when the portfolio fails to load, without hiding the other donut', async ({
    page,
  }) => {
    let failed = true;
    await page.route('**/api/portfolio', async (route) => {
      if (failed) {
        failed = false;
        return route.fulfill({ status: 500, json: { message: 'boom' } });
      }
      return route.fallback();
    });

    const allocation = new AllocationPageObject(page);
    await allocation.goto();

    await expect(page.getByRole('alert')).toHaveCount(2);

    await page.getByRole('button', { name: 'Retry' }).first().click();

    await expect(page.getByRole('alert')).toHaveCount(0);
    await expect(allocation.donuts).toHaveCount(2);
  });
});
