import { expect, test } from '@playwright/test';

import { mockApi } from './fixtures/api';

for (const viewport of [
  { name: 'phone', width: 390, height: 844 },
  { name: 'desktop', width: 1440, height: 900 },
]) {
  test.describe(`404 on ${viewport.name}`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } });

    test('renders outside the shell and sends the button back to the portfolio', async ({ page }) => {
      await mockApi(page);
      await page.goto('/nowhere/at-all');

      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      await expect(page.locator('nav')).toHaveCount(0);
      await expect(page.locator('aside')).toHaveCount(0);
      await expect(page.getByTestId('account-link')).toHaveCount(0);

      const home = page.locator('main a[href="/"]');
      await expect(home).toBeVisible();
      if (viewport.name === 'phone') {
        const box = await home.boundingBox();
        expect(box?.width).toBeGreaterThan(viewport.width - 60);
      }

      await home.click();

      await expect(page).toHaveURL('/');
      await expect(page.locator('nav').first()).toBeAttached();
    });
  });
}

test('renders for a signed-out visitor without bouncing through sign-in', async ({ page }) => {
  await mockApi(page);
  await page.route('**/api/session', (route) => route.fulfill({ status: 401, json: { message: 'unauthenticated' } }));
  await page.goto('/nowhere');
  await page.waitForLoadState('networkidle');

  await expect(page).toHaveURL('/nowhere');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
});
