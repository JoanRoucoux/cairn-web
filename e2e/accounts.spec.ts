import { expect, test } from '@playwright/test';

import { mockApi } from './fixtures/api';

const FIELDS = ['account-name', 'account-type', 'account-institution'];

test.describe('accounts', () => {
  test.beforeEach(async ({ page }) => {
    await mockApi(page);
    await page.goto('/accounts');
    await expect(page.getByRole('heading', { name: 'Accounts' })).toBeVisible();
  });

  test('names the envelopes instead of showing their contract codes', async ({ page }) => {
    await expect(page.getByTestId('account-type').getByRole('option', { name: 'Securities account' })).toBeAttached();
  });

  test('says why an empty submit was refused, without breaking the row', async ({ page }) => {
    const tops = async (): Promise<number[]> =>
      Promise.all(FIELDS.map(async (id) => Math.round((await page.getByTestId(id).boundingBox())!.y)));
    const before = await tops();
    expect(new Set(before).size).toBe(1);

    await page.getByTestId('account-create').click();

    await expect(page.getByRole('alert')).toHaveCount(3);
    expect(await tops()).toEqual(before);
  });
});
