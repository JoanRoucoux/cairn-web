import { expect, test } from '@playwright/test';

import { mockApi } from './fixtures/api';
import { AllocationPageObject } from './pages/allocation-page';

const PEA_BOURSORAMA_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

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

  test('says under the total how many lines it leaves out', async ({ page }) => {
    const allocation = new AllocationPageObject(page);
    await allocation.goto();

    await expect(page.getByTestId('allocation-excluded')).toHaveText('Excluding 2 lines');
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

    await page.getByRole('link', { name: /ETF/ }).click();
    await page.waitForURL('**/holdings?**');

    const url = new URL(page.url());
    expect(url.pathname).toBe('/holdings');
    expect(url.searchParams.get('classe')).toBe('etf');
    await expect(
      page.getByRole('group', { name: /classe|class/i }).getByRole('button', { pressed: true }),
    ).toContainText(/^ETF/);
  });

  test('navigates to the account in the holdings when an account row is activated', async ({ page }) => {
    const allocation = new AllocationPageObject(page);
    await allocation.goto();

    await page.getByRole('link', { name: /PEA Boursorama/ }).click();
    await page.waitForURL('**/holdings?**');

    const url = new URL(page.url());
    expect(url.pathname).toBe('/holdings');
    expect(url.searchParams.get('compte')).toBe(PEA_BOURSORAMA_ID);
  });

  test('shows an error on the failing ring only and retries just that call', async ({ page }) => {
    let failed = true;
    await page.route('**/api/portfolio/allocation/classes', async (route) => {
      if (failed) {
        failed = false;
        return route.fulfill({ status: 500, json: { message: 'boom' } });
      }
      return route.fallback();
    });

    const allocation = new AllocationPageObject(page);
    await allocation.goto(1);

    await expect(page.getByRole('alert')).toHaveCount(1);
    await expect(allocation.donuts).toHaveCount(1);

    await page.getByRole('button', { name: 'Retry' }).click();

    await expect(page.getByRole('alert')).toHaveCount(0);
    await expect(allocation.donuts).toHaveCount(2);
  });
});
