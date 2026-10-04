import { type Locator, type Page, expect, test } from '@playwright/test';

import { mockApi } from './fixtures/api';

const AMUNDI_ID = '11111111-1111-1111-1111-111111111111';

const rowLink = (page: Page): Locator => page.locator(`table [data-holding-id="${AMUNDI_ID}"]`);
const drawer = (page: Page): Locator => page.getByTestId('holding-drawer').locator('dialog');
const backdropOf = (locator: Locator): Promise<string> =>
  locator.evaluate((element) => getComputedStyle(element, '::backdrop').backgroundColor);

const openDrawer = async (page: Page): Promise<void> => {
  await rowLink(page).click();
  await expect(drawer(page)).toBeVisible();
  await expect(page.getByRole('dialog', { name: 'Amundi MSCI World' })).toBeVisible();
};

const expectClosedOnTheRow = async (page: Page): Promise<void> => {
  await expect(drawer(page)).toHaveCount(0);
  await expect(page).toHaveURL(/\/holdings$/);
  await expect(rowLink(page)).toBeFocused();
};

test.describe('the detail drawer', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test.beforeEach(async ({ page }) => {
    await mockApi(page);
    await page.goto('/holdings');
    await expect(rowLink(page)).toBeVisible();
  });

  test('opens over the list on the 0.36 veil, 440 wide, the table kept at seven columns', async ({ page }) => {
    await page.evaluate(() => window.scrollTo(0, 120));
    const scrolled = await page.evaluate(() => window.scrollY);

    await openDrawer(page);

    expect((await drawer(page).boundingBox())!.width).toBeCloseTo(440, 0);
    expect(await backdropOf(drawer(page))).toMatch(/0\.36\)$/);
    await expect(page.getByTestId('holdings-list').locator('th')).toHaveCount(7);
    expect(await page.evaluate(() => window.scrollY)).toBe(scrolled);
  });

  test('closes on the veil and gives the focus back to the row', async ({ page }) => {
    await openDrawer(page);

    await page.mouse.click(200, 450);

    await expectClosedOnTheRow(page);
  });

  test('closes on its cross and gives the focus back to the row', async ({ page }) => {
    await openDrawer(page);

    await page.getByRole('button', { name: 'Close the detail' }).click();

    await expectClosedOnTheRow(page);
  });

  test('closes on Escape and gives the focus back to the row', async ({ page }) => {
    await openDrawer(page);

    await page.keyboard.press('Escape');

    await expectClosedOnTheRow(page);
  });

  test('opens a dialog over itself: Escape closes the dialog, then the drawer', async ({ page }) => {
    await openDrawer(page);
    const buy = page.getByTestId('holding-buy');

    await buy.click();
    const dialog = page.getByTestId('holding-buy-dialog').locator('dialog');
    await expect(dialog).toBeVisible();

    await expect(drawer(page)).toBeVisible();
    expect(await backdropOf(dialog)).toMatch(/0\.24\)$/);

    await page.keyboard.press('Escape');

    await expect(page.getByTestId('holding-buy-dialog')).toHaveCount(0);
    await expect(drawer(page)).toBeVisible();
    await expect(buy).toBeFocused();

    await page.keyboard.press('Escape');

    await expectClosedOnTheRow(page);
  });

  const animated = (locator: Locator): Promise<number> =>
    locator.evaluate((element) => element.getAnimations({ subtree: true }).length);

  test('stays open after Modifier, its amounts and the row updated and highlighted', async ({ page }) => {
    await openDrawer(page);
    const figures = page.getByTestId('holding-drawer').locator('app-holding-detail-figures');
    const row = page.locator('tr').filter({ has: page.locator(`[data-holding-id="${AMUNDI_ID}"]`) });

    await page.getByTestId('holding-menu-trigger-desktop').click();
    await page.getByTestId('holding-edit').click();
    await page.getByTestId('holding-edit-quantity').fill('300');
    await page.getByTestId('holding-edit-submit').click();

    await expect(page.getByTestId('holding-edit-dialog')).toHaveCount(0);
    await expect(drawer(page)).toBeVisible();
    await expect(figures).toContainText('123,060.00');
    await expect.poll(() => animated(figures), { intervals: [10] }).toBeGreaterThan(0);
    await expect(row).toContainText('123,060.00');
    await expect.poll(() => animated(row), { intervals: [10] }).toBeGreaterThan(0);
  });

  test('stays open after Saisir un cours, its amounts and the row updated and highlighted', async ({ page }) => {
    const unpriced = '33333333-3333-3333-3333-333333333333';
    await page.locator(`table [data-holding-id="${unpriced}"]`).click();
    await expect(drawer(page)).toBeVisible();
    const figures = page.getByTestId('holding-drawer').locator('app-holding-detail-figures');
    const row = page.locator('tr').filter({ has: page.locator(`[data-holding-id="${unpriced}"]`) });

    await page.getByTestId('holding-drawer').getByTestId('enter-quote').click();
    await page.getByTestId('manual-quote-price').fill('12.5');
    await page.getByTestId('manual-quote-submit').click();

    await expect(page.getByTestId('manual-quote-dialog')).toHaveCount(0);
    await expect(drawer(page)).toBeVisible();
    await expect(figures).toContainText('2,537.50');
    await expect.poll(() => animated(figures), { intervals: [10] }).toBeGreaterThan(0);
    await expect(row).toContainText('2,537.50');
    await expect.poll(() => animated(row), { intervals: [10] }).toBeGreaterThan(0);
  });

  test('stays open after a purchase, its amounts updated and highlighted', async ({ page }) => {
    await openDrawer(page);
    const figures = page.getByTestId('holding-drawer').locator('app-holding-detail-figures');
    await expect(figures).toContainText('83,277.60');

    await page.getByTestId('holding-buy').click();
    await page.getByTestId('holding-buy-quantity').fill('10');
    await page.getByTestId('holding-buy-price').fill('400');
    await page.getByTestId('holding-buy-submit').click();

    await expect(page.getByTestId('holding-buy-dialog')).toHaveCount(0);
    await expect(drawer(page)).toBeVisible();
    await expect(figures).toContainText('87,372.60');
    await expect
      .poll(() => figures.evaluate((element) => element.getAnimations().length), { intervals: [10] })
      .toBeGreaterThan(0);
    await expect(page.locator('ui-toaster > div')).toHaveText('Purchase saved');
    await expect(page).toHaveURL(new RegExp(`/holdings/${AMUNDI_ID}$`));
  });

  test('closes with the dialog once the whole line is sold, the focus on its account', async ({ page }) => {
    await openDrawer(page);

    await page.getByTestId('holding-sell').click();
    await page.getByTestId('holding-sell-all').click();
    await page.getByTestId('holding-sell-submit').click();

    await expect(page.getByTestId('holding-sell-dialog')).toHaveCount(0);
    await expect(drawer(page)).toHaveCount(0);
    await expect(page).toHaveURL(/\/holdings$/);
    await expect(rowLink(page)).toHaveCount(0);
    await expect(
      page
        .getByTestId('account-group')
        .filter({ hasText: 'Northwind PEA' })
        .getByRole('button', { name: /^Northwind PEA/ }),
    ).toBeFocused();
  });

  test('only fades under reduced motion, where it slides in otherwise', async ({ page }) => {
    const transforms = async (): Promise<string[]> => {
      const sampled = page.evaluate(
        () =>
          new Promise<string[]>((resolve) => {
            const seen = new Set<string>();
            const start = performance.now();
            const sample = (): void => {
              const dialog = document.querySelector('ui-drawer dialog');

              if (dialog) {
                seen.add(getComputedStyle(dialog).transform);
              }
              if (performance.now() - start < 400) {
                requestAnimationFrame(sample);
              } else {
                resolve([...seen]);
              }
            };

            requestAnimationFrame(sample);
          }),
      );
      await rowLink(page).click();

      return sampled;
    };

    expect((await transforms()).some((transform) => transform.startsWith('matrix'))).toBe(true);
    await page.keyboard.press('Escape');
    await expect(drawer(page)).toHaveCount(0);

    await page.emulateMedia({ reducedMotion: 'reduce' });

    expect(await transforms()).toEqual(['none']);
  });
});
