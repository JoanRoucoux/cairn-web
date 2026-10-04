import { type Locator, type Page } from '@playwright/test';

import { expect, test } from './fixtures/accessibility';
import { mockApi } from './fixtures/api';

const WOODGROVE_PEE = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaab';

const viewports = [
  { name: 'iPhone', width: 390, height: 844, hasTouch: true, group: 'account-card' },
  { name: 'desktop', width: 1440, height: 900, hasTouch: false, group: 'account-group' },
] as const;

const pill = (page: Page): Locator => page.getByTestId('account-filter');
const allChip = (page: Page): Locator =>
  page.getByRole('group', { name: /class/i }).getByRole('button', { name: /^All/ });

for (const viewport of viewports) {
  test.describe(`the Lignes filters on ${viewport.name}`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height }, hasTouch: viewport.hasTouch });

    const groups = (page: Page): Locator => page.getByTestId(viewport.group);
    const header = (page: Page, name: string): Locator =>
      groups(page)
        .filter({ hasText: name })
        .getByRole('button', { name: new RegExp(`^${name}`) });

    test.beforeEach(async ({ page }) => {
      await mockApi(page);
    });

    test('chooses an account in the selector, then clears it with the cross', async ({ page }) => {
      await page.goto('/holdings');
      await expect(groups(page)).toHaveCount(6);
      const countBefore = (await allChip(page).textContent())!.trim();

      await pill(page).getByRole('button', { name: 'All accounts' }).click();
      const menu = page.getByRole('menu', { name: 'Account' });
      await expect(menu).toBeVisible();
      await expect(menu.getByRole('menuitemradio', { name: 'All accounts' })).toHaveAttribute('aria-checked', 'true');
      await menu.getByRole('menuitemradio', { name: 'Woodgrove Savings Plan' }).click();

      await expect(page).toHaveURL(new RegExp(`compte=${WOODGROVE_PEE}`));
      await expect(groups(page)).toHaveCount(1);
      await expect(groups(page)).toContainText('Woodgrove Savings Plan');
      await expect(pill(page).getByRole('button', { name: 'Account Woodgrove Savings Plan' })).toBeVisible();
      await expect(allChip(page)).toHaveText(countBefore);

      await pill(page).getByRole('button', { name: 'Remove the account filter' }).click();

      await expect(page).toHaveURL(/\/holdings$/);
      await expect(groups(page)).toHaveCount(6);
      await expect(pill(page).getByRole('button', { name: 'All accounts' })).toBeFocused();
    });

    test('opens on the account of ?compte=, with nothing scrolled, highlighted or focused', async ({ page }) => {
      await page.goto(`/holdings?compte=${WOODGROVE_PEE}`);

      await expect(groups(page)).toHaveCount(1);
      await expect(pill(page)).toContainText('Woodgrove Savings Plan');
      const highlighted = await page.evaluate(
        () =>
          document
            .getAnimations()
            .filter((animation) => (animation.effect as KeyframeEffect | null)?.target?.closest('[data-account-id]'))
            .length,
      );

      expect(highlighted).toBe(0);
      expect(await page.evaluate(() => window.scrollY)).toBe(0);
      expect(await page.evaluate(() => document.activeElement === document.body)).toBe(true);
    });

    test('remembers a folded account across a reload, with the rows hidden but kept', async ({ page }) => {
      await page.goto('/holdings');
      const northwind = groups(page).filter({ hasText: 'Northwind PEA' });

      await header(page, 'Northwind PEA').click();
      await expect(header(page, 'Northwind PEA')).toHaveAttribute('aria-expanded', 'false');

      await page.reload();

      await expect(header(page, 'Northwind PEA')).toHaveAttribute('aria-expanded', 'false');
      await expect(northwind.locator('[data-holding-id]').first()).toBeHidden();
      expect(await northwind.locator('[data-holding-id]').count()).toBeGreaterThan(0);
      expect(await page.evaluate(() => localStorage.getItem('cairn-folded-accounts'))).toContain(
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      );
    });

    test('folds at once, the groups below sliding nothing', async ({ page }) => {
      await page.goto('/holdings');
      await expect(groups(page)).toHaveCount(6);

      await header(page, 'Northwind PEA').click();
      const slides = await page.evaluate(
        () =>
          document.getAnimations().filter((animation) => {
            const target = (animation.effect as KeyframeEffect | null)?.target;

            return target instanceof Element && !target.closest('h2');
          }).length,
      );

      expect(slides).toBe(0);
    });

    test('reopens every account under a search, a class or the chosen account, memory kept', async ({ page }) => {
      await page.goto('/holdings');
      await header(page, 'Northwind PEA').click();

      await page.getByTestId('holdings-search').fill('amundi');
      await expect(header(page, 'Northwind PEA')).toHaveAttribute('aria-expanded', 'true');
      await expect(header(page, 'Northwind PEA')).toHaveAttribute('aria-disabled', 'true');
      await header(page, 'Northwind PEA').dispatchEvent('click');
      await page.getByTestId('holdings-search').fill('');
      await expect(header(page, 'Northwind PEA')).toHaveAttribute('aria-expanded', 'false');

      await page.goto('/holdings?classe=etf');
      await expect(header(page, 'Northwind PEA')).toHaveAttribute('aria-expanded', 'true');

      await page.goto('/holdings?compte=aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
      await expect(header(page, 'Northwind PEA')).toHaveAttribute('aria-expanded', 'true');

      await page.goto('/holdings');
      await expect(header(page, 'Northwind PEA')).toHaveAttribute('aria-expanded', 'false');
    });

    test('has no accessibility violation in the chips row, at rest and with an account chosen', async ({
      page,
      makeAxeBuilder,
    }) => {
      await page.goto('/holdings');
      await page.waitForLoadState('networkidle');

      expect((await makeAxeBuilder().include('ui-filter-chips').analyze()).violations).toEqual([]);

      await page.goto(`/holdings?compte=${WOODGROVE_PEE}`);
      await page.waitForLoadState('networkidle');

      expect((await makeAxeBuilder().include('ui-filter-chips').analyze()).violations).toEqual([]);
    });
  });
}

test.describe('the account pill on an iPhone', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  test('is 34 px high in a 44 px target, first in the scrolling row before a rule', async ({ page }) => {
    await mockApi(page);
    await page.goto('/holdings');

    const trigger = pill(page).getByRole('button', { name: 'All accounts' });
    await expect(trigger).toBeVisible();

    expect((await trigger.boundingBox())!.height).toBe(44);
    expect((await pill(page).locator('[data-pill]').boundingBox())!.height).toBe(34);
    const firstChild = await page
      .locator('ui-filter-chips')
      .evaluate((row) => [
        row.firstElementChild?.getAttribute('data-testid'),
        row.children[1]?.hasAttribute('data-chips-rule'),
      ]);
    expect(firstChild).toEqual(['account-filter', true]);
  });
});
