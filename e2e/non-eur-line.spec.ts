import { expect, test } from '@playwright/test';

import { mockApi } from './fixtures/api';
import { USD_HOLDING_ISIN } from './fixtures/trading';

test.describe('lines quoted in another currency', () => {
  test.beforeEach(async ({ page }) => {
    await mockApi(page);
  });

  test('captions a USD line and switches it to its EUR listing', async ({ page }) => {
    await page.goto('/holdings');

    const row = page.getByTestId('holding-row').filter({ hasText: 'Nasdaq 100 ETF' });
    await expect(row).toContainText('Quoted in USD, not counted');
    await expect(row.getByTestId('change-listing')).toBeVisible();

    await row.getByTestId('change-listing').click();

    const dialog = page.getByTestId('holding-add-dialog');
    await expect(dialog.locator('dialog')).toBeVisible();
    await expect(page.getByTestId('holding-add-query')).toHaveValue(USD_HOLDING_ISIN);

    const candidates = page.getByTestId('holding-add-online-candidate');
    await expect(candidates).toHaveCount(2);
    await expect(candidates.nth(1)).toHaveAttribute('aria-disabled', 'true');

    await candidates.nth(0).click();

    await expect(dialog).toHaveCount(0);
    await expect(page.locator('ui-toaster > div')).toHaveText('Listing changed');
    await expect(row).toHaveCount(0);
    const moved = page.getByTestId('holding-row').filter({ hasText: 'Nasdaq 100 UCITS ETF' });
    await expect(moved).not.toContainText('not counted');
    await expect(moved.getByTestId('change-listing')).toHaveCount(0);
  });

  test('does not list the line itself in the catalogue of its change-of-listing dialog', async ({ page }) => {
    await page.route('**/api/instruments', async (route) => {
      if (route.request().method() !== 'GET') {
        return route.fallback();
      }

      return route.fulfill({
        json: [
          {
            id: 'ffffffff-ffff-ffff-ffff-ffffffffffff',
            name: 'Nasdaq 100 ETF',
            isin: USD_HOLDING_ISIN,
            currency: 'EUR',
            assetClass: 'ETF',
            priceSource: 'YAHOO',
          },
        ],
      });
    });
    await page.goto('/holdings');

    await page.getByTestId('holding-row').filter({ hasText: 'Nasdaq 100 ETF' }).getByTestId('change-listing').click();
    await expect(page.getByTestId('holding-add-online-candidate')).toHaveCount(2);

    await expect(page.getByTestId('holding-add-catalog-candidate')).toHaveCount(0);
  });

  test('cannot pick a candidate quoted in another currency when adding a line', async ({ page }) => {
    await page.goto('/holdings');
    await page.getByTestId('add-holding-desktop').click();
    await page.getByTestId('holding-add-query').fill(USD_HOLDING_ISIN);

    const candidates = page.getByTestId('holding-add-online-candidate');
    await expect(candidates).toHaveCount(2);
    await expect(candidates.nth(1)).toHaveAttribute('aria-disabled', 'true');
    await expect(candidates.nth(1)).toContainText('Quoted in USD');

    await candidates.nth(1).click({ force: true });

    await expect(page.getByTestId('holding-add-quantity')).toHaveCount(0);
    await expect(page.getByTestId('holding-add-query')).toBeVisible();
  });

  test('offers the change of listing instead of Buy and Sell on the detail', async ({ page }) => {
    await page.goto('/holdings/99999999-9999-9999-9999-999999999999');

    await expect(page.getByTestId('holding-change-listing')).toBeVisible();
    await expect(page.getByTestId('holding-buy')).toHaveCount(0);
    await expect(page.getByTestId('holding-sell')).toHaveCount(0);
    await expect(page.getByTestId('no-quote-yet')).toContainText('Quoted in USD, not counted');
  });
});
