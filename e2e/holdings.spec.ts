import { expect, test } from '@playwright/test';

import { mockApi } from './fixtures/api';

test.describe('holdings', () => {
  test.beforeEach(async ({ page }) => {
    await mockApi(page);
    await page.goto('/holdings');
  });

  test('opens the add dialog and focuses the safe action first', async ({ page }) => {
    await page.getByTestId('add-holding').click();

    // The native <dialog> renders in the top layer once open, so its wrapping
    // <ui-dialog> host has an empty box: assert on the <dialog> itself.
    await expect(page.getByTestId('holding-form-dialog').locator('dialog')).toBeVisible();
    await expect(page.getByTestId('holding-form-cancel')).toBeFocused();

    const dialogBox = await page.getByTestId('holding-form-dialog').locator('dialog').boundingBox();
    const viewport = page.viewportSize();
    expect(dialogBox).not.toBeNull();
    expect(viewport).not.toBeNull();
    const leftGap = dialogBox!.x;
    const rightGap = viewport!.width - (dialogBox!.x + dialogBox!.width);
    const topGap = dialogBox!.y;
    const bottomGap = viewport!.height - (dialogBox!.y + dialogBox!.height);
    expect(Math.abs(leftGap - rightGap)).toBeLessThanOrEqual(2);
    expect(Math.abs(topGap - bottomGap)).toBeLessThanOrEqual(2);
  });

  test('closes the dialog on Escape and hands focus back to the trigger', async ({ page }) => {
    await page.getByTestId('add-holding').click();

    // The native <dialog> renders in the top layer once open, so its wrapping
    // <ui-dialog> host has an empty box: assert on the <dialog> itself.
    await expect(page.getByTestId('holding-form-dialog').locator('dialog')).toBeVisible();
    await page.keyboard.press('Escape');

    await expect(page.getByTestId('holding-form-dialog').locator('dialog')).toBeHidden();
    await expect(page.getByTestId('add-holding')).toBeFocused();
  });

  test('keeps every touch target at 44px', async ({ page }) => {
    const box = await page.getByTestId('add-holding').boundingBox();

    expect(box?.height).toBeGreaterThanOrEqual(44);
  });

  test('shows a holding detail page at its route', async ({ page }) => {
    await page.goto('/holdings/11111111-1111-1111-1111-111111111111');

    await expect(page.getByRole('heading', { name: 'Amundi MSCI World' })).toBeVisible();
    await expect(page.getByRole('alert')).toHaveCount(0);
  });
});
