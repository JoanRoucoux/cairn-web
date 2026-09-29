import { expect, test } from '@playwright/test';

import { mockApi } from './fixtures/api';
import { LoginPageObject } from './pages/login-page';

test.describe('login', () => {
  let signedIn: boolean;

  test.beforeEach(async ({ page }) => {
    signedIn = false;
    await mockApi(page);
    await page.route('**/api/session', (route) =>
      signedIn ? route.fallback() : route.fulfill({ status: 401, json: { message: 'unauthenticated' } }),
    );
  });

  test('folds the password form by default and unfolds it on demand', async ({ page }) => {
    const login = new LoginPageObject(page);
    await login.goto();

    await expect(login.username).not.toBeVisible();

    await login.passwordToggle.click();

    await expect(login.username).toBeVisible();
    await expect(login.username).toBeFocused();
  });

  test('shows the refused message under the password field and keeps the username', async ({ page }) => {
    await page.route('**/api/authenticate', (route) =>
      route.fulfill({ status: 401, json: { message: 'unauthenticated' } }),
    );
    const login = new LoginPageObject(page);
    await login.goto();

    await login.signInWithPassword('joan', 'wrong-password');

    await expect(login.refused).toBeVisible();
    await expect(login.username).toHaveValue('joan');
    await expect(login.password).toBeFocused();
  });

  test('signs in with a password and reaches the portfolio', async ({ page }) => {
    await page.route('**/api/authenticate', (route) => {
      signedIn = true;

      return route.fulfill({ status: 204 });
    });
    const login = new LoginPageObject(page);
    await login.goto();

    await login.signInWithPassword('joan', 'a-real-password');

    await expect(page).toHaveURL('/');
  });
});
