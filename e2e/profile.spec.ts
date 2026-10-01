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

  test('leaves no signed-in screen behind the sign-in page once signed out', async ({ page }) => {
    const portfolio = new PortfolioPageObject(page);
    const profile = new ProfilePageObject(page);
    let signedOut = false;
    await page.route('**/api/**', (route) =>
      signedOut ? route.fulfill({ status: 401, json: { message: 'unauthenticated' } }) : route.fallback(),
    );
    await page.route('**/logout', (route) => {
      signedOut = true;

      return route.fulfill({ status: 200 });
    });
    await portfolio.goto();
    await page.locator('a[href="/profile"]').first().click();
    await expect(profile.signOut).toBeVisible();

    await profile.signOut.click();
    await expect(page).toHaveURL('/login');
    const previousEntry = await page.goBack();

    expect(previousEntry?.url()).not.toContain('/profile');
    await expect(page).toHaveURL('/login');
    await expect(portfolio.totalValue).toHaveCount(0);
  });

  test('asks before deleting a key, hands focus back on cancel and deletes on confirm', async ({ page }) => {
    const profile = new ProfilePageObject(page);
    const passkeys = [
      {
        credentialId: 'aXBob25l',
        label: 'iPhone de Joan',
        createdAt: '2025-03-12T10:00:00Z',
        lastUsedAt: null,
        current: true,
      },
      {
        credentialId: 'bWFj',
        label: 'MacBook Air',
        createdAt: '2025-03-12T10:05:00Z',
        lastUsedAt: null,
        current: false,
      },
    ];
    await page.route('**/api/session', (route) =>
      route.fulfill({
        json: { displayName: 'Joan', initials: 'JO', username: 'joan', signInMethod: 'PASSKEY', passkeys },
      }),
    );
    let deleted = false;
    await page.route('**/api/session/passkeys/bWFj', (route) => {
      deleted = true;

      return route.fulfill({ status: 204 });
    });
    await profile.goto();
    const trash = profile.revokeButtons.nth(1);

    await trash.click();
    await expect(profile.deleteDialog.getByRole('heading')).toContainText('MacBook Air');
    await profile.deleteCancel.click();

    await expect(profile.deleteDialog).toHaveCount(0);
    await expect(trash).toBeFocused();
    expect(deleted).toBe(false);

    await trash.click();
    await profile.deleteConfirm.click();

    await expect(profile.deleteDialog).toHaveCount(0);
    expect(deleted).toBe(true);
  });
});
