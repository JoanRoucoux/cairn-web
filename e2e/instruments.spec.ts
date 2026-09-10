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
});
