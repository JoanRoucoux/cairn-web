import { expect, test } from '@playwright/test';

import { mockApi } from './fixtures/api';
import { USD_HOLDING_ISIN } from './fixtures/search';

test.describe('lines quoted in another currency', () => {
  test.beforeEach(async ({ page }) => {
    await mockApi(page);
  });

  test('captions a USD line with a dash for its value and no action on it', async ({ page }) => {
    await page.goto('/holdings');

    const row = page.getByTestId('holding-row').filter({ hasText: 'Nasdaq 100 ETF' });
    await expect(row).toContainText('Quoted in USD, not counted');
    await expect(row).toContainText('—');
    await expect(row.getByRole('button')).toHaveCount(0);
  });

  test('cannot pick a candidate quoted in another currency when adding a line', async ({ page }) => {
    await page.goto('/holdings');
    await page.getByTestId('add-holding-desktop').click();
    await page.getByTestId('holding-add-query').fill(USD_HOLDING_ISIN);

    const candidates = page.getByTestId('holding-add-online-candidate');
    await expect(candidates).toHaveCount(2);
    await expect(candidates.nth(1)).toHaveAttribute('aria-disabled', 'true');
    await expect(candidates.nth(1)).toContainText('quoted in USD');

    await candidates.nth(1).click({ force: true });

    await expect(page.getByTestId('holding-add-quantity')).toHaveCount(0);
    await expect(page.getByTestId('holding-add-query')).toBeVisible();
  });

  test('keeps only the menu on the detail of a USD line', async ({ page }) => {
    await page.goto('/holdings/99999999-9999-9999-9999-999999999999');

    await expect(page.getByTestId('holding-menu-trigger-desktop')).toBeVisible();
    await expect(page.getByTestId('holding-buy')).toHaveCount(0);
    await expect(page.getByTestId('holding-sell')).toHaveCount(0);
    await expect(page.getByTestId('no-quote-yet')).toContainText('Quoted in USD, not counted');
  });
});
