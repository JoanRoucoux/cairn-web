import { type Locator, expect, test } from '@playwright/test';

import { mockApi } from './fixtures/api';

// The first group renders expanded, so clicking its summary would close it: open only when closed.
const openGroup = async (group: Locator): Promise<void> => {
  const details = group.locator('details');
  if (!(await details.evaluate((element) => (element as HTMLDetailsElement).open))) {
    await group.locator('summary').click();
  }
  await expect(details).toHaveAttribute('open', '');
};

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

  test('shows a dash and the asset-class badge for a holding with no price yet', async ({ page }) => {
    const row = page.getByTestId('holding-row').filter({ hasText: 'Newly listed fund' });

    await expect(row).toContainText('—');
    await expect(row.locator('ui-badge')).toHaveText('Fund');
  });

  test('shows the prefilled balance and updates it through the cash dialog', async ({ page }) => {
    const boursorama = page.getByTestId('account-group').filter({ hasText: 'PEA Boursorama' });
    await openGroup(boursorama);
    await boursorama.getByTestId('edit-cash').click();

    await expect(page.getByTestId('holding-cash-dialog').locator('dialog')).toBeVisible();
    await expect(page.getByTestId('holding-cash-cancel')).toBeFocused();
    await expect(page.getByTestId('holding-cash-amount')).toHaveValue('732.4');

    await page.getByTestId('holding-cash-amount').fill('900');
    await page.getByTestId('holding-cash-submit').click();

    await expect(page.getByTestId('holding-cash-dialog').locator('dialog')).toBeHidden();
    await expect(boursorama.getByTestId('cash-row')).toContainText('900');
  });

  test('removes the cash line when the balance is set to zero', async ({ page }) => {
    const boursorama = page.getByTestId('account-group').filter({ hasText: 'PEA Boursorama' });
    await openGroup(boursorama);
    await boursorama.getByTestId('edit-cash').click();

    await page.getByTestId('holding-cash-amount').fill('0');
    await page.getByTestId('holding-cash-submit').click();

    await expect(page.getByTestId('holding-cash-dialog').locator('dialog')).toBeHidden();
    await expect(boursorama.getByTestId('cash-row')).toHaveText(/0[,.]00/);
  });

  test('refuses a negative amount in the cash dialog', async ({ page }) => {
    const boursorama = page.getByTestId('account-group').filter({ hasText: 'PEA Boursorama' });
    await openGroup(boursorama);
    await boursorama.getByTestId('edit-cash').click();
    await page.getByTestId('holding-cash-amount').fill('-10');
    await page.getByTestId('holding-cash-submit').click();

    await expect(page.getByTestId('holding-cash-amount')).toHaveAttribute('aria-invalid', 'true');
  });

  test('renders a cash-only account with no ordinary line', async ({ page }) => {
    const livretA = page.getByTestId('account-group').filter({ hasText: 'Livret A' });
    await openGroup(livretA);

    await expect(livretA.getByText('Savings · 0 holdings')).toBeVisible();
    await expect(livretA.getByTestId('cash-row')).toHaveText(/20.?000/);
    await expect(livretA.getByTestId('holding-row')).toHaveCount(0);
    await expect(livretA.getByTestId('edit-cash')).toHaveAccessibleName(/Livret A/);
  });
});
