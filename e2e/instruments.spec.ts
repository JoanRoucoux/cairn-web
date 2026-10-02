import { type Locator, expect, test } from '@playwright/test';

import { mockApi } from './fixtures/api';

test.describe('instruments', () => {
  test.beforeEach(async ({ page }) => {
    await mockApi(page);
    await page.goto('/instruments/new');
  });

  test('keeps the look up button on the input line once the field is refused', async ({ page }) => {
    const input = page.getByTestId('isin-input');
    const button = page.getByTestId('isin-search');

    await button.click();

    await expect(page.getByRole('alert')).toHaveCount(1);

    const centreOf = async (locator: typeof input): Promise<number> => {
      const box = await locator.boundingBox();

      return (box?.y ?? 0) + (box?.height ?? 0) / 2;
    };

    await expect(async () => {
      expect(await centreOf(button)).toBeCloseTo(await centreOf(input), 0);
    }).toPass();
  });

  test('lists a new instrument as soon as it is created', async ({ page }) => {
    await page.goto('/instruments');
    await expect(page.getByTestId('instrument-row')).toHaveCount(1);

    await page.getByTestId('add-instrument').click();
    await page.waitForLoadState('networkidle');
    await page.getByTestId('instrument-name').fill('Bitcoin');
    await expect(page.getByTestId('instrument-name')).toHaveValue('Bitcoin');
    await page.getByTestId('instrument-asset-class').selectOption('CRYPTO');
    await page.getByTestId('instrument-price-source').selectOption('COINGECKO');
    await page.getByTestId('instrument-source-ref').fill('bitcoin');
    await page.getByTestId('instrument-save').click();

    await page.waitForURL('**/instruments');
    await expect(page.getByTestId('instrument-row')).toHaveCount(2);
    const row = page.getByTestId('instrument-row').filter({ hasText: 'Bitcoin' });
    await expect(row.getByText('Bitcoin').first()).toBeVisible();
    await expect(row).toContainText('None');
  });

  test('edits an instrument and sees the change in the list', async ({ page }) => {
    await page.goto('/instruments');
    await page.getByTestId('instrument-menu-trigger').click();
    await page.getByTestId('instrument-menu-edit').click();
    // Typing before the draft is seeded loses the keystrokes to the prefill that follows.
    await expect(page.getByTestId('instrument-name')).toHaveValue('Amundi MSCI World');

    await page.getByTestId('instrument-name').fill('Amundi MSCI World (renamed)');
    await page.getByTestId('instrument-save').click();

    await page.waitForURL('**/instruments');
    await expect(page.getByText('Amundi MSCI World (renamed)').first()).toBeVisible();
  });

  test('deletes an instrument and sees it gone from the list', async ({ page }) => {
    await page.goto('/instruments');
    await expect(page.getByTestId('instrument-row')).toHaveCount(1);
    await page.getByTestId('instrument-menu-trigger').click();
    await page.getByTestId('instrument-menu-edit').click();

    await page.getByTestId('instrument-delete').click();
    await page.getByTestId('instrument-delete-confirm').click();

    await page.waitForURL('**/instruments');
    await expect(page.getByTestId('instrument-row')).toHaveCount(0);
  });

  test('counts the shown instruments against the catalogue, and offers to add a line when nothing matches', async ({
    page,
  }) => {
    await page.route(
      (url) => url.pathname === '/api/instruments',
      (route) =>
        route.fulfill({
          json: [
            {
              id: 'i-btc',
              name: 'Bitcoin',
              isin: null,
              currency: 'EUR',
              assetClass: 'CRYPTO',
              priceSource: 'COINGECKO',
              sourceRef: 'bitcoin',
              description: '',
              externalUrl: null,
              holdingCount: 0,
            },
            {
              id: 'i-eth',
              name: 'Ether',
              isin: null,
              currency: 'EUR',
              assetClass: 'CRYPTO',
              priceSource: 'COINGECKO',
              sourceRef: 'ethereum',
              description: '',
              externalUrl: null,
              holdingCount: 0,
            },
          ],
        }),
    );
    await page.goto('/instruments');
    const count = (text: string): Locator => page.getByText(text, { exact: true }).locator('visible=true');

    await expect(count('2 instruments')).toBeVisible();

    await page.getByTestId('instruments-search').fill('bitcoin');
    await expect(count('1 of 2 instruments')).toBeVisible();

    await page.getByTestId('instruments-search').fill('zzz');
    await expect(count('0 of 2 instruments')).toBeVisible();
    await expect(page.getByText('No instrument matches "zzz"')).toBeVisible();
    await expect(page.getByText('The search looks at the name and the ISIN.')).toBeVisible();

    await page.getByTestId('instruments-add-line').click();

    await expect(page.getByTestId('holding-add-dialog').locator('dialog')).toBeVisible();
    await expect(page.getByTestId('holding-add-query')).toHaveValue('zzz');
    await expect(page).toHaveURL(/\/holdings$/);
  });

  test('shows one column per field', async ({ page }) => {
    await page.goto('/instruments');
    await expect(page.getByTestId('instrument-row')).toHaveCount(1);

    const row = page.getByTestId('instrument-row').first();
    await expect(row).toContainText('Amundi MSCI World');
    await expect(row).toContainText('FR0010756098');
    await expect(row).toContainText('ETF');
    await expect(row).toContainText('Yahoo Finance');
  });

  test('edits and deletes an instrument from the catalogue row menu', async ({ page }) => {
    await page.goto('/instruments');
    await expect(page.getByTestId('instrument-row')).toHaveCount(1);

    await page.getByTestId('instrument-menu-trigger').click();
    await page.getByTestId('instrument-menu-edit').click();

    await expect(page.getByTestId('instrument-name')).toHaveValue('Amundi MSCI World');
  });
});
