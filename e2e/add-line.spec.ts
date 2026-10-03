import { expect, test } from '@playwright/test';

import { mockApi } from './fixtures/api';

test.describe('add a line', () => {
  test.beforeEach(async ({ page }) => {
    await mockApi(page);
    await page.goto('/holdings');
    await page.getByTestId('add-holding-desktop').click();
    await expect(page.getByTestId('holding-add-dialog').locator('dialog')).toBeVisible();
  });

  test('adds a catalogue hit to an account', async ({ page }) => {
    await page.getByTestId('holding-add-account').selectOption({ label: 'Contoso Trading · CTO' });
    await page.getByTestId('holding-add-query').fill('Amundi MSCI World');

    await expect(page.getByTestId('holding-add-catalog-candidate')).toBeVisible();
    await page.getByTestId('holding-add-catalog-candidate').click();

    await expect(page.getByText('New', { exact: true })).toHaveCount(0);

    await page.getByTestId('holding-add-quantity').fill('10');
    await expect(page.getByTestId('holding-add-submit')).toBeEnabled();
    await page.getByTestId('holding-add-submit').click();

    await expect(page.getByTestId('holding-add-dialog')).toHaveCount(0);
  });

  test('creates the instrument then the line for an online hit', async ({ page }) => {
    await page.getByTestId('holding-add-account').selectOption({ label: 'Northwind PEA · PEA' });
    await page.getByTestId('holding-add-query').fill('IE00B4L5Y983');

    await expect(page.getByTestId('holding-add-online-candidate')).toBeVisible();
    await page.getByTestId('holding-add-online-candidate').click();

    await expect(page.getByText('New', { exact: true })).toBeVisible();
    await expect(page.getByTestId('holding-add-submit')).toHaveText('Create the instrument and add the holding');

    await page.getByTestId('holding-add-quantity').fill('5');
    await page.getByTestId('holding-add-submit').click();

    await expect(page.getByTestId('holding-add-dialog')).toHaveCount(0);
  });

  test('offers a manual price when nothing is found, with a required asset class', async ({ page }) => {
    await page.getByTestId('holding-add-account').selectOption({ label: 'Northwind PEA · PEA' });
    await page.getByTestId('holding-add-query').fill('nonexistent');

    await expect(page.getByTestId('holding-add-create-manual')).toBeVisible();
    await page.getByTestId('holding-add-create-manual').click();
    await page.getByTestId('holding-add-quantity').fill('1');

    await expect(page.getByTestId('holding-add-asset-class')).toHaveValue('');
    await expect(page.getByTestId('holding-add-submit')).toBeDisabled();

    await page.getByTestId('holding-add-asset-class').selectOption('CRYPTO');
    await expect(page.getByTestId('holding-add-submit')).toBeEnabled();
    await page.getByTestId('holding-add-submit').click();

    await expect(page.getByTestId('holding-add-dialog')).toHaveCount(0);
  });

  test('submits with Enter from the quantity field', async ({ page }) => {
    await page.getByTestId('holding-add-account').selectOption({ label: 'Contoso Trading · CTO' });
    await page.getByTestId('holding-add-query').fill('Amundi MSCI World');
    await page.getByTestId('holding-add-catalog-candidate').click();
    await page.getByTestId('holding-add-quantity').fill('3');
    await page.getByTestId('holding-add-quantity').press('Enter');

    await expect(page.getByTestId('holding-add-dialog')).toHaveCount(0);
  });

  test('shows the online search error with its own retry, keeping the catalogue results', async ({ page }) => {
    await page.route('**/api/instruments/resolve', (route) =>
      route.fulfill({ status: 500, json: { message: 'boom' } }),
    );

    await page.getByTestId('holding-add-query').fill('Amundi MSCI World');

    await expect(page.getByText('The online search did not answer.')).toBeVisible();
    await expect(page.getByTestId('holding-add-catalog-candidate')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Retry' })).toBeVisible();
  });
});
