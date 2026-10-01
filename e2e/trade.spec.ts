import { expect, test } from '@playwright/test';

import { mockApi } from './fixtures/api';

const AMUNDI_ID = '11111111-1111-1111-1111-111111111111';

test.describe('buy and sell', () => {
  test.beforeEach(async ({ page }) => {
    await mockApi(page);
    await page.goto(`/holdings/${AMUNDI_ID}`);
    await expect(page.getByRole('heading', { name: 'Amundi MSCI World' })).toBeVisible();
  });

  test('buys more units and reloads the detail', async ({ page }) => {
    await page.getByTestId('holding-buy').click();

    await expect(page.getByTestId('holding-buy-dialog').locator('dialog')).toBeVisible();
    await page.getByTestId('holding-buy-quantity').fill('40');
    await page.getByTestId('holding-buy-price').fill('29,10');
    await expect(page.getByTestId('holding-buy-submit')).toBeEnabled();
    await page.getByTestId('holding-buy-submit').click();

    await expect(page.getByTestId('holding-buy-dialog')).toHaveCount(0);
  });

  test('reads a quantity typed with a comma and spaces', async ({ page }) => {
    await page.getByTestId('holding-buy').click();

    await page.getByTestId('holding-buy-quantity').fill('1 200,5');
    await page.getByTestId('holding-buy-price').fill('10');

    await expect(page.getByTestId('holding-buy-submit')).toBeEnabled();
  });

  test('submits a buy with Enter from the price field', async ({ page }) => {
    await page.getByTestId('holding-buy').click();
    await expect(page.getByTestId('holding-buy-dialog').locator('dialog')).toBeVisible();
    await page.getByTestId('holding-buy-quantity').fill('40');
    await page.getByTestId('holding-buy-price').fill('29.1');
    await expect(page.getByTestId('holding-buy-submit')).toBeEnabled();
    await page.getByTestId('holding-buy-price').press('Enter');

    await expect(page.getByTestId('holding-buy-dialog')).toHaveCount(0);
  });

  test('submits a sell with Enter from the quantity field', async ({ page }) => {
    await page.getByTestId('holding-sell').click();
    await expect(page.getByTestId('holding-sell-dialog').locator('dialog')).toBeVisible();
    await page.getByTestId('holding-sell-quantity').fill('100');
    await expect(page.getByTestId('holding-sell-submit')).toBeEnabled();
    await page.getByTestId('holding-sell-quantity').press('Enter');

    await expect(page.getByTestId('holding-sell-dialog')).toHaveCount(0);
  });

  test('keeps the button disabled for an empty or zero quantity', async ({ page }) => {
    await page.getByTestId('holding-buy').click();

    await expect(page.getByTestId('holding-buy-submit')).toBeDisabled();

    await page.getByTestId('holding-buy-quantity').fill('0');
    await page.getByTestId('holding-buy-price').fill('10');

    await expect(page.getByTestId('holding-buy-submit')).toBeDisabled();
  });

  test('shows the server refusal in place on a 422', async ({ page }) => {
    await page.route('**/api/holdings/*/buy', (route) => route.fulfill({ status: 422, json: { message: 'refused' } }));

    await page.getByTestId('holding-buy').click();
    await page.getByTestId('holding-buy-quantity').fill('40');
    await page.getByTestId('holding-buy-price').fill('29.1');
    await page.getByTestId('holding-buy-submit').click();

    await expect(page.getByTestId('holding-buy-error')).toBeVisible();
    await expect(page.getByTestId('holding-buy-dialog').locator('dialog')).toBeVisible();
  });

  test('sells part of the line and reloads the detail', async ({ page }) => {
    await page.getByTestId('holding-sell').click();

    await expect(page.getByTestId('holding-sell-dialog').locator('dialog')).toBeVisible();
    await page.getByTestId('holding-sell-quantity').fill('100');
    await page.getByTestId('holding-sell-submit').click();

    await expect(page.getByTestId('holding-sell-dialog')).toHaveCount(0);
  });

  test('shows a refusal instead of reaching the server when selling more than held', async ({ page }) => {
    await page.getByTestId('holding-sell').click();

    await expect(page.getByTestId('holding-sell-dialog').locator('dialog')).toBeVisible();
    await page.getByTestId('holding-sell-quantity').fill('99999');

    await expect(page.getByText('You hold 203 units.')).toBeVisible();
    await expect(page.getByTestId('holding-sell-submit')).toBeDisabled();
  });

  test('fills the exact held quantity with Sell all and closes the line, going back to the list', async ({ page }) => {
    await page.getByTestId('holding-sell').click();

    await page.getByTestId('holding-sell-all').click();
    await expect(page.getByTestId('holding-sell-quantity')).toHaveValue('203');
    await expect(page.getByTestId('holding-sell-submit')).toHaveText('Sell all and remove the holding');

    await page.getByTestId('holding-sell-submit').click();

    await expect(page).toHaveURL(/\/holdings$/);
  });

  test('shows the server refusal on a 422 for a sell', async ({ page }) => {
    await page.route('**/api/holdings/*/sell', (route) => route.fulfill({ status: 422, json: { message: 'refused' } }));

    await page.getByTestId('holding-sell').click();
    await page.getByTestId('holding-sell-quantity').fill('10');
    await page.getByTestId('holding-sell-submit').click();

    await expect(page.getByTestId('holding-sell-error')).toBeVisible();
  });
});
