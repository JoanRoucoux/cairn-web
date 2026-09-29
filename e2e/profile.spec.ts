import { expect, test } from '@playwright/test';

import { mockApi } from './fixtures/api';
import { PortfolioPageObject } from './pages/portfolio-page';
import { ProfilePageObject } from './pages/profile-page';

test.describe('profile', () => {
  test.beforeEach(async ({ page }) => {
    await mockApi(page);
  });

  test('masks every amount on screen at once, and the setting survives a reload', async ({ page }) => {
    const profile = new ProfilePageObject(page);
    const portfolio = new PortfolioPageObject(page);
    await portfolio.goto();
    await expect(portfolio.totalValue).not.toHaveText(/••••/);

    await profile.goto();
    await expect(profile.hideAmounts).not.toBeChecked();
    await profile.hideAmounts.click();
    await expect(profile.hideAmounts).toBeChecked();

    await page.locator('a[href="/"]').first().click();
    await expect(portfolio.totalValue).toHaveText(/••••/);

    await page.reload();
    await expect(portfolio.totalValue).toHaveText(/••••/);
  });

  test('signs the user out from the profile screen', async ({ page }) => {
    const profile = new ProfilePageObject(page);
    let signedOut = false;
    await page.route('**/api/session', (route) =>
      signedOut ? route.fulfill({ status: 401, json: { message: 'unauthenticated' } }) : route.fallback(),
    );
    await page.route('**/logout', (route) => {
      signedOut = true;

      return route.fulfill({ status: 200 });
    });
    await profile.goto();

    await profile.signOut.click();

    await expect(page).toHaveURL('/login');
  });
});
