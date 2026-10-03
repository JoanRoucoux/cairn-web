import { expect, test } from '@playwright/test';

import { mockApi } from './fixtures/api';

test.describe('holdings list', () => {
  test.beforeEach(async ({ page }) => {
    await mockApi(page);
    await page.goto('/holdings');
  });

  test('opens the add dialog and focuses the safe action first', async ({ page }) => {
    await page.getByTestId('add-holding-desktop').click();

    // The native <dialog> renders in the top layer once open, so its wrapping
    // <ui-dialog> host has an empty box: assert on the <dialog> itself.
    await expect(page.getByTestId('holding-add-dialog').locator('dialog')).toBeVisible();
    await expect(page.getByTestId('holding-add-account')).toBeFocused();
  });

  test('closes the dialog on Escape and hands focus back to the trigger', async ({ page }) => {
    await page.getByTestId('add-holding-desktop').click();

    await expect(page.getByTestId('holding-add-dialog').locator('dialog')).toBeVisible();
    await page.keyboard.press('Escape');

    await expect(page.getByTestId('holding-add-dialog').locator('dialog')).toBeHidden();
    await expect(page.getByTestId('add-holding-desktop')).toBeFocused();
  });

  test('filters by class from a chip and from ?classe=', async ({ page }) => {
    const chips = page.getByRole('group', { name: /classe|class/i });
    await expect(chips.getByRole('button', { pressed: true })).toContainText(/Toutes|All/);

    await chips.getByRole('button', { name: /^ETF/ }).click();

    await expect(chips.getByRole('button', { name: /^ETF/ })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByTestId('class-summary')).toBeVisible();

    await page.goto('/holdings?classe=crypto');

    await expect(
      page.getByRole('group', { name: /classe|class/i }).getByRole('button', { pressed: true }),
    ).toContainText(/Crypto/);
  });

  test('keeps the mobile add button at 44px', async ({ browser }) => {
    const context = await browser.newContext({ hasTouch: true, viewport: { width: 390, height: 844 } });
    const page = await context.newPage();
    await mockApi(page);
    await page.goto('/holdings');

    const box = await page.getByTestId('add-holding').boundingBox();

    expect(box?.height).toBeGreaterThanOrEqual(44);

    await context.close();
  });

  test('shows a holding detail page at its route', async ({ page }) => {
    await page.goto('/holdings/11111111-1111-1111-1111-111111111111');

    await expect(page.getByRole('heading', { name: 'Amundi MSCI World' })).toBeVisible();
    await expect(page.getByRole('alert')).toHaveCount(0);
  });

  test('shows a dash and the asset class in the subtitle for a holding with no price yet', async ({ page }) => {
    const row = page.getByTestId('holding-row').filter({ hasText: 'Newly listed fund' });

    await expect(row).toContainText('—');
    await expect(row).toContainText('Fund');
  });

  test('opens the manual quote dialog from the Cours column of an unvalued line', async ({ page }) => {
    const row = page.getByTestId('holding-row').filter({ hasText: 'Newly listed fund' });

    await row.getByTestId('enter-quote').click();

    await expect(page.getByTestId('manual-quote-dialog').locator('dialog')).toBeVisible();
  });

  test('finds an instrument by name ignoring accents and case', async ({ page }) => {
    await page.getByTestId('holdings-search').fill('amundi');

    const northwind = page.getByTestId('account-group').filter({ hasText: 'Northwind PEA' });
    await expect(northwind.getByRole('link', { name: 'Amundi MSCI World' })).toBeVisible();
  });

  test('finds an instrument by ISIN typed in lowercase', async ({ page }) => {
    await page.getByTestId('holdings-search').fill('fr0010756098');

    const northwind = page.getByTestId('account-group').filter({ hasText: 'Northwind PEA' });
    await expect(northwind.getByRole('link', { name: 'Amundi MSCI World' })).toBeVisible();
  });

  test('tells the reader what was searched when nothing matches', async ({ page }) => {
    await page.getByTestId('holdings-search').fill('zzz-nope');

    await expect(page.getByText('No holding matches "zzz-nope"')).toBeVisible();
  });

  test('shows the prefilled balance and updates it through the cash dialog', async ({ page }) => {
    const northwind = page.getByTestId('account-group').filter({ hasText: 'Northwind PEA' });
    await northwind.getByTestId('edit-cash').click();

    await expect(page.getByTestId('holding-cash-dialog').locator('dialog')).toBeVisible();
    await expect(page.getByTestId('holding-cash-cancel')).toBeFocused();
    await expect(page.getByTestId('holding-cash-amount')).toHaveValue('732.4');

    await page.getByTestId('holding-cash-amount').fill('900');
    await page.getByTestId('holding-cash-submit').click();

    await expect(page.getByTestId('holding-cash-dialog').locator('dialog')).toBeHidden();
    await expect(northwind.getByTestId('cash-row')).toContainText('900');
  });

  test('removes the cash line when the balance is set to zero', async ({ page }) => {
    const northwind = page.getByTestId('account-group').filter({ hasText: 'Northwind PEA' });
    await northwind.getByTestId('edit-cash').click();

    await expect(page.getByTestId('holding-cash-amount')).toHaveValue('732.4');
    await page.getByTestId('holding-cash-amount').fill('0');
    await page.getByTestId('holding-cash-submit').click();

    await expect(page.getByTestId('holding-cash-dialog').locator('dialog')).toBeHidden();
    await expect(northwind.getByTestId('cash-row')).toHaveText(/0[,.]00/);
  });

  test('refuses a negative amount in the cash dialog', async ({ page }) => {
    const northwind = page.getByTestId('account-group').filter({ hasText: 'Northwind PEA' });
    await northwind.getByTestId('edit-cash').click();
    await page.getByTestId('holding-cash-amount').fill('-10');
    await page.getByTestId('holding-cash-submit').click();

    await expect(page.getByTestId('holding-cash-amount')).toHaveAttribute('aria-invalid', 'true');
  });

  test('pluralizes a one-line account in the singular', async ({ page }) => {
    const cto = page.getByTestId('account-group').filter({ hasText: 'Contoso Trading' });

    await expect(cto).toContainText(/1 holding(?!s)/);
  });

  test('renders a savings account as one dated balance row, with no line count', async ({ page }) => {
    const livretA = page.getByTestId('account-group').filter({ hasText: 'Livret A' });

    await expect(livretA.getByText(/^Savings · Woodgrove Bank · balance as of \d\d\/\d\d$/)).toBeVisible();
    await expect(livretA.getByTestId('cash-row')).toHaveText(/Balance.*Entered on \d\d\/\d\d.*20.?000/);
    await expect(livretA.getByTestId('holding-row')).toHaveCount(0);
    await expect(livretA.getByTestId('edit-cash')).toHaveAccessibleName(/Livret A/);
  });
});

test.describe('holding detail', () => {
  test.beforeEach(async ({ page }) => {
    await mockApi(page);
    await page.goto('/holdings');
  });

  test('opens next to the list on desktop and reduces the table to three columns', async ({ page }) => {
    const northwind = page.getByTestId('account-group').filter({ hasText: 'Northwind PEA' });
    await northwind.getByRole('link', { name: 'Amundi MSCI World' }).click();

    await expect(page).toHaveURL(/\/holdings\/11111111-1111-1111-1111-111111111111$/);
    await expect(page.getByTestId('holdings-list').getByRole('columnheader')).toHaveCount(3);
  });

  test('keeps the search text when closing the detail', async ({ page }) => {
    await page.getByTestId('holdings-search').fill('amundi');
    const northwind = page.getByTestId('account-group').filter({ hasText: 'Northwind PEA' });
    await northwind.getByRole('link', { name: 'Amundi MSCI World' }).click();
    await expect(page.getByRole('heading', { name: 'Amundi MSCI World' })).toBeVisible();

    await page.getByRole('link', { name: 'Close the detail' }).click();

    await expect(page.getByTestId('holdings-search')).toHaveValue('amundi');
  });

  test('shows the stale price instead of a day change', async ({ page }) => {
    await page.goto('/holdings/22222222-2222-2222-2222-222222222222');

    await expect(page.locator('aside').getByText(/price as of .*, late|cours du .*, en retard/i)).toBeVisible();
  });

  test('shows Saisir un cours for a line with no quote yet', async ({ page }) => {
    await page.goto('/holdings/33333333-3333-3333-3333-333333333333');

    await expect(page.getByTestId('no-quote-yet')).toBeVisible();
  });

  test('opens the manual quote dialog and reloads once saved', async ({ page }) => {
    await page.goto('/holdings/33333333-3333-3333-3333-333333333333');

    await page.getByTestId('enter-quote').click();
    await page.getByTestId('manual-quote-price').fill('12.5');
    await page.getByTestId('manual-quote-submit').click();

    await expect(page.getByTestId('manual-quote-dialog')).toHaveCount(0);
  });

  test('renders the price chart with its start label', async ({ page }) => {
    await page.goto('/holdings/11111111-1111-1111-1111-111111111111');

    await expect(page.locator('ui-line-chart')).toBeVisible();
    await expect(page.getByText('Start')).toBeVisible();
    await expect(page.locator('ui-line-chart path').first()).toHaveAttribute('d', /.+/);
  });

  test('hides Enter a price for a holding with an automatic quote', async ({ page }) => {
    await page.goto('/holdings/11111111-1111-1111-1111-111111111111');

    await expect(page.getByRole('heading', { name: 'Amundi MSCI World' })).toBeVisible();
    await expect(page.getByTestId('enter-quote')).toHaveCount(0);
  });

  test('keeps the shell header on Holdings, not Holding detail, once a line is open on desktop', async ({ page }) => {
    await page.goto('/holdings/11111111-1111-1111-1111-111111111111');

    await expect(page.getByRole('heading', { level: 1, name: 'Holdings' })).toBeVisible();
  });

  test('shows only the back link, not the shell header, on the iPhone', async ({ browser }) => {
    const context = await browser.newContext({ hasTouch: true, viewport: { width: 390, height: 844 } });
    const page = await context.newPage();
    await mockApi(page);
    await page.goto('/holdings/11111111-1111-1111-1111-111111111111');

    await expect(page.getByTestId('holding-detail-back')).toBeVisible();
    await expect(page.getByRole('heading', { level: 1, name: 'Holdings' })).toBeHidden();
    await expect(page.getByTestId('account-group').first()).toBeHidden();

    await context.close();
  });
});
