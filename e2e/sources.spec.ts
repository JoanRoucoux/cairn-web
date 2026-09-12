import { expect, test } from '@playwright/test';

import { mockApi } from './fixtures/api';

test.describe('sources', () => {
  test.beforeEach(async ({ page }) => {
    await mockApi(page);
    await page.goto('/sources');
  });

  test('names a failing instrument and its reason after a refresh', async ({ page }) => {
    await page.getByTestId('refresh-quotes').click();

    const failures = page.getByTestId('refresh-failures');
    await expect(failures).toContainText('Amundi MSCI World');
    await expect(failures).toContainText('timeout');
  });
});
