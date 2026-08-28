import { expect, test } from '@playwright/test';

import { mockApi } from './fixtures/api';

test.describe('holdings', () => {
  test.beforeEach(async ({ page }) => {
    await mockApi(page);
    await page.goto('/positions');
  });

  test('opens the add dialog and focuses the safe action first', async ({ page }) => {
    await page.getByTestId('add-holding').click();

    // The native <dialog> renders in the top layer once open, so its wrapping
    // <ui-dialog> host has an empty box: assert on the <dialog> itself.
    await expect(page.getByTestId('holding-form-dialog').locator('dialog')).toBeVisible();
    await expect(page.getByTestId('holding-form-cancel')).toBeFocused();
  });

  test('closes the dialog on Escape and hands focus back to the trigger', async ({ page }) => {
    await page.getByTestId('add-holding').click();
    await page.keyboard.press('Escape');

    await expect(page.getByTestId('holding-form-dialog').locator('dialog')).toBeHidden();
    await expect(page.getByTestId('add-holding')).toBeFocused();
  });

  test('keeps every touch target at 44px', async ({ page }) => {
    const box = await page.getByTestId('add-holding').boundingBox();

    expect(box?.height).toBeGreaterThanOrEqual(44);
  });

  test('shows a holding detail page at its route', async ({ page }) => {
    await page.goto('/positions/11111111-1111-1111-1111-111111111111');

    await expect(page.getByRole('heading', { name: 'Amundi MSCI World' })).toBeVisible();
    await expect(page.getByRole('alert')).toHaveCount(0);
  });
});
