import { expect, test } from '@playwright/test';

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

    const inputBox = await input.boundingBox();
    const buttonBox = await button.boundingBox();
    const centreOf = (box: { y: number; height: number }): number => box.y + box.height / 2;

    expect(centreOf(buttonBox!)).toBeCloseTo(centreOf(inputBox!), 0);
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
    await expect(page.getByText('Bitcoin')).toBeVisible();
  });

  test('edits an instrument and sees the change in the list', async ({ page }) => {
    await page.goto('/instruments');
    await page.getByRole('link', { name: 'Amundi MSCI World' }).click();

    await page.getByTestId('instrument-name').fill('Amundi MSCI World (renamed)');
    await page.getByTestId('instrument-save').click();

    await page.waitForURL('**/instruments');
    await expect(page.getByText('Amundi MSCI World (renamed)')).toBeVisible();
  });

  test('deletes an instrument and sees it gone from the list', async ({ page }) => {
    await page.goto('/instruments');
    await page.getByRole('link', { name: 'Amundi MSCI World' }).click();

    await page.getByTestId('instrument-delete').click();
    await page.getByTestId('instrument-delete-confirm').click();

    await page.waitForURL('**/instruments');
    await expect(page.getByTestId('instrument-row')).toHaveCount(0);
  });
});
